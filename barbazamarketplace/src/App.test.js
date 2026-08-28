import { buildSimpleCartItem, formatPeso } from './lib/marketplace';

test('formats marketplace prices in pesos', () => {
  expect(formatPeso(149.5)).toContain('149.50');
});

test('builds a cart-ready product payload', () => {
  const item = buildSimpleCartItem({
    id: 42,
    title: 'Barbaza Coffee Beans',
    description: 'Freshly roasted beans',
    category: 'Beverages',
    price: 275.25,
    stock: 8,
    image: 'products/coffee.jpg',
  });

  expect(item.product.id).toBe(42);
  expect(item.product.title).toBe('Barbaza Coffee Beans');
  expect(item.variant.price_in_cents).toBe(27525);
  expect(item.variant.inventory_quantity).toBe(8);
});

test('prefers the API product image URL for cart thumbnails', () => {
  const item = buildSimpleCartItem({
    id: 43,
    title: 'Pancit Fresh',
    price: 100,
    stock: 1,
    image: 'products/legacy-path.jpg',
    image_url: '/storage/products/current-path.jpg',
  });

  expect(item.product.thumbnail_url).toContain('/storage/products/current-path.jpg');
});
