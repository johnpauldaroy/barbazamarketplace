import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RequireMerchant = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return null;
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

