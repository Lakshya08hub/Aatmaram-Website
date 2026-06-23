/**
 * Returns the Hindi string when locale is 'hi' and the Hindi value is non-empty;
 * otherwise returns the English fallback.
 * Usage: localize(dept.name, dept.name_hi, locale)
 */
export function localize(en: string | null | undefined, hi: string | null | undefined, locale: string): string {
  if (locale === 'hi' && hi && hi.trim().length > 0) return hi;
  return en ?? '';
}
