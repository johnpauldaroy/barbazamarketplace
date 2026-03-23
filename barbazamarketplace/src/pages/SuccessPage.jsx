import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../hooks/useCart';

const SuccessPage = () => {
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear the cart on successful payment return
    clearCart();
  }, [clearCart]);

  return (
    <div className="success-page">
      <div className="success-container">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="success-icon-wrapper"
        >
          <div className="success-icon">
            <span>âœ“</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="success-title">Payment Successful!</h2>
          <p className="success-message">
            Thank you for your purchase. Your order has been received and is being processed by the cooperative.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="success-actions"
        >
          <Link to="/products" className="btn btn-primary">
            ðŸ›’ Continue Shopping
          </Link>
          <Link to="/" className="btn btn-secondary">
            Back to Home â†’
          </Link>
        </motion.div>
      </div>

      <style>{`
        .success-page {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #F4F7FD;
        }

        .success-container {
          max-width: 500px;
          width: 100%;
          text-align: center;
        }

        .success-icon-wrapper {
          margin-bottom: 2rem;
        }

        .success-icon {
          width: 100px;
          height: 100px;
          margin: 0 auto;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .success-icon span {
          color: white;
          font-size: 3rem;
          font-weight: bold;
        }

        .success-title {
          font-size: 2rem;
          color: #0B1739;
          margin-bottom: 1rem;
        }

        .success-message {
          color: #7488A3;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .success-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2954C8 0%, #2EA7FF 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(30, 58, 95, 0.3);
        }

        .btn-secondary {
          background: white;
          color: #2954C8;
          border: 2px solid #2954C8;
        }

        .btn-secondary:hover {
          background: #2954C8;
          color: white;
        }

        @media (max-width: 480px) {
          .success-page {
            padding: 1.5rem;
          }

          .success-icon {
            width: 84px;
            height: 84px;
          }

          .success-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SuccessPage;

