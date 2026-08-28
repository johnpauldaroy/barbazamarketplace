import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ProductThumbnail from './ProductThumbnail';

test('replaces a broken product image with an accessible fallback', () => {
  render(<ProductThumbnail src="/missing-product.jpg" alt="Pancit Fresh" />);

  fireEvent.error(screen.getByAltText('Pancit Fresh'));

  expect(screen.queryByAltText('Pancit Fresh')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Pancit Fresh image unavailable')).toBeInTheDocument();
});
