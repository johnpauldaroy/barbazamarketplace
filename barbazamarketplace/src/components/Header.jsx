import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cartItems, setIsCartOpen } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isAdminUser = isAuthenticated && user?.is_admin;
  const cartItemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Marketplace' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-[#f8fbff]/90 backdrop-blur-xl">
      <div className="border-b border-[#e5edf8] bg-[#0b1739] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-medium sm:px-6 lg:px-8">
          <p className="hidden sm:block text-white/75">
            Community-first commerce powered by Barbaza MPC Marketplace
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="info" className="bg-white/12 text-white">
              Professional storefront
            </Badge>
            <span className="text-white/75">Barbaza, Antique</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3D7BF3] text-white shadow-[0_16px_30px_rgba(61,123,243,0.34)]">
            <Store className="h-5 w-5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#303030]">
              Barbaza MPC Marketplace
            </p>
            <p className="truncate text-sm text-slate-500">Community marketplace</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-[#dfe7f4] bg-white/90 p-1 lg:flex">
          {!isAdminUser &&
            navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#2954C8]',
                  isActive(link.to) && 'bg-[#eef5ff] text-[#2954C8]'
                )}
              >
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAdminUser && (
            <Link to="/admin">
              <Button variant="secondary" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          )}

          {isAuthenticated && !isAdminUser && (
            <Link to="/account">
              <Button variant="outline" size="sm" className="gap-2">
                <UserRound className="h-4 w-4" />
                My Account
              </Button>
            </Link>
          )}

          {!isAuthenticated ? (
            <Link to="/login">
              <Button variant="outline" size="sm" className="gap-2">
                <UserRound className="h-4 w-4" />
                Login
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" className="gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}

          {!isAdminUser && (
            <Button
              variant="default"
              size="icon"
              className="relative"
              onClick={() => setIsCartOpen(true)}
              aria-label="Open shopping cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff5a75] px-1 text-[10px] font-bold text-white">
                  {cartItemCount}
                </span>
              )}
            </Button>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d7e2f1] bg-white text-slate-700 md:hidden"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-[#e5edf8] bg-white/95 px-4 py-4 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {!isAdminUser &&
              navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'border-[#b9d5ff] bg-[#eef5ff] text-[#2954C8]'
                      : 'border-[#e5edf8] bg-white text-slate-600'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

            {isAdminUser && (
              <Link
                to="/admin"
                className="flex items-center gap-2 rounded-2xl border border-[#b9d5ff] bg-[#eef5ff] px-4 py-3 text-sm font-medium text-[#2954C8]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}

            {isAuthenticated && !isAdminUser && (
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-2xl border border-[#e5edf8] bg-white px-4 py-3 text-sm font-medium text-slate-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserRound className="h-4 w-4 text-[#2954C8]" />
                My Account
              </Link>
            )}

            {!isAdminUser && (
              <button
                type="button"
                className="flex items-center justify-between rounded-2xl border border-[#e5edf8] bg-white px-4 py-3 text-sm font-medium text-slate-700"
                onClick={() => {
                  setIsCartOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#2954C8]" />
                  Open cart
                </span>
                <Badge variant="secondary">{cartItemCount}</Badge>
              </button>
            )}

            {!isAuthenticated ? (
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full gap-2">
                  <UserRound className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
