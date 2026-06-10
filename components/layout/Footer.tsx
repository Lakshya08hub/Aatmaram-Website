import Link from 'next/link';
import { PMJAYBadge } from '@/components/public/PMJAYBadge';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Departments', href: '/departments' },
  { label: 'Our Doctors', href: '/doctors' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' },
];

export default function Footer() {
  return (
    <footer data-testid="footer" className="bg-[#1E3A5F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Hospital Info */}
          <div>
            <p className="text-lg font-semibold text-white">
              Atmaram Child Care and Critical Care
            </p>
            <p className="text-sm text-white/70 mt-2">
              Kanpur&apos;s trusted super-specialty hospital
            </p>
            <div className="mt-4">
              <PMJAYBadge size="small" />
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <p className="text-sm font-semibold text-white mb-4">Quick Links</p>
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <p className="text-sm font-semibold text-white mb-4">Contact</p>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-white/70">
                Naubasta / Kidwai Nagar, Kanpur - 208021, Uttar Pradesh
              </div>
              <div className="text-sm text-white/70">+91-XXXXXXXXXX (placeholder)</div>
              <div className="text-sm text-white/70">OPD: Mon–Sat: 9:00 AM – 5:00 PM</div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-8 pt-4 text-sm text-white/50 text-center">
          © 2025 Atmaram Child Care and Critical Care. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
