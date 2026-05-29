import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Facebook, Instagram, Mail, MapPin, Phone, ShieldCheck, Truck } from 'lucide-react';

const EXPLORE_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Marketplace' },
  { to: '/stores', label: 'Stores' },
  { to: '/about', label: 'About us' },
  { to: '/contact', label: 'Contact' },
];

const ACCOUNT_LINKS = [
  { to: '/login', label: 'Log in' },
  { to: '/register', label: 'Create account' },
  { to: '/account', label: 'My orders' },
  { to: '/cart', label: 'Shopping cart' },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Verified cooperative products' },
  { icon: Truck, label: 'Community delivery network' },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#0b1739] text-white">
      {/* Trust strip */}
      <div className="border-b border-white/10">
        <div className="section py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-sm text-white/70">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#7ec8ff]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="leading-tight">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="section py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr]">

          {/* Brand col */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/brand-logo-transparent.png" alt="e-KoopMart" className="h-10 w-10 object-contain" />
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">e-KoopMart</p>
                <p className="text-xs text-white/50">Barbaza MPC</p>
              </div>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Barbaza Multi-Purpose Cooperative's online marketplace — connecting members, families,
              and local producers through trusted community commerce.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              Explore
            </h3>
            <ul className="space-y-1">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-block py-1.5 text-sm text-white/65 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              Account
            </h3>
            <ul className="space-y-1">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-block py-1.5 text-sm text-white/65 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Hours */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-white/65">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7ec8ff]" />
                Barbaza, Antique, Philippines
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-[#7ec8ff]" />
                (036) 123-4567
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-[#7ec8ff]" />
                info@barbazampc.coop
              </li>
              <li className="flex items-start gap-2.5">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ec8ff]" />
                <span>
                  Mon–Fri: 8:00 AM – 5:00 PM
                  <br />
                  Sat: 8:00 AM – 12:00 PM
                  <br />
                  Sun: Closed
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="section flex flex-col gap-2 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} e-KoopMart · Barbaza Multi-Purpose Cooperative. All rights reserved.</p>
          <p>Serving members and the community through trusted cooperative commerce.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
