import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StoreLogo from './StoreLogo';

describe('StoreLogo', () => {
  it('resolves uploaded storage paths through the backend media base', () => {
    render(<StoreLogo src="/storage/stores/logo/shop.jpg" name="Sample Store" />);

    expect(screen.getByAltText('Sample Store logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/storage/stores/logo/shop.jpg')
    );
  });

  it('shows the store fallback when an uploaded file is missing', () => {
    render(<StoreLogo src="/storage/stores/logo/missing.jpg" name="Sample Store" />);

    fireEvent.error(screen.getByAltText('Sample Store logo'));

    expect(screen.getByLabelText('Sample Store logo unavailable')).toBeInTheDocument();
  });
});
