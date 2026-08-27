import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Navigate, useLocation, useRoutes } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import Footer from './components/Footer';
import { cn } from './lib/utils';
import MobileBottomNav from './components/MobileBottomNav';
import ShoppingCart from './components/ShoppingCart';
import { Toaster } from './components/ui/toaster';
import { CartProvider } from './hooks/useCart';
import { AuthProvider } from './hooks/useAuth';
import RequireAdmin from './components/RequireAdmin';
import RequireMerchant from './components/RequireMerchant';
import RequireAuth from './components/RequireAuth';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminStoresPage from './pages/AdminStoresPage';
import MerchantOverviewPage from './pages/MerchantOverviewPage';
import MerchantOrdersPage from './pages/MerchantOrdersPage';
import MerchantProductsPage from './pages/MerchantProductsPage';
import MerchantInquiriesPage from './pages/MerchantInquiriesPage';
import MerchantSettingsPage from './pages/MerchantSettingsPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const StoresPage = lazy(() => import('./pages/StoresPage'));
const StoreDetailPage = lazy(() => import('./pages/StoreDetailPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const OrderFeedbackPage = lazy(() => import('./pages/OrderFeedbackPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MerchantDashboard = lazy(() => import('./pages/MerchantDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));

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
    { path: '/stores', element: <StoresPage /> },
    { path: '/stores/:slug', element: <StoreDetailPage /> },
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
    { path: '/feedback/:token', element: <OrderFeedbackPage /> },
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
        { path: 'stores', element: <AdminStoresPage /> },
        { path: 'reports', element: <AdminReportsPage /> },
        { path: 'reviews', element: <AdminReviewsPage /> },
        { path: 'settings', element: <AdminSettingsPage /> },
      ]
    },
    {
      path: '/merchant',
      element: (
        <RequireMerchant>
          <MerchantDashboard />
        </RequireMerchant>
      ),
      children: [
        { index: true, element: <MerchantOverviewPage /> },
        { path: 'orders', element: <MerchantOrdersPage /> },
        { path: 'products', element: <MerchantProductsPage /> },
        { path: 'inquiries', element: <MerchantInquiriesPage /> },
        { path: 'settings', element: <MerchantSettingsPage /> },
      ],
    },
    { path: '/success', element: <SuccessPage /> },
    { path: '/privacy-policy', element: <PrivacyPolicyPage /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);

const AppLayout = () => {
  const location = useLocation();
  const isPortalPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/merchant');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col bg-transparent',
        // Reserve room for the fixed mobile bottom bar so footers and
        // page-ending CTAs are never hidden behind it.
        !isPortalPage && 'pb-[calc(64px+env(safe-area-inset-bottom,0px))] xl:pb-0'
      )}
    >
      <Helmet>
        <title>e-KoopMart</title>
        <meta name="description" content="Shop quality products at e-KoopMart and support members and community producers." />
      </Helmet>

      {!isPortalPage && <Header mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />}
      {!isPortalPage && <ShoppingCart />}

      <main className={isPortalPage ? '' : 'flex-1'}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <AppRoutes />
        </Suspense>
      </main>

      {!isPortalPage && <Footer />}
      {!isPortalPage && (
        <MobileBottomNav
          onOpenMenu={() => setMobileMenuOpen((open) => !open)}
          menuOpen={mobileMenuOpen}
        />
      )}
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

