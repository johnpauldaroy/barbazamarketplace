import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductVariantsEditor from './ProductVariantsEditor';
import { createProductVariant, fetchProductVariants } from '../api/EcommerceApi';

jest.mock('../api/EcommerceApi', () => ({
  createProductVariant: jest.fn(),
  deleteProductVariant: jest.fn(),
  fetchProductVariants: jest.fn(),
  updateProductVariant: jest.fn(),
}));

const mockToast = jest.fn();

jest.mock('./ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('ProductVariantsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchProductVariants.mockResolvedValue([]);
    createProductVariant.mockResolvedValue({
      variants: [
        {
          id: 2,
          name: '25kg Sack',
          base_unit_quantity: 25,
          price: 750,
          is_default: false,
          is_active: true,
        },
      ],
    });
  });

  it('adds an option without submitting the surrounding product form', async () => {
    const handleProductSubmit = jest.fn((event) => event.preventDefault());

    render(
      <form onSubmit={handleProductSubmit}>
        <ProductVariantsEditor productId={10} stock={500} />
      </form>,
    );

    await waitFor(() => expect(fetchProductVariants).toHaveBeenCalledWith(10));

    fireEvent.change(screen.getByPlaceholderText('New option, e.g. "25kg Sack"'), {
      target: { value: '25kg Sack' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: /add option/i }));

    await waitFor(() =>
      expect(createProductVariant).toHaveBeenCalledWith(10, {
        name: '25kg Sack',
        base_unit_quantity: 1,
        price: 750,
        is_default: false,
      }),
    );
    expect(handleProductSubmit).not.toHaveBeenCalled();
  });
});
