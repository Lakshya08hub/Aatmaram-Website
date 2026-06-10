import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('site');

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('tagline')}</p>
      {/* Tailwind v4 smoke test — this div must render blue */}
      <div className="bg-blue-500 text-white p-4 mt-4">
        Tailwind CSS v4 is working
      </div>
    </main>
  );
}
