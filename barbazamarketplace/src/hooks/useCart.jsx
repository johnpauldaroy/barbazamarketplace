import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { formatCurrency } from '../api/EcommerceApi';

const CartContext = createContext();

const CART_STORAGE_KEY = 'barbaza-mpc-cart';

/**
 * Carts saved before variants shipped stored a synthesised variant whose id was
 * the product id, so those ids do not exist in product_variants. Rather than
 * letting them reach checkout and fail, mark them as having no variant: the
 * server then falls back to each product's default variant.
 *
 * A line is recognised as pre-variant when it carries no product_variant_id key
 * at all — lines written by the current code always set it, even to null.
 */
const migrateStoredCart = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && item.product && item.variant)
    .map((item) => {
      if ('product_variant_id' in item.variant) return item;

      return {
        ...item,
        variant: {
          ...item.variant,
          // Keep the original id as the cart key so quantities stay merged.
          product_variant_id: null,
        },
      };
    });
};

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      return storedCart ? migrateStoredCart(JSON.parse(storedCart)) : [];
    } catch (error) {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product, variant, quantity, availableQuantity) => {
    return new Promise((resolve, reject) => {
      if (variant.manage_inventory) {
        const existingItem = cartItems.find(item => item.variant.id === variant.id);
        const currentCartQuantity = existingItem ? existingItem.quantity : 0;
        if ((currentCartQuantity + quantity) > availableQuantity) {
          const error = new Error(`Not enough stock for ${product.title} (${variant.title}). Only ${availableQuantity} left.`);
          reject(error);
          return;
        }
      }

      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.variant.id === variant.id);
        if (existingItem) {
          return prevItems.map(item =>
            item.variant.id === variant.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prevItems, { product, variant, quantity }];
      });
      setIsCartOpen(true); // Open cart when item is added
      resolve();
    });
  }, [cartItems]);

  const removeFromCart = useCallback((variantId) => {
    setCartItems(prevItems => prevItems.filter(item => item.variant.id !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId, quantity) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.variant.id === variantId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    if (cartItems.length === 0) return 'PHP 0.00';
    return formatCurrency(cartItems.reduce((total, item) => {
      const price = item.variant.sale_price_in_cents ?? item.variant.price_in_cents;
      return total + price * item.quantity;
    }, 0), cartItems[0].variant.currency_info);
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    isCartOpen,
    setIsCartOpen
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, isCartOpen]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
};
