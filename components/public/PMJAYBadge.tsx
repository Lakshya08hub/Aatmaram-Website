import { ShieldCheck } from 'lucide-react';

interface PMJAYBadgeProps {
  size?: 'default' | 'small';
}

export function PMJAYBadge({ size = 'default' }: PMJAYBadgeProps) {
  if (size === 'small') {
    return (
      <div
        role="img"
        aria-label="Ayushman Bharat PM-JAY Empanelled"
        className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1"
      >
        <ShieldCheck className="w-3 h-3 text-white flex-shrink-0" />
        <span className="text-xs font-semibold text-white">
          Ayushman Bharat PM-JAY Empanelled
        </span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Ayushman Bharat PM-JAY Empanelled"
      className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2"
    >
      <ShieldCheck className="w-4 h-4 text-white flex-shrink-0" />
      <span className="text-sm font-semibold text-white">
        Ayushman Bharat PM-JAY Empanelled
      </span>
    </div>
  );
}
