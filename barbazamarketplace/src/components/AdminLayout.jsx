import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LINKS = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, path: '/admin',          exact: true },
  { id: 'orders',    label: 'Orders',      icon: ShoppingCart,    path: '/admin/orders' },
  { id: 'products',  label: 'Products',    icon: Package,         path: '/admin/products' },
  { id: 'customers', label: 'Customers',   icon: Users,           path: '/admin/customers' },
  { id: 'stores',    label: 'Stores',      icon: Store,           path: '/admin/stores' },
  { id: 'reports',   label: 'Reports',     icon: ChartColumn,     path: '/admin/reports' },
  { id: 'reviews',   label: 'Reviews',     icon: MessageSquare,   path: '/admin/reviews' },
  { id: 'settings',  label: 'Settings',    icon: Settings,        path: '/admin/settings' },
];

const isActivePath = (link, pathname) =>
  link.exact ? pathname === link.path : pathname === link.path || pathname.startsWith(link.path + '/');

const NavItem = ({ item, pathname, collapsed, onClick }) => {
  const Icon = item.icon;
  const active = isActivePath(item, pathname);
  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={[
        'group flex items-center rounded-xl transition-all duration-150',
        collapsed ? 'mx-auto h-11 w-11 justify-center' : 'w-full gap-3 px-3 py-2.5',
        active
          ? 'bg-[#2954C8] text-white shadow-[0_4px_14px_rgba(41,84,200,0.35)]'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
      ].join(' ')}
    >
      <span className={[
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
        active ? 'bg-white/15' : '',
      ].join(' ')}>
        <Icon className="h-[17px] w-[17px]" />
      </span>
      {!collapsed && <span className="truncate text-[13.5px] font-semibold">{item.label}</span>}
    </button>
  );
};

const AdminLayout = ({ outletContext }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.name?.split(' ')[0] || 'Admin';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const SidebarContent = ({ onNav, forceExpanded = false }) => {
    const show = forceExpanded || !collapsed;
    return (
      <>
        {/* Logo header */}
        <div className={[
          'flex border-b border-slate-100 pb-4',
          show ? 'items-center justify-between gap-2' : 'flex-col items-center gap-3',
        ].join(' ')}>
          <button
            type="button"
            onClick={() => { navigate('/admin'); onNav?.(); }}
            className={['flex items-center rounded-xl p-1 -m-1 transition hover:bg-slate-50', show ? 'gap-2.5' : 'justify-center'].join(' ')}
          >
            <img src="/brand-logo-transparent.png" alt="e-KoopMart" className="h-9 w-9 object-contain" />
            {show && (
              <div className="leading-tight">
                <p className="text-sm font-bold text-slate-800">e-KoopMart</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
              </div>
            )}
          </button>
          {/* Collapse toggle — only on desktop sidebar */}
          {!forceExpanded && (
            <button
              type="button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed((v) => !v)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* User badge */}
        {show && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2954C8] text-xs font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-700">{displayName}</p>
              <p className="text-[10px] text-slate-400">Administrator</p>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className={['mt-4', collapsed && !forceExpanded ? 'flex flex-col items-center gap-1' : 'space-y-0.5'].join(' ')}>
          {LINKS.map((link) => (
            <NavItem
              key={link.id}
              item={link}
              pathname={location.pathname}
              collapsed={collapsed && !forceExpanded}
              onClick={() => { navigate(link.path); onNav?.(); }}
            />
          ))}
        </nav>

        {/* Logout */}
        <div className={['mt-4 border-t border-slate-100 pt-4', collapsed && !forceExpanded ? 'flex justify-center' : ''].join(' ')}>
          <button
            type="button"
            title={collapsed && !forceExpanded ? 'Logout' : undefined}
            disabled={loggingOut}
            onClick={() => { handleLogout(); onNav?.(); }}
            className={[
              'group flex items-center rounded-xl transition',
              collapsed && !forceExpanded ? 'h-11 w-11 justify-center' : 'w-full gap-3 px-3 py-2.5',
              'text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50',
            ].join(' ')}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
              <LogOut className="h-[17px] w-[17px]" />
            </span>
            {(show) && (
              <span className="truncate text-[13.5px] font-semibold">
                {loggingOut ? 'Logging out…' : 'Logout'}
              </span>
            )}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FD] text-slate-800 antialiased">

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm xl:hidden">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2.5"
        >
          <img src="/brand-logo-transparent.png" alt="e-KoopMart" className="h-8 w-8 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-800">e-KoopMart</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
          </div>
        </button>
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm xl:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 left-0 top-0 z-50 w-72 overflow-y-auto bg-white p-5 shadow-2xl xl:hidden">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Menu</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent onNav={() => setMobileOpen(false)} forceExpanded />
          </div>
        </>
      )}

      {/* Desktop layout */}
      <div className="mx-auto max-w-[1680px] px-4 py-5 lg:px-6 xl:px-8">
        <div className={['grid gap-5', collapsed ? 'xl:grid-cols-[68px_minmax(0,1fr)]' : 'xl:grid-cols-[240px_minmax(0,1fr)]'].join(' ')}>

          {/* Desktop sidebar */}
          <aside className="hidden xl:block">
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <SidebarContent />
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 space-y-5">
            <Outlet context={outletContext} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
