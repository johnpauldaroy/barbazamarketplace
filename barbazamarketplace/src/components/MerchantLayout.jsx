import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, MessageSquare, Package, Settings, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from './ui/card';

const MerchantLayout = () => {
  const brandLogoSrc = '/brand-logo-transparent.png';
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const storeName = useMemo(() => user?.store?.name || 'Merchant Store', [user?.store?.name]);
  const links = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/merchant' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/merchant/orders' },
    { id: 'products', label: 'Products', icon: Package, path: '/merchant/products' },
    { id: 'inquiries', label: 'Inquiries', icon: MessageSquare, path: '/merchant/inquiries' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/merchant/settings' },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 xl:hidden">
        <button type="button" onClick={() => navigate('/merchant')} className="flex items-center gap-2">
          <img src={brandLogoSrc} alt="e-KoopMart" className="h-8 w-8 object-contain" />
          <span className="text-sm font-bold text-[#303030] truncate max-w-[160px]">{storeName}</span>
        </button>
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setIsMobileNavOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile nav drawer */}
      {isMobileNavOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 xl:hidden" onClick={() => setIsMobileNavOpen(false)} />
          <div className="fixed bottom-0 left-0 top-0 z-50 w-72 overflow-y-auto bg-white shadow-2xl xl:hidden">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-sm font-bold text-[#303030] truncate">{storeName}</span>
              <button type="button" onClick={() => setIsMobileNavOpen(false)} className="flex h-9 w-9 items-center justify-center text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-1.5">
              {links.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/merchant' ? location.pathname === item.path : location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { navigate(item.path); setIsMobileNavOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition ${isActive ? 'bg-[#2954C8] text-white' : 'text-[#8D8A86] hover:bg-[#FFF7F0] hover:text-[#4D4A46]'}`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </button>
                );
              })}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => { handleLogout(); setIsMobileNavOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold text-[#C15555] hover:bg-[#FFF1F1]"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mx-auto max-w-[1680px] px-4 py-4 lg:px-6 lg:py-5 xl:px-7 2xl:px-8">
        <div className={`grid gap-5 ${isSidebarCollapsed ? 'xl:grid-cols-[132px_minmax(0,1fr)]' : 'xl:grid-cols-[280px_minmax(0,1fr)]'}`}>
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden border border-[#F1E7DA] bg-white/80 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <CardContent className={isSidebarCollapsed ? 'p-4' : 'p-5'}>
                <div className={`border-b border-[#F4EEE5] pb-4 ${isSidebarCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between gap-2'}`}>
                  <button
                    type="button"
                    onClick={() => navigate('/merchant')}
                    className={`flex items-center rounded-2xl p-1 -m-1 text-left transition hover:bg-[#FFF7F0] ${isSidebarCollapsed ? 'min-w-0 justify-center' : 'min-w-[158px] gap-3'}`}
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
                        <p className="text-lg font-bold leading-none text-[#303030]">{storeName}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#A7A29B]">Merchant</p>
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
                  {links.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path === '/merchant'
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={isSidebarCollapsed ? item.label : undefined}
                        onClick={() => navigate(item.path)}
                        className={`group flex items-center rounded-2xl transition ${isSidebarCollapsed ? 'mx-auto h-12 w-12 justify-center p-0' : 'w-full gap-3 px-3.5 py-3 text-left'} ${isActive ? 'bg-[#2954C8] text-white shadow-[0_12px_24px_rgba(41,84,200,0.3)]' : 'text-[#8D8A86] hover:bg-[#FFF7F0] hover:text-[#4D4A46]'}`}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${isActive ? 'bg-white/15 text-white' : 'bg-transparent text-current'}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        {!isSidebarCollapsed && <span className="min-w-0 text-[15px] font-bold">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className={`mt-5 border-t border-[#F4EEE5] ${isSidebarCollapsed ? 'pt-4 flex flex-col items-center space-y-3' : 'pt-4'}`}>
                  <button
                    type="button"
                    title={isSidebarCollapsed ? 'Logout' : undefined}
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    className={`group flex items-center rounded-2xl transition ${isSidebarCollapsed ? 'mx-auto h-12 w-12 justify-center p-0' : 'w-full gap-3 px-3.5 py-3 text-left'} text-[#C15555] hover:bg-[#FFF1F1] hover:text-[#9F2D2D]`}
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
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MerchantLayout;
