import { Department } from '@/lib/data/departments';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface DepartmentCardProps {
  department: Department;
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  const Icon = department.icon;

  return (
    <Card className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-0">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-800" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mt-4">
          {department.name}
        </h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {department.description}
        </p>
      </CardContent>
    </Card>
  );
}
