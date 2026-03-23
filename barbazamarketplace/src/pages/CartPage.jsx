import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useCart } from '../hooks/useCart';

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart } = useCart();

  const getItemPriceInCents = (item) => item.variant.sale_price_in_cents ?? item.variant.price_in_cents ?? 0;
  const subtotalInCents = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (getItemPriceInCents(item) * item.quantity), 0);
  }, [cartItems]);
  const shippingFeeInCents = cartItems.length > 0 ? 5000 : 0;
  const totalInCents = subtotalInCents + shippingFeeInCents;
  const formatPeso = (amountInCents) => `PHP ${(amountInCents / 100).toFixed(2)}`;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F7FD] py-8">
        <Helmet>
          <title>Shopping Cart - Barbaza MPC</title>
          <meta name="description" content="Your shopping cart at Barbaza MPC marketplace" />
        </Helmet>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-[#0B1739] mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
            <Button
              onClick={() => navigate('/products')}
              className="bg-[#2954C8] hover:bg-[#1F43B0] text-white px-8 py-6 text-lg"
            >
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FD] py-8">
      <Helmet>
        <title>Shopping Cart - Barbaza MPC</title>
        <meta name="description" content="Review your shopping cart items before checkout" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#0B1739] mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const unitPriceInCents = getItemPriceInCents(item);
              const inventoryQty = item.variant.inventory_quantity;
              const maxQty = item.variant.manage_inventory
                ? (typeof inventoryQty === 'number' ? inventoryQty : Infinity)
                : Infinity;
              return (
                <motion.div
                  key={item.variant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <img
                      src={item.product.thumbnail_url}
                      alt={item.product.title}
                      className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#0B1739] mb-2">{item.product.title}</h3>
                      <p className="text-[#12B981] text-sm mb-3">{item.variant.title}</p>
                      <p className="text-xl font-bold text-[#2954C8]">{formatPeso(unitPriceInCents)}</p>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-4 sm:gap-0">
                      <button
                        onClick={() => removeFromCart(item.variant.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))}
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0 border-[#2954C8] text-[#2954C8]"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>
                        <Button
                          onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0 border-[#2954C8] text-[#2954C8]"
                          disabled={Number.isFinite(maxQty) && item.quantity >= maxQty}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

            <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 lg:sticky lg:top-24">
              <h2 className="text-2xl font-bold text-[#0B1739] mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPeso(subtotalInCents)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Fee</span>
                  <span>{formatPeso(shippingFeeInCents)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold text-[#0B1739]">
                    <span>Total</span>
                    <span className="text-[#2954C8]">{formatPeso(totalInCents)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/checkout')}
                className="w-full bg-[#2EA7FF] hover:bg-[#2197E9] text-[#2954C8] font-semibold py-6 text-lg"
              >
                Proceed to Checkout <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

              <Button
                onClick={() => navigate('/products')}
                variant="outline"
                className="w-full mt-3 border-[#2954C8] text-[#2954C8] hover:bg-[#2954C8] hover:text-white"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

