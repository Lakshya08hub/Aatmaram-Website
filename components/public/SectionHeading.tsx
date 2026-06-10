interface SectionHeadingProps {
  title: string;
  subtitle?: string;
}

export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {subtitle && (
        <p className="text-slate-500 mt-2 text-base">{subtitle}</p>
      )}
      <div className="mt-2 w-12 h-1 bg-blue-800 rounded-full" />
    </div>
  );
}
