'use client';
// app/(portal)/content/hospital-info/HospitalInfoClient.tsx
// Client Component — Single-record hospital info edit form.
// T-05-11 mitigation: Zod max(1200) on about_text enforced before DB write.

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { HospitalInfo } from '@/lib/db/hospital-info';
import { updateHospitalInfoAction } from '@/app/(portal)/actions/content';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const hospitalInfoSchema = z.object({
  about_text: z.string().max(1200, 'About text must be 1200 characters or fewer'),
  opd_timings: z.string(),
  emergency_number: z.string(),
  address_line1: z.string(),
  address_line2: z.string().optional(),
  city: z.string(),
  maps_embed_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
});

type HospitalInfoFormValues = z.infer<typeof hospitalInfoSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialData: HospitalInfo | null;
}

export default function HospitalInfoClient({ initialData }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HospitalInfoFormValues>({
    resolver: zodResolver(hospitalInfoSchema),
    defaultValues: {
      about_text: initialData?.about_text ?? '',
      opd_timings: initialData?.opd_timings ?? '',
      emergency_number: initialData?.emergency_number ?? '',
      address_line1: initialData?.address_line1 ?? '',
      address_line2: initialData?.address_line2 ?? '',
      city: initialData?.city ?? 'Kanpur',
      maps_embed_url: initialData?.maps_embed_url ?? '',
    },
  });

  async function onSubmit(values: HospitalInfoFormValues) {
    if (!initialData) return;

    try {
      const result = await updateHospitalInfoAction(initialData.id, {
        about_text: values.about_text,
        opd_timings: values.opd_timings,
        emergency_number: values.emergency_number,
        address_line1: values.address_line1,
        address_line2: values.address_line2 || undefined,
        city: values.city,
        maps_embed_url: values.maps_embed_url || undefined,
      });

      if (result.error) {
        toast.error('Failed to save. Try again.');
      } else {
        toast.success('Hospital info saved');
        router.refresh();
      }
    } catch {
      toast.error('Failed to save. Try again.');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!initialData) {
    return (
      <div className="p-8">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load hospital info. Refresh to try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Hospital Information</h1>
        <p className="mt-1 text-sm text-slate-500">
          This information appears on the public About and Contact pages.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* About Text */}
        <div className="space-y-1">
          <label htmlFor="about-text" className="text-sm font-medium text-slate-700">
            About Text
          </label>
          <Textarea
            id="about-text"
            placeholder="Brief overview of the hospital for the public About page"
            rows={6}
            {...register('about_text')}
          />
          {errors.about_text && (
            <p className="text-xs text-red-500">{errors.about_text.message}</p>
          )}
        </div>

        {/* OPD Timings */}
        <div className="space-y-1">
          <label htmlFor="opd-timings" className="text-sm font-medium text-slate-700">
            OPD Timings
          </label>
          <Input
            id="opd-timings"
            placeholder="e.g. Mon–Sat, 9 AM – 1 PM &amp; 5 PM – 8 PM"
            {...register('opd_timings')}
          />
          {errors.opd_timings && (
            <p className="text-xs text-red-500">{errors.opd_timings.message}</p>
          )}
        </div>

        {/* Emergency Number */}
        <div className="space-y-1">
          <label htmlFor="emergency-number" className="text-sm font-medium text-slate-700">
            Emergency Number
          </label>
          <Input
            id="emergency-number"
            placeholder="e.g. +91-512-XXXXXXX"
            {...register('emergency_number')}
          />
          {errors.emergency_number && (
            <p className="text-xs text-red-500">{errors.emergency_number.message}</p>
          )}
        </div>

        {/* Address Line 1 */}
        <div className="space-y-1">
          <label htmlFor="address-line1" className="text-sm font-medium text-slate-700">
            Address Line 1
          </label>
          <Input
            id="address-line1"
            placeholder="Street address"
            {...register('address_line1')}
          />
          {errors.address_line1 && (
            <p className="text-xs text-red-500">{errors.address_line1.message}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="space-y-1">
          <label htmlFor="address-line2" className="text-sm font-medium text-slate-700">
            Address Line 2{' '}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <Input
            id="address-line2"
            placeholder="Locality, landmark, etc."
            {...register('address_line2')}
          />
          {errors.address_line2 && (
            <p className="text-xs text-red-500">{errors.address_line2.message}</p>
          )}
        </div>

        {/* City */}
        <div className="space-y-1">
          <label htmlFor="city" className="text-sm font-medium text-slate-700">
            City
          </label>
          <Input
            id="city"
            placeholder="Kanpur"
            {...register('city')}
          />
          {errors.city && (
            <p className="text-xs text-red-500">{errors.city.message}</p>
          )}
        </div>

        {/* Google Maps Embed URL */}
        <div className="space-y-1">
          <label htmlFor="maps-embed-url" className="text-sm font-medium text-slate-700">
            Google Maps Embed URL{' '}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <Input
            id="maps-embed-url"
            placeholder="https://www.google.com/maps/embed?..."
            {...register('maps_embed_url')}
          />
          {errors.maps_embed_url && (
            <p className="text-xs text-red-500">{errors.maps_embed_url.message}</p>
          )}
        </div>

        {/* Save button */}
        <div className="pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
