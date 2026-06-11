import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DoctorCardProps {
  name: string;
  initials: string;
  specialty: string;
  bookLabel: string;
}

export function DoctorCard({ name, initials, specialty, bookLabel }: DoctorCardProps) {
  return (
    <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center"
          aria-label={'Doctor avatar for ' + name}
        >
          <span className="text-blue-800 font-semibold text-xl">
            {initials}
          </span>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mt-4">
          {name}
        </h3>
        <p className="text-sm text-slate-500">{specialty}</p>
        <Separator className="mt-4" />
        <Link
          href="/appointment"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'mt-4 border-blue-800 text-blue-800 hover:bg-blue-50 min-h-[44px]'
          )}
        >
          {bookLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
