import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Search,
  ShoppingCart,
  Store,
  X,
  User,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

// Destinations the mobile bottom bar already covers as tabs, so the menu
// sheet does not repeat them.
const BOTTOM_NAV_ROUTES = ['/', '/products', '/stores'];

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Marketplace' },
  { to: '/stores', label: 'Stores' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const Header = ({ mobileOpen = false, setMobileOpen = () => {} }) => {
  const brandLogoSrc = '/brand-logo-transparent.png';
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, setIsCartOpen } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  const isAdmin = isAuthenticated && user?.is_admin;
  const isMerchant = isAuthenticated && user?.is_merchant;
  const isStaff = isAdmin || isMerchant;

  const cartCount = useMemo(
    () => cartItems.reduce((t, i) => t + i.quantity, 0),
    [cartItems]
  );

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Announcement bar — hidden on mobile to avoid tiny tap-target links */}
      <div className="hidden bg-[#0b1739] text-white sm:block">
        <div className="section flex h-9 items-center justify-between text-xs">
          <span className="text-white/65">
            Community-first commerce · Barbaza, Antique, Philippines
          </span>
          <div className="flex items-center gap-4 text-white/75">
            <Link to="/about" className="hover:text-white transition-colors">About us</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <span className="text-white/35">|</span>
            <span>Mon–Fri 8AM–5PM</span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-[#dfe7f4] bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="section flex h-16 items-center gap-4">

          {/* Logo — min 40px touch target */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <img src={brandLogoSrc} alt="e-KoopMart" className="h-10 w-10 object-contain" />
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-bold text-[#0b1739]">e-KoopMart</p>
              <p className="text-[11px] text-slate-400">Barbaza MPC</p>
            </div>
          </Link>

          {/* Desktop search */}
          {!isStaff && (
            <form
              onSubmit={handleSearch}
              className="flex flex-1 max-w-xl items-center gap-0 overflow-hidden rounded-lg border border-[#dfe7f4] bg-[#f4f7fd] transition-colors focus-within:border-[#2954C8] focus-within:bg-white"
            >
              <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="h-10 flex-1 bg-transparent px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="m-1 hidden rounded-md bg-[#2954C8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1f44a5] sm:block"
              >
                Search
              </button>
            </form>
          )}

          {/* Spacer for staff layout */}
          {isStaff && <div className="flex-1" />}

          {/* Desktop nav links */}
          {!isStaff && (
            <nav className="hidden items-center gap-0.5 xl:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'bg-[#eef3fb] text-[#2954C8]'
                      : 'text-slate-600 hover:bg-[#f4f7fd] hover:text-[#2954C8]'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Staff dashboard link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#dfe7f4] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-[#2954C8] hover:text-[#2954C8] transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {isMerchant && (
              <Link
                to="/merchant"
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#dfe7f4] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-[#2954C8] hover:text-[#2954C8] transition-colors"
              >
                <Store className="h-4 w-4" />
                My Store
              </Link>
            )}

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#dfe7f4] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-[#2954C8] hover:text-[#2954C8] transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[100px] truncate">{user?.name?.split(' ')[0] || 'Account'}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', userMenuOpen && 'rotate-180')} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[#dfe7f4] bg-white py-1.5 shadow-lg">
                    {!isStaff && (
                      <Link
                        to="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-[#f4f7fd] hover:text-[#2954C8]"
                      >
                        <User className="h-4 w-4" />
                        My Account
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-[#f4f7fd] hover:text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  to="/login"
                  className="rounded-lg border border-[#dfe7f4] bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-[#2954C8] hover:text-[#2954C8] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-[#2954C8] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#1f44a5] transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Cart button — 40px minimum touch target */}
            {!isStaff && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label="Open cart"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2954C8] text-white transition hover:bg-[#1f44a5]"
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}


          </div>
        </div>

      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm xl:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[#0b1739] shadow-2xl xl:hidden"
            style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="rounded-t-2xl bg-white">
            <div className="flex h-14 items-center justify-between border-b border-[#dfe7f4] px-4">
              <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <img src={brandLogoSrc} alt="e-KoopMart" className="h-8 w-8 object-contain" />
                <span className="text-sm font-bold text-[#0b1739]">e-KoopMart</span>
              </Link>
              <button type="button" onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-1">
              {!isStaff && NAV_LINKS.filter((link) => !BOTTOM_NAV_ROUTES.includes(link.to)).map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'bg-[#eef3fb] text-[#2954C8]'
                      : 'text-slate-700 hover:bg-[#f4f7fd]'
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#f4f7fd]"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#2954C8]" />
                  Dashboard
                </Link>
              )}
              {isMerchant && (
                <Link
                  to="/merchant"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#f4f7fd]"
                >
                  <Store className="h-4 w-4 text-[#2954C8]" />
                  My Store
                </Link>
              )}
            </div>

            </div>{/* end bg-white */}
            {/* Auth section — dark branded footer */}
            <div className="p-4 space-y-2">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg border border-red-400/30 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-400/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg bg-[#2954C8] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#1f44a5]"
                  >
                    Create account
                  </Link>
                </>
              )}
              <p className="pt-1 text-center text-[10px] leading-relaxed text-white/40">
                e-KoopMart · Barbaza MPC
              </p>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
