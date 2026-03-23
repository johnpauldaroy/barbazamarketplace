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

export const buildSimpleCartItem = (product) => ({
  product: {
    id: product.id,
    title: product.title || product.name,
    thumbnail_url: resolveProductImage(product.image),
    description: product.description,
  },
  variant: {
    id: product.id,
    title: product.category || 'Product',
    price_in_cents: Math.round(Number(product.price || 0) * 100),
    inventory_quantity: Number(product.stock || 0),
    manage_inventory: true,
    currency_info: { symbol: 'PHP ', decimal_places: 2 },
  },
});
