import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, useLocation, useRoutes } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import Footer from './components/Footer';
import ShoppingCart from './components/ShoppingCart';
import { Toaster } from './components/ui/toaster';
import { CartProvider } from './hooks/useCart';
import { AuthProvider } from './hooks/useAuth';
import RequireAdmin from './components/RequireAdmin';
import RequireAuth from './components/RequireAuth';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));

const RouteLoadingFallback = () => (
  <div className="mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
    <div className="grid w-full gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`route-fallback-${index}`}
          className="h-[320px] rounded-[30px] border border-[#e5edf8] bg-[#f5f8fe] animate-pulse"
        />
      ))}
    </div>
  </div>
);

const AppRoutes = () =>
  useRoutes([
    { path: '/', element: <HomePage /> },
    { path: '/products', element: <ProductsPage /> },
    { path: '/product/:id', element: <ProductDetailPage /> },
    { path: '/about', element: <AboutPage /> },
    { path: '/contact', element: <ContactPage /> },
    { path: '/cart', element: <CartPage /> },
    {
      path: '/checkout',
      element: (
        <RequireAuth>
          <CheckoutPage />
        </RequireAuth>
      ),
    },
    {
      path: '/account',
      element: (
        <RequireAuth>
          <AccountPage />
        </RequireAuth>
      ),
    },
    { path: '/order-confirmation', element: <OrderConfirmationPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    {
      path: '/admin',
      element: (
        <RequireAdmin>
          <AdminDashboard />
        </RequireAdmin>
      ),
      children: [
        { index: true, element: <AdminOverviewPage /> },
        { path: 'orders', element: <AdminOrdersPage /> },
        { path: 'products', element: <AdminProductsPage /> },
        { path: 'customers', element: <AdminCustomersPage /> },
        { path: 'reports', element: <AdminReportsPage /> },
        { path: 'settings', element: <AdminSettingsPage /> },
      ]
    },
    { path: '/success', element: <SuccessPage /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);

const AppLayout = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Helmet>
        <title>Barbaza MPC Marketplace</title>
        <meta name="description" content="Shop quality products at Barbaza MPC Marketplace and support members and community producers." />
      </Helmet>

      {!isAdminPage && <Header />}
      {!isAdminPage && <ShoppingCart />}

      <main className={isAdminPage ? '' : 'flex-1'}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <AppRoutes />
        </Suspense>
      </main>

      {!isAdminPage && <Footer />}
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

