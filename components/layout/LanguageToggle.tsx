'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

export function LanguageToggle({ variant = 'nav' }: { variant?: 'nav' | 'drawer' }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const otherLocale = locale === 'hi' ? 'en' : 'hi';

  function handleSwitch() {
    router.push(pathname, { locale: otherLocale });
  }

  const ariaLabel = locale === 'hi' ? 'भाषा बदलें' : 'Switch language';

  if (variant === 'drawer') {
    return (
      <div
        className="flex items-center justify-center gap-2 text-sm font-medium py-3 min-h-[44px]"
        aria-label={ariaLabel}
      >
        {locale === 'hi' ? (
          <span className="text-slate-700">HI</span>
        ) : (
          <span
            className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
            onClick={handleSwitch}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSwitch()}
            aria-label="हिंदी में देखें"
          >
            HI
          </span>
        )}
        <span className="text-slate-300">|</span>
        {locale === 'en' ? (
          <span className="text-slate-700">EN</span>
        ) : (
          <span
            className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
            onClick={handleSwitch}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSwitch()}
            aria-label="Switch to English"
          >
            EN
          </span>
        )}
      </div>
    );
  }

  // variant === 'nav' (default, desktop on navy background)
  return (
    <button
      className="bg-white text-blue-900 font-bold px-3 py-1 rounded-full text-sm min-h-[44px] flex items-center gap-1"
      onClick={handleSwitch}
      aria-label={ariaLabel}
    >
      <span className={locale === 'hi' ? 'opacity-100' : 'opacity-50'}>HI</span>
      <span className="opacity-40">|</span>
      <span className={locale === 'en' ? 'opacity-100' : 'opacity-50'}>EN</span>
    </button>
  );
}
