import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Package, Settings, ShoppingCart } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * App-style bottom navigation for the merchant portal on mobile.
 *
 * Mirrors the storefront's MobileBottomNav: the raised centre button is Orders
 * (the destination merchants open most), flanked by equal-width tabs so the
 * centre stays on the true middle line. Hidden from xl up, where the sidebar
 * takes over.
 */
const MerchantBottomNav = () => {
  const location = useLocation();

  const isActive = (path) =>
    path === '/merchant' ? location.pathname === path : location.pathname.startsWith(path);

  const leftItems = [
    { to: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/merchant/products', label: 'Products', icon: Package },
  ];

  const rightItems = [
    { to: '/merchant/inquiries', label: 'Inquiries', icon: MessageSquare },
    { to: '/merchant/settings', label: 'Settings', icon: Settings },
  ];

  const renderTab = ({ to, label, icon: Icon }) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors',
          active ? 'text-[#2954C8]' : 'text-slate-500'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.5]')} />
        <span className="w-full truncate text-center text-[10px] font-medium leading-none">{label}</span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5ebf6] bg-white shadow-[0_-1px_12px_rgba(11,23,57,0.06)] xl:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Merchant"
    >
      <div className="relative mx-auto flex h-[72px] max-w-lg items-stretch pb-1.5">
        <div className="flex flex-1 items-stretch">{leftItems.map(renderTab)}</div>

        {/* Centre slot: raised Orders button — the primary merchant destination */}
        <div className="relative flex w-20 shrink-0 flex-col items-center justify-start">
          <Link
            to="/merchant/orders"
            aria-label="Store orders"
            aria-current={isActive('/merchant/orders') ? 'page' : undefined}
            className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#2954C8] text-white shadow-lg shadow-[#2954C8]/30 ring-4 ring-white transition active:scale-95"
          >
            <ShoppingCart className="h-6 w-6" />
          </Link>
          <span
            className={cn(
              'absolute bottom-[14px] w-full truncate text-center text-[11px] font-semibold leading-none',
              isActive('/merchant/orders') ? 'text-[#2954C8]' : 'text-slate-700'
            )}
          >
            Orders
          </span>
        </div>

        <div className="flex flex-1 items-stretch">{rightItems.map(renderTab)}</div>
      </div>
    </nav>
  );
};

export default MerchantBottomNav;
