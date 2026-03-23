import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order || null;
  const orderTotal = useMemo(() => {
    if (!order) return 0;
    if (typeof order.total_in_cents === 'number') return order.total_in_cents / 100;
    if (typeof order.total === 'number') return order.total;
    if (typeof order.total_amount === 'number') return order.total_amount;
    return 0;
  }, [order]);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F4F7FD] py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">No order found</p>
          <Button onClick={() => navigate('/')} className="bg-[#2954C8] hover:bg-[#1F43B0]">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FD] py-8">
      <Helmet>
        <title>Order Confirmation - Barbaza MPC</title>
        <meta name="description" content="Your order has been successfully placed" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-[#12B981] rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-16 h-16 text-white" />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#0B1739] mb-4">
            Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Thank you for your purchase. Your order has been successfully placed.
          </p>

          <div className="bg-[#F4F7FD] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Package className="w-6 h-6 text-[#2954C8]" />
              <span className="text-lg font-semibold text-[#0B1739]">Order Details</span>
            </div>
            
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-semibold text-[#0B1739]">#{order.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold text-[#0B1739] capitalize">
                  {order.customer?.paymentMethod || order.payment_method || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-[#2954C8]">PHP {orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-gray-600 mb-6">
              We've sent a confirmation email to <span className="font-semibold text-[#0B1739]">{order.customer?.email || 'your email'}</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/products')}
                className="bg-[#2954C8] hover:bg-[#1F43B0] text-white px-6 py-3 text-base inline-flex items-center gap-2"
              >
                Continue Shopping <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-[#2954C8] text-[#2954C8] hover:bg-[#2954C8] hover:text-white px-6 py-3 text-base"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;

