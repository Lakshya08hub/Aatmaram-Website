import { Building2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface FacilityCardProps {
  name: string;
  description: string;
  image_url?: string;
}

export function FacilityCard({ name, description, image_url: _image_url }: FacilityCardProps) {
  return (
    <Card className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-0">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-blue-800" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mt-4">
          {name}
        </h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-3">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
