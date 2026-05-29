import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft, ChevronRight, CreditCard, ImageIcon, Smartphone, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/use-toast';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { createOrder } from '../api/EcommerceApi';

const fmt = (cents) =>
  `PHP ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_METHODS = [
  { value: 'qrph', label: 'QRPH / GCash / Maya', icon: Smartphone, desc: 'Scan QR code and upload your payment reference.' },
  { value: 'cod', label: 'Cash on Delivery', icon: Store, desc: 'Pay in cash when your order arrives.' },
  { value: 'pickup', label: 'Store Pickup (no shipping fee)', icon: CreditCard, desc: 'Pick up at Barbaza MPC office. No shipping fee.' },
];

const Field = ({ label, id, required, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#0b1739]">
      {label}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10';

const CheckoutPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    address: '', city: '',
    paymentMethod: 'qrph',
    paymentReference: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      fullName: f.fullName || user.name || '',
      email: f.email || user.email || '',
    }));
  }, [user]);

  const getUnitCents = (item) => item.variant.sale_price_in_cents ?? item.variant.price_in_cents ?? 0;
  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + getUnitCents(i) * i.quantity, 0), [cartItems]);
  const shipping = cartItems.length > 0 && form.paymentMethod !== 'pickup' ? 5000 : 0;
  const total = subtotal + shipping;

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, email, phone, address, city, paymentMethod, paymentReference } = form;
    if (!fullName || !email || !phone || !address || !city) {
      toast({ title: 'Missing information', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    if (paymentMethod === 'qrph' && !paymentReference.trim()) {
      toast({ title: 'Payment reference required', description: 'Enter the QRPH reference number.', variant: 'destructive' });
      return;
    }
    if (authLoading) {
      toast({ title: 'Please wait', description: 'Verifying session…', variant: 'destructive' });
      return;
    }
    if (cartItems.length === 0) { navigate('/products'); return; }

    setSubmitting(true);
    try {
      const payload = {
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: Number((getUnitCents(item) / 100).toFixed(2)),
        })),
        total_amount: Number((total / 100).toFixed(2)),
        subtotal_amount: Number((subtotal / 100).toFixed(2)),
        shipping_fee: Number((shipping / 100).toFixed(2)),
        shipping_address: address,
        shipping_city: city,
        customer_name: fullName,
        customer_email: email,
        customer_phone: phone,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        customer: { fullName, email, phone, paymentMethod },
      };
      const created = await createOrder(payload);
      clearCart();
      toast({ title: 'Order placed!', description: 'Your order has been submitted successfully.' });
      navigate('/order-confirmation', { state: { order: created?.order || created } });
    } catch (err) {
      toast({ title: 'Checkout failed', description: err?.message || 'Unable to place order. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="section flex flex-col items-center gap-5 py-20 text-center">
        <Helmet><title>Checkout — e-KoopMart</title></Helmet>
        <p className="text-lg font-bold text-[#0b1739]">Your cart is empty</p>
        <Link to="/products" className="rounded-lg bg-[#2954C8] px-5 py-2.5 text-sm font-semibold text-white">
          Browse marketplace
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Checkout — e-KoopMart</title>
        <meta name="description" content="Complete your order at e-KoopMart" />
      </Helmet>

      {/* Page header */}
      <div className="border-b border-[#dfe7f4] bg-white">
        <div className="section py-6">
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-[#2954C8]">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/cart" className="hover:text-[#2954C8]">Cart</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-600">Checkout</span>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/cart" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#2954C8]">
              <ArrowLeft className="h-4 w-4" />
              Back to cart
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#0b1739]">Checkout</h1>
        </div>
      </div>

      <div className="section py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Form sections */}
            <div className="space-y-5">
              {/* Contact info */}
              <div className="rounded-xl border border-[#dfe7f4] bg-white p-6">
                <h2 className="mb-5 text-base font-bold text-[#0b1739]">Contact Information</h2>
                <div className="space-y-4">
                  <Field label="Full name" id="fullName" required>
                    <input
                      id="fullName" name="fullName" type="text" required
                      value={form.fullName} onChange={handleChange}
                      className={inputCls} placeholder="Juan dela Cruz"
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email address" id="email" required>
                      <input
                        id="email" name="email" type="email" required
                        value={form.email} onChange={handleChange}
                        className={inputCls} placeholder="you@example.com"
                      />
                    </Field>
                    <Field label="Phone number" id="phone" required>
                      <input
                        id="phone" name="phone" type="tel" required
                        value={form.phone} onChange={handleChange}
                        className={inputCls} placeholder="09XX XXX XXXX"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="rounded-xl border border-[#dfe7f4] bg-white p-6">
                <h2 className="mb-5 text-base font-bold text-[#0b1739]">Delivery Address</h2>
                <div className="space-y-4">
                  <Field label="Street address" id="address" required>
                    <input
                      id="address" name="address" type="text" required
                      value={form.address} onChange={handleChange}
                      className={inputCls} placeholder="House no., street, barangay"
                    />
                  </Field>
                  <Field label="City / Municipality" id="city" required>
                    <input
                      id="city" name="city" type="text" required
                      value={form.city} onChange={handleChange}
                      className={inputCls} placeholder="Barbaza, Antique"
                    />
                  </Field>
                </div>
              </div>

              {/* Payment method */}
              <div className="rounded-xl border border-[#dfe7f4] bg-white p-6">
                <h2 className="mb-5 text-base font-bold text-[#0b1739]">Payment Method</h2>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon, desc }) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3.5 rounded-xl border-2 p-4 transition-colors ${
                        form.paymentMethod === value
                          ? 'border-[#2954C8] bg-[#eef3fb]'
                          : 'border-[#dfe7f4] hover:border-[#2954C8]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={value}
                        checked={form.paymentMethod === value}
                        onChange={handleChange}
                        className="mt-0.5 accent-[#2954C8]"
                      />
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        <Icon className="h-5 w-5 text-[#2954C8]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0b1739]">{label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                      </div>
                    </label>
                  ))}

                  {form.paymentMethod === 'qrph' && (
                    <div className="mt-3">
                      <Field label="Payment reference number" id="paymentReference" required>
                        <input
                          id="paymentReference"
                          name="paymentReference"
                          type="text"
                          value={form.paymentReference}
                          onChange={handleChange}
                          className={inputCls}
                          placeholder="e.g. GCash transaction ID"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order summary sticky sidebar */}
            <div className="lg:sticky lg:top-[110px] h-fit space-y-4">
              <div className="rounded-xl border border-[#dfe7f4] bg-white p-6">
                <h2 className="mb-4 text-base font-bold text-[#0b1739]">
                  Order Summary
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)
                  </span>
                </h2>

                <ul className="space-y-3 divide-y divide-[#f0f4fc]">
                  {cartItems.map((item) => (
                    <li key={item.variant.id} className="flex items-center gap-3 pt-3 first:pt-0">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#dfe7f4] bg-[#f4f7fd]">
                        {item.product.thumbnail_url ? (
                          <img src={item.product.thumbnail_url} alt={item.product.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="clamp-1 text-xs font-semibold text-[#0b1739]">{item.product.title}</p>
                        <p className="text-[11px] text-slate-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-[#0b1739] shrink-0">
                        {fmt(getUnitCents(item) * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 space-y-2.5 border-t border-[#dfe7f4] pt-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#0b1739]">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping fee</span>
                    <span className="font-medium text-[#0b1739]">
                      {form.paymentMethod === 'pickup' ? 'Free (Pickup)' : fmt(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#dfe7f4] pt-2.5">
                    <span className="font-bold text-[#0b1739]">Total</span>
                    <span className="text-xl font-extrabold text-[#2954C8]">{fmt(total)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#2954C8] py-3.5 text-sm font-semibold text-white transition hover:bg-[#1f44a5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Placing order...' : `Place order · ${fmt(total)}`}
              </button>

              <p className="text-center text-xs text-slate-400">
                By placing your order you agree to our cooperative commerce terms.
              </p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default CheckoutPage;
