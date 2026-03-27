import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, ArrowLeft, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { createOrder } from '../api/EcommerceApi';

const CheckoutPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    paymentMethod: 'qrph',
    paymentReference: ''
  });

  const getItemPriceInCents = (item) => item.variant.sale_price_in_cents ?? item.variant.price_in_cents ?? 0;
  const subtotalInCents = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (getItemPriceInCents(item) * item.quantity), 0);
  }, [cartItems]);
  const shippingFeeInCents = cartItems.length > 0 && formData.paymentMethod !== 'pickup' ? 5000 : 0;
  const totalInCents = subtotalInCents + shippingFeeInCents;
  const formatPeso = (amountInCents) => `PHP ${(amountInCents / 100).toFixed(2)}`;

  useEffect(() => {
    if (!user) return;
    setFormData((current) => ({
      ...current,
      fullName: current.fullName || user.name || '',
      email: current.email || user.email || '',
    }));
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.city) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.paymentMethod === 'qrph' && !formData.paymentReference.trim()) {
      toast({
        title: 'Payment Reference Required',
        description: 'Please enter the QRPH payment reference number.',
        variant: 'destructive'
      });
      return;
    }

    if (authLoading) {
      toast({
        title: 'Please wait',
        description: 'Finishing sign-in check. Try again in a moment.',
        variant: 'destructive'
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please add items to your cart before checking out.',
        variant: 'destructive'
      });
      navigate('/products');
      return;
    }

    const orderPayload = {
      items: cartItems.map((item) => {
        const unitPriceInCents = getItemPriceInCents(item);
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          price: Number((unitPriceInCents / 100).toFixed(2))
        };
      }),
      total_amount: Number((totalInCents / 100).toFixed(2)),
      subtotal_amount: Number((subtotalInCents / 100).toFixed(2)),
      shipping_fee: Number((shippingFeeInCents / 100).toFixed(2)),
      shipping_address: formData.address,
      shipping_city: formData.city,
      customer_name: formData.fullName,
      customer_email: formData.email,
      customer_phone: formData.phone,
      payment_method: formData.paymentMethod,
      payment_reference: formData.paymentReference || null,
      customer: {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        paymentMethod: formData.paymentMethod,
      },
    };

    setIsSubmitting(true);
    try {
      const createdOrder = await createOrder(orderPayload);
      clearCart();
      toast({
        title: 'Order Placed!',
        description: 'Your order has been successfully submitted.',
      });
      navigate('/order-confirmation', { state: { order: createdOrder?.order || createdOrder } });
    } catch (error) {
      toast({
        title: 'Checkout Failed',
        description: error?.message || 'Unable to place the order right now.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F7FD] py-8">
        <Helmet>
          <title>Checkout - Barbaza MPC</title>
          <meta name="description" content="Complete your order checkout at Barbaza MPC marketplace" />
        </Helmet>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            onClick={() => navigate('/products')}
            variant="ghost"
            className="mb-6 text-[#2954C8] hover:text-[#12B981]"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Products
          </Button>
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-[#0B1739]">Your cart is empty</h1>
            <p className="text-gray-600 mt-2">Add items to your cart before checking out.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FD] py-8">
      <Helmet>
        <title>Checkout - Barbaza MPC</title>
        <meta name="description" content="Complete your order checkout at Barbaza MPC marketplace" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          onClick={() => navigate('/cart')}
          variant="ghost"
          className="mb-6 text-[#2954C8] hover:text-[#12B981]"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Cart
        </Button>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0B1739] mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6"
              >
                <h2 className="text-xl font-bold text-[#0B1739] mb-6">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-[#0B1739]">Full Name *</Label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12B981] focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-[#0B1739]">Email *</Label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12B981] focus:border-transparent outline-none"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-[#0B1739]">Phone Number *</Label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12B981] focus:border-transparent outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6"
              >
                <h2 className="text-xl font-bold text-[#0B1739] mb-6">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address" className="text-[#0B1739]">Street Address *</Label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12B981] focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-[#0B1739]">City/Municipality *</Label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12B981] focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6"
              >
                <h2 className="text-xl font-bold text-[#0B1739] mb-6">Payment Method</h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'qrph'
                        ? 'border-[#12B981] bg-emerald-50/40'
                        : 'border-gray-200 hover:border-[#12B981]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="qrph"
                      checked={formData.paymentMethod === 'qrph'}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-[#12B981] shrink-0"
                    />
                    <Smartphone className="w-5 h-5 text-[#12B981] shrink-0" />
                    <span className="font-medium text-[#0B1739]">QRPH Scan to Pay</span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'cod'
                        ? 'border-[#12B981] bg-emerald-50/40'
                        : 'border-gray-200 hover:border-[#12B981]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-[#12B981] shrink-0"
                    />
                    <CreditCard className="w-5 h-5 text-[#12B981] shrink-0" />
                    <span className="font-medium text-[#0B1739]">Cash on Delivery</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'pickup'
                        ? 'border-[#12B981] bg-emerald-50/40'
                        : 'border-gray-200 hover:border-[#12B981]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="pickup"
                      checked={formData.paymentMethod === 'pickup'}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-[#12B981] shrink-0"
                    />
                    <Store className="w-5 h-5 text-[#12B981] shrink-0" />
                    <span className="font-medium text-[#0B1739]">Pick up</span>
                  </label>
                </div>

                {formData.paymentMethod === 'qrph' && (
                  <div className="mt-6 border border-dashed border-gray-200 rounded-lg p-4 bg-[#F7FAFC]">
                    <p className="text-sm font-semibold text-[#0B1739] mb-3">Scan QRPH to Pay</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-32 h-32 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
                        QRPH CODE
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">
                          Scan the QRPH code with your banking app and enter the reference number after payment.
                        </p>
                        <Label htmlFor="paymentReference" className="text-[#0B1739]">Reference Number *</Label>
                        <input
                          type="text"
                          id="paymentReference"
                          name="paymentReference"
                          value={formData.paymentReference}
                          onChange={handleInputChange}
                          className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#12B981] outline-none"
                          placeholder="Enter QRPH reference"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:sticky lg:top-24"
              >
                <h2 className="text-xl font-bold text-[#0B1739] mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.variant.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-gray-600 min-w-0 break-words">
                        {item.product.title} x {item.quantity}
                      </span>
                      <span className="font-semibold shrink-0">{formatPeso(getItemPriceInCents(item) * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPeso(subtotalInCents)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Fee</span>
                    <span>{formatPeso(shippingFeeInCents)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-xl font-bold">
                      <span className="text-[#0B1739]">Total</span>
                      <span className="text-[#2954C8]">{formatPeso(totalInCents)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-[#2EA7FF] hover:bg-[#2197E9] text-white font-semibold py-6 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </Button>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;

