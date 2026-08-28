import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { ChevronRight, Minus, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import ProductThumbnail from '../components/ProductThumbnail';

const fmt = (cents) =>
  `PHP ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart } = useCart();

  const getUnitCents = (item) => item.variant.sale_price_in_cents ?? item.variant.price_in_cents ?? 0;
  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + getUnitCents(i) * i.quantity, 0), [cartItems]);
  const shipping = 0;
  const total = subtotal + shipping;

  const getMax = (item) =>
    item.variant.manage_inventory && typeof item.variant.inventory_quantity === 'number'
      ? item.variant.inventory_quantity
      : Infinity;

  return (
    <>
      <Helmet>
        <title>Cart — e-KoopMart</title>
        <meta name="description" content="Review your shopping cart" />
      </Helmet>

      {/* Page header */}
      <div className="border-b border-[#dfe7f4] bg-white">
        <div className="section py-6">
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-[#2954C8]">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-600">Shopping Cart</span>
          </nav>
          <h1 className="text-2xl font-bold text-[#0b1739]">Shopping Cart</h1>
        </div>
      </div>

      <div className="section py-8">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-xl border border-[#dfe7f4] bg-white py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef3fb]">
              <ShoppingCart className="h-9 w-9 text-[#2954C8] opacity-50" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#0b1739]">Your cart is empty</p>
              <p className="mt-1.5 text-sm text-slate-500">Looks like you haven't added anything yet.</p>
            </div>
            <Link
              to="/products"
              className="rounded-lg bg-[#2954C8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1f44a5] transition-colors"
            >
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Items */}
            <div className="space-y-3">
              <div className="hidden grid-cols-[1fr_120px_100px_80px_36px] items-center gap-4 rounded-lg border border-[#dfe7f4] bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
                <span>Product</span>
                <span className="text-center">Quantity</span>
                <span className="text-right">Unit price</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              {cartItems.map((item) => {
                const unitCents = getUnitCents(item);
                const maxQty = getMax(item);
                return (
                  <div
                    key={item.variant.id}
                    className="rounded-xl border border-[#dfe7f4] bg-white p-4 sm:p-5"
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <ProductThumbnail
                        src={item.product.thumbnail_url}
                        alt={item.product.title}
                        className="h-20 w-20"
                      />

                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <p className="clamp-2 text-sm font-semibold text-[#0b1739]">{item.product.title}</p>
                        <p className="text-xs text-slate-400">{item.variant.title}</p>
                        <p className="text-sm font-bold text-[#2954C8]">{fmt(unitCents)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variant.id)}
                        className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      {/* Qty controls */}
                      <div className="flex items-center overflow-hidden rounded-lg border border-[#dfe7f4]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-[#f4f7fd] disabled:opacity-40 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[40px] text-center text-sm font-semibold text-[#0b1739]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                          disabled={Number.isFinite(maxQty) && item.quantity >= maxQty}
                          className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-[#f4f7fd] disabled:opacity-40 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="text-sm font-bold text-[#0b1739]">
                        {fmt(unitCents * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2954C8] hover:text-[#1f44a5]"
                >
                  <Package className="h-4 w-4" />
                  Continue shopping
                </Link>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:sticky lg:top-[110px] h-fit">
              <div className="rounded-xl border border-[#dfe7f4] bg-white p-6 space-y-4">
                <h2 className="text-base font-bold text-[#0b1739]">Order Summary</h2>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span className="font-medium text-[#0b1739]">{fmt(subtotal)}</span>
                  </div>
                </div>

                <div className="border-t border-[#dfe7f4] pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-bold text-[#0b1739]">Total</span>
                    <span className="text-xl font-extrabold text-[#2954C8]">{fmt(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="w-full rounded-lg bg-[#2954C8] py-3 text-sm font-semibold text-white hover:bg-[#1f44a5] transition-colors"
                >
                  Proceed to Checkout
                </button>

                <p className="text-center text-xs text-slate-400">
                  Secure checkout powered by e-KoopMart
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPage;
