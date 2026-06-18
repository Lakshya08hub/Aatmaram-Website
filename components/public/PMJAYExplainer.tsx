// components/public/PMJAYExplainer.tsx
// PM-JAY explainer section — server component, pure presentational.
// FadeIn wrapper is applied by the parent page.tsx (D-10 architecture).

import { Link } from '@/i18n/navigation';
import { SectionHeading } from '@/components/public/SectionHeading';

interface PMJAYExplainerProps {
  heading: string;
  fact1Heading: string;
  fact1Body: string;
  fact2Heading: string;
  fact2Body: string;
  fact3Heading: string;
  fact3Body: string;
  cta: string;
}

export function PMJAYExplainer({
  heading,
  fact1Heading,
  fact1Body,
  fact2Heading,
  fact2Body,
  fact3Heading,
  fact3Body,
  cta,
}: PMJAYExplainerProps) {
  const facts = [
    { heading: fact1Heading, body: fact1Body },
    { heading: fact2Heading, body: fact2Body },
    { heading: fact3Heading, body: fact3Body },
  ];

  return (
    <section className="bg-green-50 py-16 md:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeading title={heading} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {facts.map((fact, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-green-100 shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {fact.heading}
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                {fact.body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/appointment"
            className="inline-block bg-green-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            {cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
