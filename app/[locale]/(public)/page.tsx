import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const t = await getTranslations('site');

  // Supabase connection smoke test — query a non-existent table.
  // Success = error code 42P01 (undefined_table) or PGRST116, NOT an auth/network error.
  const supabase = await createClient();
  const { error } = await supabase.from('_connection_test').select('*').limit(1);
  const connected =
    !error ||
    error.code === '42P01' ||
    error.code === 'PGRST116' ||
    error.message?.includes('does not exist') ||
    error.message?.includes('Could not find the table');

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-gray-600">{t('tagline')}</p>

      {/* Tailwind v4 smoke test */}
      <div className="bg-blue-500 text-white p-4 mt-4 rounded">
        Tailwind CSS v4 is working
      </div>

      {/* Supabase connection test */}
      <div className={`p-4 mt-4 rounded ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        Supabase: {connected ? 'Connection OK' : `Error — ${error?.message}`}
      </div>
    </main>
  );
}
