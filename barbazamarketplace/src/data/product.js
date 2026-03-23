const defaultProducts = [
  {
    id: '1',
    name: 'Fresh Tomatoes',
    category: 'Vegetables',
    price: 45.00,
    stock: 50,
    unit: 'kg',
    description: 'Locally grown, fresh and ripe tomatoes perfect for salads and cooking',
    image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500'
  },
  {
    id: '2',
    name: 'Organic Rice',
    category: 'Grains',
    price: 55.00,
    stock: 100,
    unit: 'kg',
    description: 'Premium organic rice grown by local farmers, naturally cultivated',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'
  },
  {
    id: '3',
    name: 'Fresh Bananas',
    category: 'Fruits',
    price: 30.00,
    stock: 80,
    unit: 'kg',
    description: 'Sweet and fresh bananas, rich in potassium and natural energy',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500'
  },
  {
    id: '4',
    name: 'Free-Range Eggs',
    category: 'Dairy',
    price: 8.00,
    stock: 150,
    unit: 'pcs',
    description: 'Farm-fresh free-range eggs from local chickens',
    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500'
  },
  {
    id: '5',
    name: 'Fresh Mangoes',
    category: 'Fruits',
    price: 60.00,
    stock: 40,
    unit: 'kg',
    description: 'Sweet and juicy Philippine mangoes, handpicked at peak ripeness',
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500'
  },
  {
    id: '6',
    name: 'Green Lettuce',
    category: 'Vegetables',
    price: 35.00,
    stock: 30,
    unit: 'kg',
    description: 'Crisp and fresh lettuce, perfect for healthy salads',
    image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=500'
  },
  {
    id: '7',
    name: 'Fresh Milk',
    category: 'Dairy',
    price: 75.00,
    stock: 60,
    unit: 'L',
    description: 'Pure fresh milk from local dairy farms, rich in calcium',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500'
  },
  {
    id: '8',
    name: 'Cooking Oil',
    category: 'Household',
    price: 120.00,
    stock: 45,
    unit: 'L',
    description: 'High-quality cooking oil for all your kitchen needs',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'
  }
];

export const getProducts = () => {
  const stored = localStorage.getItem('barbazaMpcProducts');
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem('barbazaMpcProducts', JSON.stringify(defaultProducts));
  return defaultProducts;
};

export const saveProducts = (products) => {
  localStorage.setItem('barbazaMpcProducts', JSON.stringify(products));
};

export const getCategories = () => {
  const products = getProducts();
  return [...new Set(products.map(p => p.category))];
};

// Export products array for components that need direct access
export const products = getProducts();