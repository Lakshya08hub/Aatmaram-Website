import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { DepartmentCard } from '@/components/public/DepartmentCard';
import { SectionHeading } from '@/components/public/SectionHeading';
import { getDepartments } from '@/lib/db/departments';
import type { Department } from '@/lib/db/departments';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Departments | Atmaram Child Care and Critical Care',
  description:
    'Explore specialty departments including Paediatrics, Critical Care, Orthopaedics, and more.',
};

export default async function DepartmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('departments');
  const tNav = await getTranslations('nav');

  let departments: Department[] = [];
  try {
    departments = await getDepartments();
  } catch (err) {
    console.error('[DepartmentsPage] fetch failed:', err);
  }

  return (
    <main>
      {/* Page Header */}
      <section className="py-12 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 mb-2">{tNav('home')} › {t('pageTitle')}</p>
          <h1 className="text-xl font-semibold text-slate-900">{t('pageTitle')}</h1>
        </div>
      </section>

      {/* Departments Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('pageTitle')}
            subtitle={t('pageSubtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {departments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                name={dept.name}
                description={dept.description}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
