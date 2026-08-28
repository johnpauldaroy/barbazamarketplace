import { createProduct, registerUser } from './EcommerceApi';

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('preserves response status, code, and field errors on API failures', async () => {
  global.fetch.mockResolvedValue({
    ok: false,
    status: 422,
    statusText: 'Unprocessable Content',
    text: async () => JSON.stringify({
      message: 'The given data was invalid.',
      code: 'VALIDATION_FAILED',
      errors: { email: ['An account with this email address already exists.'] },
    }),
  });

  await expect(registerUser({ email: 'member@example.com' })).rejects.toMatchObject({
    name: 'ApiError',
    status: 422,
    code: 'VALIDATION_FAILED',
    errors: { email: ['An account with this email address already exists.'] },
  });
});

test('serializes product variants into nested multipart fields', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 201, text: async () => JSON.stringify({ product: { id: 9 } }) });

  await createProduct({
    title: 'Rice', base_unit_id: 2, stock: 50,
    variants: [{ name: '25kg Sack', base_unit_quantity: 25, price: 1300, is_default: true }],
  });

  const body = global.fetch.mock.calls[0][1].body;
  const fields = Object.fromEntries(body.entries());
  expect(fields).toMatchObject({
    title: 'Rice', base_unit_id: '2', stock: '50',
    'variants[0][name]': '25kg Sack',
    'variants[0][base_unit_quantity]': '25',
    'variants[0][price]': '1300',
    'variants[0][is_default]': '1',
  });
});
