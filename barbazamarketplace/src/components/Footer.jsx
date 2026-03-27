import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const brandLogoSrc = '/brand-logo-transparent.png';

  return (
    <footer className="mt-auto border-t border-white/40 bg-[#0b1739] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center">
                <img
                  src={brandLogoSrc}
                  alt="e-KoopMart logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  e-KoopMart
                </p>
                <p className="text-sm text-white/65">Merkado para sa padayon nga pangabuhi</p>
              </div>
            </div>

            <p className="max-w-md text-sm leading-7 text-white/70">
              Barbaza MPC supports local members and families through a trusted
              marketplace for community products, fair trade, and shared growth.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7ec8ff]">
              Explore
            </h3>
            <div className="mt-5 flex flex-col gap-3 text-sm text-white/72">
              <Link to="/" className="transition-colors hover:text-white">
                Home
              </Link>
              <Link to="/products" className="transition-colors hover:text-white">
                Marketplace
              </Link>
              <Link to="/about" className="transition-colors hover:text-white">
                About us
              </Link>
              <Link to="/contact" className="transition-colors hover:text-white">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7ec8ff]">
              Contact & Hours
            </h3>
            <div className="mt-5 space-y-4 text-sm text-white/72">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7ec8ff]" />
                Barbaza, Antique, Philippines
              </p>
              <p className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-[#7ec8ff]" />
                (036) 123-4567
              </p>
              <p className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-[#7ec8ff]" />
                info@barbazampc.coop
              </p>
              <p className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ec8ff]" />
                <span>
                  Monday to Friday, 8:00 AM to 5:00 PM
                  <br />
                  Saturday, 8:00 AM to 12:00 PM
                  <br />
                  Sunday closed
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
          <p>&copy; {currentYear} e-KoopMart. All rights reserved.</p>
          <p>Serving members and the community through trusted cooperative commerce.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
