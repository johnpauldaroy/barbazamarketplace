import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageIcon, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../hooks/useCart';

const fmt = (cents) =>
  `PHP ${Number(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ShoppingCart = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, isCartOpen, setIsCartOpen } = useCart();

  if (!isCartOpen) return null;

  const itemTotal = (item) => {
    const price = item.variant.sale_price_in_cents ?? item.variant.price_in_cents ?? 0;
    return fmt(price * item.quantity);
  };
  const unitPrice = (item) => {
    const price = item.variant.sale_price_in_cents ?? item.variant.price_in_cents ?? 0;
    return fmt(price);
  };
  const getMaxQty = (item) =>
    item.variant.manage_inventory && typeof item.variant.inventory_quantity === 'number'
      ? item.variant.inventory_quantity
      : Infinity;

  const totalCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dfe7f4] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#2954C8]" />
            <h2 className="text-base font-bold text-[#0b1739]">
              Shopping Cart
              {totalCount > 0 && (
                <span className="ml-2 rounded-full bg-[#eef3fb] px-2 py-0.5 text-xs font-semibold text-[#2954C8]">
                  {totalCount}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[#f4f7fd] hover:text-slate-700 transition-colors"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef3fb]">
                <ShoppingBag className="h-7 w-7 text-[#2954C8] opacity-50" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#0b1739]">Your cart is empty</p>
                <p className="mt-1 text-sm text-slate-400">Add products to get started.</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsCartOpen(false); navigate('/products'); }}
                className="mt-2 rounded-lg bg-[#2954C8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f44a5] transition-colors"
              >
                Browse marketplace
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#f0f4fc] px-5">
              {cartItems.map((item) => (
                <li key={item.variant.id} className="flex gap-4 py-4">
                  {/* Image */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#dfe7f4] bg-[#f4f7fd]">
                    {item.product.thumbnail_url ? (
                      <img
                        src={item.product.thumbnail_url}
                        alt={item.product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="clamp-2 text-sm font-semibold text-[#0b1739]">{item.product.title}</p>
                    <p className="text-xs text-slate-400">{item.variant.title}</p>
                    <p className="text-sm font-bold text-[#2954C8]">{unitPrice(item)}</p>
                  </div>

                  {/* Controls */}
                  <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.variant.id)}
                      aria-label="Remove"
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center overflow-hidden rounded-lg border border-[#dfe7f4]">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-[#f4f7fd] disabled:opacity-40 transition-colors"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[28px] text-center text-xs font-semibold text-[#0b1739]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                        disabled={Number.isFinite(getMaxQty(item)) && item.quantity >= getMaxQty(item)}
                        className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-[#f4f7fd] disabled:opacity-40 transition-colors"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-[#0b1739]">{itemTotal(item)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-[#dfe7f4] p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-lg font-bold text-[#0b1739]">{getCartTotal()}</span>
            </div>
            <p className="text-xs text-slate-400">Shipping calculated at checkout</p>
            <button
              type="button"
              onClick={() => { setIsCartOpen(false); navigate('/checkout'); }}
              className="w-full rounded-lg bg-[#2954C8] py-3 text-sm font-semibold text-white hover:bg-[#1f44a5] transition-colors"
            >
              Proceed to Checkout
            </button>
            <button
              type="button"
              onClick={() => { setIsCartOpen(false); navigate('/cart'); }}
              className="w-full rounded-lg border border-[#dfe7f4] py-2.5 text-sm font-medium text-slate-600 hover:bg-[#f4f7fd] transition-colors"
            >
              View full cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ShoppingCart;
