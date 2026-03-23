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
