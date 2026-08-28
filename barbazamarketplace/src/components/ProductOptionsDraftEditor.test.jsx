import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ProductOptionsDraftEditor from './ProductOptionsDraftEditor';

test('uses measured-unit precision and adds another selling option', () => {
  const onChange = jest.fn();
  const options = [{ name: 'Loose 1kg', base_unit_quantity: '1', price: '60', is_default: true }];
  const { rerender } = render(<ProductOptionsDraftEditor options={options} onChange={onChange} unitCode="kg" stock="50.5" fractional />);

  expect(screen.getByLabelText(/kg consumed per sale/i)).toHaveAttribute('step', '0.001');
  expect(screen.getByText('50 currently sellable')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /add selling option/i }));
  expect(onChange).toHaveBeenCalledWith([
    options[0],
    { name: '', base_unit_quantity: '1', price: '', is_default: false },
  ]);

  rerender(<ProductOptionsDraftEditor options={options} onChange={onChange} unitCode="pc" stock="10" fractional={false} />);
  expect(screen.getByLabelText(/pc consumed per sale/i)).toHaveAttribute('step', '1');
});
