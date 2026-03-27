import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  ChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/card';

const AdminLayout = ({ outletContext }) => {
  const brandLogoSrc = '/brand-logo-transparent.png';
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
    { id: 'products', label: 'Products', icon: Package, path: '/admin/products' },
    { id: 'customers', label: 'Customers', icon: Users, path: '/admin/customers' },
    { id: 'stores', label: 'Stores', icon: Store, path: '/admin/stores' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, path: '/admin/reports' },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/admin/reviews' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased">
      <div className="absolute inset-0 pointer-events-none overflow-hidden h-full w-full">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-[#2954C8]/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-[#2EA7FF]/5 rounded-full blur-[100px]" />
      </div>

      <div className="mx-auto max-w-[1680px] px-4 py-4 lg:px-6 lg:py-5 xl:px-7 2xl:px-8">
        <div className={`grid gap-5 ${isSidebarCollapsed ? 'xl:grid-cols-[132px_minmax(0,1fr)] 2xl:grid-cols-[132px_minmax(0,1fr)]' : 'xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]'}`}>
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden border border-[#F1E7DA] bg-white/80 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <CardContent className={isSidebarCollapsed ? 'p-4' : 'p-5'}>
                <div
                  className={`border-b border-[#F4EEE5] pb-4 ${
                    isSidebarCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between gap-2'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => navigate('/admin')}
                    className={`flex items-center rounded-2xl p-1 -m-1 text-left transition hover:bg-[#FFF7F0] ${
                      isSidebarCollapsed ? 'min-w-0 justify-center' : 'min-w-[158px] gap-3'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center">
                      <img
                        src={brandLogoSrc}
                        alt="e-KoopMart logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="shrink-0">
                        <p className="text-base font-bold leading-none text-[#303030]">e-KoopMart</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#A7A29B]">Admin</p>
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[#8D8A86] transition hover:bg-[#FFF7F0] hover:text-[#4D4A46]"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </div>

                <div className={`mt-5 ${isSidebarCollapsed ? 'flex flex-col items-center space-y-3' : 'space-y-1.5'}`}>
                  {sidebarLinks.slice(0, 7).map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={isSidebarCollapsed ? item.label : undefined}
                        onClick={() => navigate(item.path)}
                        className={`group flex items-center rounded-2xl transition ${
                          isSidebarCollapsed ? 'mx-auto h-12 w-12 justify-center p-0' : 'w-full gap-3 px-3.5 py-3 text-left'
                        } ${
                          isActive
                            ? 'bg-[#2954C8] text-white shadow-[0_12px_24px_rgba(41,84,200,0.3)]'
                            : 'text-[#8D8A86] hover:bg-[#FFF7F0] hover:text-[#4D4A46]'
                        }`}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
                          isActive ? 'bg-white/15 text-white' : 'bg-transparent text-current'
                        }`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        {!isSidebarCollapsed && <span className="min-w-0 text-[15px] font-bold">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className={`mt-5 border-t border-[#F4EEE5] ${isSidebarCollapsed ? 'pt-4 flex flex-col items-center space-y-3' : 'pt-4'}`}>
                  {sidebarLinks.slice(7).map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={isSidebarCollapsed ? item.label : undefined}
                        onClick={() => navigate(item.path)}
                        className={`group flex items-center rounded-2xl transition ${
                          isSidebarCollapsed ? 'mx-auto h-12 w-12 justify-center p-0' : 'w-full gap-3 px-3.5 py-3 text-left'
                        } ${
                          isActive
                            ? 'bg-[#2954C8] text-white shadow-[0_12px_24px_rgba(41,84,200,0.3)]'
                            : 'text-[#8D8A86] hover:bg-[#FFF7F0] hover:text-[#4D4A46]'
                        }`}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
                          isActive ? 'bg-white/15 text-white' : 'bg-transparent text-current'
                        }`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        {!isSidebarCollapsed && <span className="min-w-0 text-[15px] font-bold">{item.label}</span>}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    title={isSidebarCollapsed ? 'Logout' : undefined}
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    className={`group flex items-center rounded-2xl transition ${
                      isSidebarCollapsed ? 'mx-auto h-12 w-12 justify-center p-0' : 'mt-1.5 w-full gap-3 px-3.5 py-3 text-left'
                    } text-[#C15555] hover:bg-[#FFF1F1] hover:text-[#9F2D2D]`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                      <LogOut className="h-[18px] w-[18px]" />
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="min-w-0 text-[15px] font-bold">
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                      </span>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-5 relative">
            <Outlet context={outletContext} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
