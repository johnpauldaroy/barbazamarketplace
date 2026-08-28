export const formatPeso = (value, options = {}) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(Number(value || 0));

export const resolveProductImage = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;

  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const backendBase = apiBase.replace(/\/api\/?$/, '');

  if (imagePath.startsWith('/storage/')) return `${backendBase}${imagePath}`;
  if (imagePath.startsWith('storage/')) return `${backendBase}/${imagePath}`;
  return `${backendBase}/storage/${imagePath}`;
};

const buildCartProduct = (product) => ({
  id: product.id,
  title: product.title || product.name,
  thumbnail_url: resolveProductImage(product.image_url || product.image),
  description: product.description,
  store_id: product.store_id || product.store?.id || null,
  store_name: product.store?.name || 'Store',
  store_slug: product.store?.slug || null,
});

/**
 * Shape a server variant for the cart.
 *
 * The cart keys every line on `variant.id`, so this id must be the real
 * product_variant id — that is what checkout sends back to the server.
 */
const buildCartVariant = (product, variant) => ({
  id: variant.id,
  product_variant_id: variant.id,
  title: variant.name,
  base_unit_quantity: Number(variant.base_unit_quantity || 1),
  price_in_cents: Math.round(Number(variant.price || 0) * 100),
  inventory_quantity: Number(variant.available_quantity || 0),
  manage_inventory: true,
  currency_info: { symbol: 'PHP ', decimal_places: 2 },
});

/**
 * Fallback for a product served without variants (an older API response, or a
 * product whose variants failed to load). Mirrors the pre-variant behaviour:
 * one implicit unit, priced from the product, keyed on the product id.
 *
 * The null product_variant_id is deliberate — checkout treats a missing id as
 * "use the default variant" rather than guessing one here.
 */
const buildFallbackVariant = (product) => ({
  id: `product-${product.id}`,
  product_variant_id: null,
  title: product.category || 'Product',
  base_unit_quantity: 1,
  price_in_cents: Math.round(Number(product.price || 0) * 100),
  inventory_quantity: Number(product.stock || 0),
  manage_inventory: true,
  currency_info: { symbol: 'PHP ', decimal_places: 2 },
});

export const getProductVariants = (product) =>
  Array.isArray(product?.variants) ? product.variants : [];

export const getDefaultVariant = (product) => {
  const variants = getProductVariants(product);
  if (variants.length === 0) return null;
  return variants.find((variant) => variant.is_default) || variants[0];
};

/**
 * Build a cart line for a product, optionally for a specific variant.
 * Falls back to the product's default variant when none is given.
 */
export const buildCartItem = (product, variant = null) => {
  const chosen = variant || getDefaultVariant(product);

  return {
    product: buildCartProduct(product),
    variant: chosen ? buildCartVariant(product, chosen) : buildFallbackVariant(product),
  };
};

/** Back-compat alias for the pre-variant call sites. */
export const buildSimpleCartItem = (product) => buildCartItem(product);

/**
 * How many units of this product can still be added, honouring the selected
 * variant's own availability rather than the raw base-unit stock.
 */
export const getAvailableQuantity = (product, variant = null) => {
  const chosen = variant || getDefaultVariant(product);
  if (chosen) return Number(chosen.available_quantity || 0);
  return Number(product?.stock || 0);
};

/** True when a product has more than one purchasable option. */
export const hasMultipleVariants = (product) =>
  getProductVariants(product).filter((variant) => variant.is_active !== false).length > 1;

/**
 * Lowest active variant price, for "from ₱…" labels on cards.
 */
export const getPriceRange = (product) => {
  const prices = getProductVariants(product)
    .filter((variant) => variant.is_active !== false)
    .map((variant) => Number(variant.price || 0));

  if (prices.length === 0) {
    const base = Number(product?.price || 0);
    return { min: base, max: base, varies: false };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, varies: max > min };
};
