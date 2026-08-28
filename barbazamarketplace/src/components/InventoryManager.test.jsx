import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InventoryManager from './InventoryManager';
import { adjustProductInventory, convertProductUnit, previewProductUnitConversion } from '../api/EcommerceApi';

jest.mock('../api/EcommerceApi', () => ({
  adjustProductInventory: jest.fn(), convertProductUnit: jest.fn(),
  fetchInventoryMovements: jest.fn(), previewProductUnitConversion: jest.fn(),
}));
const mockToast = jest.fn();
jest.mock('./ui/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

test('records a unit-aware stock adjustment and returns the new balance', async () => {
  adjustProductInventory.mockResolvedValue({ stock: 55 });
  const onProductChange = jest.fn();
  const product = { id: 7, stock: 50, low_stock_threshold: 5, base_unit: { id: 2, code: 'kg', label: 'Kilogram', dimension: 'mass', is_fractional: true }, variants: [] };
  render(<InventoryManager product={product} units={[product.base_unit]} onProductChange={onProductChange} />);

  fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
  fireEvent.change(screen.getByLabelText(/quantity \(kg\)/i), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'New delivery' } });
  fireEvent.click(screen.getByRole('button', { name: /save adjustment/i }));

  await waitFor(() => expect(adjustProductInventory).toHaveBeenCalledWith(7, { operation: 'add', quantity: 5, reason: 'New delivery' }));
  expect(onProductChange).toHaveBeenCalledWith(expect.objectContaining({ stock: 55 }));
});

test('previews and confirms a same-dimension unit conversion', async () => {
  const kg = { id: 2, code: 'kg', label: 'Kilogram', dimension: 'mass', conversion_factor: 1000, is_fractional: true, is_active: true };
  const gram = { id: 3, code: 'g', label: 'Gram', dimension: 'mass', conversion_factor: 1, is_fractional: true, is_active: true };
  const product = { id: 7, stock: 50, low_stock_threshold: 5, base_unit: kg, variants: [{ id: 8, name: '5kg Pack', base_unit_quantity: 5, price: 280, is_default: true }] };
  const preview = { version: 'safe-version', factor: 1000, from_unit: kg, to_unit: gram, stock: { before: 50, after: 50000 }, low_stock_threshold: { before: 5, after: 5000 }, variants: [{ id: 8, name: '5kg Pack', before: 5, after: 5000 }] };
  previewProductUnitConversion.mockResolvedValue({ preview });
  convertProductUnit.mockResolvedValue({ product: { base_unit: gram } });

  render(<InventoryManager product={product} units={[kg, gram]} onProductChange={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /change unit/i }));
  fireEvent.change(screen.getByLabelText(/new inventory unit/i), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'Use grams' } });
  fireEvent.click(screen.getByRole('button', { name: /preview conversion/i }));
  await screen.findByText('Review every converted value');
  fireEvent.click(screen.getByRole('button', { name: /confirm conversion/i }));

  await waitFor(() => expect(convertProductUnit).toHaveBeenCalledWith(7, {
    base_unit_id: 3, conversion_factor: undefined, version: 'safe-version', reason: 'Use grams',
  }));
});
