'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageToggle } from './LanguageToggle';
import { Menu } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navHrefs = [
  { key: 'home' as const, href: '/' },
  { key: 'about' as const, href: '/about' },
  { key: 'departments' as const, href: '/departments' },
  { key: 'doctors' as const, href: '/doctors' },
  { key: 'services' as const, href: '/services' },
  { key: 'contact' as const, href: '/contact' },
];

export function MobileNav() {
  const tNav = useTranslations('nav');
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            className="text-white hover:text-white hover:bg-white/10 p-2"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        }
      />
      <SheetContent side="right" className="w-72 bg-white p-0">
        <nav className="flex flex-col h-full">
          <div className="px-4 pt-6 pb-2 border-b border-slate-100">
            <LanguageToggle variant="drawer" />
          </div>
          <ul className="flex flex-col gap-1 p-4 pt-8 flex-1">
            {navHrefs.map((link) => (
              <li key={link.href}>
                <SheetClose
                  render={
                    <Link
                      href={link.href}
                      className="flex items-center w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-md transition-colors min-h-[44px]"
                    />
                  }
                >
                  {tNav(link.key)}
                </SheetClose>
              </li>
            ))}
          </ul>
          <div className="p-4 border-t border-slate-100">
            <SheetClose
              render={
                <Link
                  href="/appointment"
                  className={cn(
                    buttonVariants({ variant: 'default' }),
                    'w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold min-h-[44px]'
                  )}
                />
              }
            >
              {tNav('cta')}
            </SheetClose>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
