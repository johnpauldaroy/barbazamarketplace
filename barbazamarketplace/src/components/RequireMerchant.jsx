import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RequireMerchant = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2954C8] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_merchant) {
    return <Navigate to="/" replace />;
  }

  if (user?.store?.status && user.store.status !== 'active') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireMerchant;

