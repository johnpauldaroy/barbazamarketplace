import React from 'react';
import { useToast } from './use-toast';

export const Toaster = () => {
    const { toasts, dismiss } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="toaster">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast toast-${toast.variant || 'default'}`}
                >
                    <div className="toast-content">
                        {toast.title && <h4 className="toast-title">{toast.title}</h4>}
                        {toast.description && <p className="toast-description">{toast.description}</p>}
                    </div>
                    <button
                        className="toast-close"
                        onClick={() => dismiss(toast.id)}
                        aria-label="Close"
                    >
                        x
                    </button>
                </div>
            ))}

            <style>{`
        .toaster {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 400px;
        }

        .toast {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .toast-default {
          background: white;
          border: 1px solid #E1E8F3;
          color: #0B1739;
        }

        .toast-success {
          background: #d1fae5;
          border: 1px solid #6ee7b7;
          color: #065f46;
        }

        .toast-error {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }

        .toast-warning {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          color: #92400e;
        }

        .toast-content {
          flex: 1;
        }

        .toast-title {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .toast-description {
          margin: 0;
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .toast-close {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s;
          padding: 0;
        }

        .toast-close:hover {
          opacity: 1;
        }

        @media (max-width: 480px) {
          .toaster {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }
        }
      `}</style>
        </div>
    );
};

export default Toaster;


