import { Link } from '@/i18n/navigation';
import { LanguageToggle } from './LanguageToggle';
import { getTranslations, getLocale } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { MobileNav } from './MobileNav';
import { cn } from '@/lib/utils';

export async function Header() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'nav' });

  const navLinks = [
    { label: t('home'), href: '/' },
    { label: t('about'), href: '/about' },
    { label: t('departments'), href: '/departments' },
    { label: t('doctors'), href: '/doctors' },
    { label: t('services'), href: '/services' },
    { label: t('contact'), href: '/contact' },
  ];

  return (
    <nav
      data-testid="header"
      className="sticky top-0 z-50 h-16 bg-[#1E3A5F] shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
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
          {/* Language toggle */}
          <LanguageToggle />

          {/* Book Appointment CTA */}
          <Link
            href="/appointment"
            className={cn(
              buttonVariants({ variant: 'default' }),
              'bg-green-600 hover:bg-green-700 text-white text-sm font-semibold min-h-[44px]'
            )}
          >
            {t('cta')}
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
