// TODO Phase 3: Replace hrefs with locale-aware Link from next-intl/navigation

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { MobileNav } from './MobileNav';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Departments', href: '/departments' },
  { label: 'Our Doctors', href: '/doctors' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  return (
    <nav
      data-testid="header"
      className="sticky top-0 z-50 h-16 bg-[#1E3A5F] shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/hi"
          className="text-lg font-semibold text-white hover:text-white/90 transition-colors flex-shrink-0"
        >
          Atmaram Child Care
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language toggle placeholder — Phase 3 */}
          <span
            className="text-sm text-white/60 cursor-not-allowed select-none"
            title="Language toggle coming soon"
          >
            EN/HI
          </span>

          {/* Book Appointment CTA */}
          <Link
            href="/appointment"
            className={cn(
              buttonVariants({ variant: 'default' }),
              'bg-green-600 hover:bg-green-700 text-white text-sm font-semibold min-h-[44px]'
            )}
          >
            Book Appointment
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
