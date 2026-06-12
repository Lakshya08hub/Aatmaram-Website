import type { LucideIcon } from 'lucide-react';
import { Building2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface DepartmentCardProps {
  name: string;
  description: string;
  icon?: LucideIcon;
}

export function DepartmentCard({ name, description, icon }: DepartmentCardProps) {
  const Icon = icon ?? Building2;

  return (
    <Card className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-0">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-800" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mt-4">
          {name}
        </h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
