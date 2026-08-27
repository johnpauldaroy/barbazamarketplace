import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, MoreHorizontal, Search, Store, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

/**
 * App-style bottom navigation for mobile.
 *
 * Layout mirrors a native app: the raised centre button is Shop (the primary
 * destination), with the overflow menu on the right where the thumb rests. The cart
 * lives in the header. Hidden from xl up, where the desktop header nav takes over.
 */
const MobileBottomNav = ({ onOpenMenu, menuOpen }) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const isAdmin = isAuthenticated && user?.is_admin;
  const isMerchant = isAuthenticated && user?.is_merchant;

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Staff get their portal shortcut where shoppers get "Stores".
  const staffLink = isAdmin
    ? { to: '/admin', label: 'Dashboard', icon: LayoutDashboard }
    : isMerchant
      ? { to: '/merchant', label: 'My Store', icon: Store }
      : null;

  const leftItems = [
    { to: '/', label: 'Home', icon: Home },
    staffLink || { to: '/stores', label: 'Stores', icon: Store },
  ];

  const rightItems = [
    isAuthenticated
      ? { to: '/account', label: 'Account', icon: User }
      : { to: '/login', label: 'Log in', icon: User },
  ];

  const tabClass = (active) =>
    cn(
      'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors',
      active ? 'text-[#2954C8]' : 'text-slate-500'
    );

  const renderTab = ({ to, label, icon: Icon }) => {
    const active = isActive(to);
    return (
      <Link key={to} to={to} className={tabClass(active)} aria-current={active ? 'page' : undefined}>
        <Icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.5]')} />
        <span className="w-full truncate text-center text-[10px] font-medium leading-none">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5ebf6] bg-white shadow-[0_-1px_12px_rgba(11,23,57,0.06)] xl:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Primary"
      >
        <div className="relative mx-auto flex h-[64px] max-w-lg items-stretch pb-1.5">
          {/* Equal-width flanks keep the raised cart button on the true centre line. */}
          <div className="flex flex-1 items-stretch">{leftItems.map(renderTab)}</div>

          {/* Centre slot: raised Shop button — the primary destination */}
          <div className="relative flex w-20 shrink-0 flex-col items-center justify-start">
            <Link
              to="/products"
              aria-label="Shop the marketplace"
              aria-current={isActive('/products') ? 'page' : undefined}
              className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#2954C8] text-white shadow-lg shadow-[#2954C8]/30 ring-4 ring-white transition active:scale-95"
            >
              <Search className="h-6 w-6" />
            </Link>
            <span
              className={cn(
                'absolute bottom-3 w-full truncate text-center text-[10px] font-medium leading-none',
                isActive('/products') ? 'text-[#2954C8]' : 'text-slate-500'
              )}
            >
              Shop
            </span>
          </div>

          <div className="flex flex-1 items-stretch">
            {rightItems.map(renderTab)}

            {/* Overflow: About, Contact and account actions */}
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="More options"
              aria-expanded={menuOpen}
              className={cn(
                'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors',
                menuOpen ? 'text-[#2954C8]' : 'text-slate-500'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5 shrink-0', menuOpen && 'stroke-[2.5]')} />
              <span className="w-full truncate text-center text-[10px] font-medium leading-none">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
