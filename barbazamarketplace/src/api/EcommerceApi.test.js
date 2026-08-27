import { registerUser } from './EcommerceApi';

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
