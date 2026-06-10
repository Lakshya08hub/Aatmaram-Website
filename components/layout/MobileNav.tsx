'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Departments', href: '/departments' },
  { label: 'Our Doctors', href: '/doctors' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' },
];

export function MobileNav() {
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
          <ul className="flex flex-col gap-1 p-4 pt-8 flex-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <SheetClose
                  render={
                    <Link
                      href={link.href}
                      className="flex items-center w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-md transition-colors min-h-[44px]"
                    />
                  }
                >
                  {link.label}
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
              Book Appointment
            </SheetClose>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
