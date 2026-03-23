import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageIcon, Minus, ShoppingCart as ShoppingCartIcon, Trash2, X } from 'lucide-react';
import { useCart } from '../hooks/useCart';

const ShoppingCart = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const getItemPrice = (item) => {
    const price = item.variant.sale_price_in_cents ?? item.variant.price_in_cents;
    return `PHP ${Number(price / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getItemTotal = (item) => {
    const price = item.variant.sale_price_in_cents ?? item.variant.price_in_cents;
    return `PHP ${Number((price * item.quantity) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <>
      <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />

      <div className="cart-sidebar">
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button
            className="close-button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        <div className="cart-content">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <span className="empty-icon">
                <ShoppingCartIcon size={56} strokeWidth={1.6} />
              </span>
              <p>Your cart is empty</p>
              <button
                className="continue-shopping"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/products');
                }}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.variant.id} className="cart-item">
                    <div className="item-image">
                      {item.product.thumbnail_url ? (
                        <img src={item.product.thumbnail_url} alt={item.product.title} />
                      ) : (
                        <div className="placeholder-image">
                          <ImageIcon size={28} />
                        </div>
                      )}
                    </div>
                    <div className="item-details">
                      <h4 className="item-title">{item.product.title}</h4>
                      <p className="item-variant">{item.variant.title}</p>
                      <p className="item-price">{getItemPrice(item)}</p>
                    </div>
                    <div className="item-actions">
                      <div className="quantity-controls">
                        <button
                          onClick={() =>
                            updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))
                          }
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <p className="item-total">{getItemTotal(item)}</p>
                      <button
                        className="remove-button"
                        onClick={() => removeFromCart(item.variant.id)}
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-footer">
                <div className="cart-total">
                  <span>Total:</span>
                  <span className="total-amount">{getCartTotal()}</span>
                </div>
                <button className="checkout-button" onClick={handleCheckout}>
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 200;
          animation: fadeIn 0.2s ease;
        }

        .cart-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          width: 100%;
          max-width: 420px;
          height: 100vh;
          background: white;
          z-index: 201;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #E1E8F3;
          background: #F8FAFE;
        }

        .cart-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #0B1739;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          color: #7488A3;
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #0B1739;
        }

        .cart-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .empty-cart {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #7488A3;
          padding: 2rem;
        }

        .empty-icon {
          opacity: 0.5;
          color: #A7B4C8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .continue-shopping {
          background: #2954C8;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .continue-shopping:hover {
          background: #2EA7FF;
        }

        .cart-items {
          flex: 1;
          padding: 1rem;
        }

        .cart-item {
          display: grid;
          grid-template-columns: 80px 1fr auto;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #E1E8F3;
        }

        .item-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          background: #F5F8FE;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94A3B8;
        }

        .item-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .item-title {
          margin: 0;
          font-size: 0.95rem;
          color: #0B1739;
        }

        .item-variant {
          margin: 0;
          font-size: 0.85rem;
          color: #7488A3;
        }

        .item-price {
          margin: 0;
          font-size: 0.9rem;
          color: #2954C8;
          font-weight: 500;
        }

        .item-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #F5F8FE;
          border-radius: 6px;
          padding: 0.25rem;
        }

        .quantity-controls button {
          width: 28px;
          height: 28px;
          border: none;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .quantity-controls button:hover:not(:disabled) {
          background: #E1E8F3;
        }

        .quantity-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .item-total {
          font-weight: 600;
          color: #0B1739;
          margin: 0;
        }

        .remove-button {
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #7488A3;
        }

        .remove-button:hover {
          opacity: 1;
        }

        .cart-footer {
          padding: 1.5rem;
          border-top: 1px solid #E1E8F3;
          background: #F8FAFE;
        }

        .cart-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .total-amount {
          font-weight: 700;
          color: #2954C8;
          font-size: 1.25rem;
        }

        .checkout-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #2954C8 0%, #2EA7FF 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .checkout-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
        }

        @media (max-width: 480px) {
          .cart-sidebar {
            max-width: 100%;
          }

          .cart-item {
            grid-template-columns: 60px 1fr;
          }

          .item-actions {
            grid-column: span 2;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
      `}</style>
    </>
  );
};

export default ShoppingCart;
