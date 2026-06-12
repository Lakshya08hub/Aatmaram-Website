'use client';
// app/(portal)/content/doctors/DoctorsClient.tsx
// Client Component — Doctors CRUD: Table + Sheet (add/edit) + AlertDialog (delete).
// Uses Sheet (right side, sm:max-w-lg) instead of Dialog because of the longer doctor form.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Doctor } from '@/lib/db/doctors';
import {
  createDoctorAction,
  updateDoctorAction,
  deleteDoctorAction,
} from '@/app/(portal)/actions/content';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const doctorSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  specialization: z.string().min(1, 'Required'),
  qualification: z.string().min(1, 'Required'),
  photo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  bio: z.string().max(600, 'Bio must be 600 characters or fewer').optional(),
  availability_days: z.array(z.string()).optional(),
  is_active: z.boolean(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialData: Doctor[];
  fetchError: boolean;
}

export default function DoctorsClient({ initialData, fetchError }: Props) {
  const router = useRouter();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { is_active: true, availability_days: [] },
  });

  const selectedDays = watch('availability_days') ?? [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openAddSheet() {
    setEditingDoctor(null);
    reset({
      full_name: '',
      specialization: '',
      qualification: '',
      photo_url: '',
      bio: '',
      availability_days: [],
      is_active: true,
    });
    setSheetOpen(true);
  }

  function openEditSheet(doctor: Doctor) {
    setEditingDoctor(doctor);
    reset({
      full_name: doctor.full_name,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      photo_url: doctor.photo_url ?? '',
      bio: doctor.bio ?? '',
      availability_days: doctor.availability_days ?? [],
      is_active: doctor.is_active,
    });
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingDoctor(null);
    reset();
  }

  function toggleDay(day: string) {
    const current = selectedDays;
    if (current.includes(day)) {
      setValue('availability_days', current.filter((d) => d !== day));
    } else {
      setValue('availability_days', [...current, day]);
    }
  }

  async function onSubmit(values: DoctorFormValues) {
    setSubmitting(true);
    try {
      const result = editingDoctor
        ? await updateDoctorAction(editingDoctor.id, {
            full_name: values.full_name,
            specialization: values.specialization,
            qualification: values.qualification,
            photo_url: values.photo_url || undefined,
            bio: values.bio || undefined,
            availability_days: values.availability_days,
            is_active: values.is_active,
          })
        : await createDoctorAction({
            full_name: values.full_name,
            specialization: values.specialization,
            qualification: values.qualification,
            photo_url: values.photo_url || undefined,
            bio: values.bio || undefined,
            availability_days: values.availability_days,
            is_active: values.is_active,
          });

      if (result.error) {
        toast.error('Failed to save. Try again.');
      } else {
        toast.success(editingDoctor ? 'Doctor profile saved' : 'Doctor profile added');
        setSheetOpen(false);
        router.refresh();
      }
    } catch {
      toast.error('Failed to save. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteDoctorAction(deleteTarget.id);
      if (result.error) {
        toast.error('Failed to delete. Try again.');
      } else {
        toast.success('Doctor profile removed');
        router.refresh();
      }
    } catch {
      toast.error('Failed to delete. Try again.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Doctors</h1>
        <Button onClick={openAddSheet}>Add Doctor</Button>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load doctors. Check your connection and refresh.
        </div>
      )}

      {/* Empty state */}
      {!fetchError && initialData.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <h2 className="text-base font-semibold text-slate-700">No doctors yet</h2>
          <p className="text-sm text-slate-500">
            Add your first doctor profile to display it on the public site.
          </p>
          <Button onClick={openAddSheet}>Add Doctor</Button>
        </div>
      )}

      {/* Table */}
      {!fetchError && initialData.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">{doctor.full_name}</TableCell>
                  <TableCell className="text-slate-500">{doctor.specialization}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        doctor.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {doctor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-2 h-10 w-10"
                        aria-label={`Edit ${doctor.full_name}`}
                        onClick={() => openEditSheet(doctor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-2 h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${doctor.full_name}`}
                        onClick={() => setDeleteTarget(doctor)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="doc-full-name" className="text-sm font-medium text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="doc-full-name"
                placeholder="e.g. Dr. Arun Sharma"
                {...register('full_name')}
              />
              {errors.full_name && (
                <p className="text-xs text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            {/* Specialization */}
            <div className="space-y-1">
              <label htmlFor="doc-specialization" className="text-sm font-medium text-slate-700">
                Specialization <span className="text-red-500">*</span>
              </label>
              <Input
                id="doc-specialization"
                placeholder="e.g. Paediatrics"
                {...register('specialization')}
              />
              {errors.specialization && (
                <p className="text-xs text-red-500">{errors.specialization.message}</p>
              )}
            </div>

            {/* Qualification */}
            <div className="space-y-1">
              <label htmlFor="doc-qualification" className="text-sm font-medium text-slate-700">
                Qualification <span className="text-red-500">*</span>
              </label>
              <Input
                id="doc-qualification"
                placeholder="e.g. MBBS, MD (Paediatrics)"
                {...register('qualification')}
              />
              {errors.qualification && (
                <p className="text-xs text-red-500">{errors.qualification.message}</p>
              )}
            </div>

            {/* Photo URL */}
            <div className="space-y-1">
              <label htmlFor="doc-photo-url" className="text-sm font-medium text-slate-700">
                Photo URL <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                id="doc-photo-url"
                placeholder="https://example.com/photo.jpg"
                {...register('photo_url')}
              />
              {errors.photo_url && (
                <p className="text-xs text-red-500">{errors.photo_url.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label htmlFor="doc-bio" className="text-sm font-medium text-slate-700">
                Bio <span className="text-slate-400 font-normal">(optional, max 600 chars)</span>
              </label>
              <Textarea
                id="doc-bio"
                placeholder="Brief professional biography"
                rows={3}
                {...register('bio')}
              />
              {errors.bio && (
                <p className="text-xs text-red-500">{errors.bio.message}</p>
              )}
            </div>

            {/* Availability Days */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Availability Days <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={selectedDays.includes(day) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(day)}
                    aria-pressed={selectedDays.includes(day)}
                    aria-label={`Toggle ${day}`}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-3">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="doc-is-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label htmlFor="doc-is-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                Show on public site
              </label>
            </div>

            <SheetFooter className="pt-2 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeSheet}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : editingDoctor ? (
                  'Save Changes'
                ) : (
                  'Add Doctor'
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove doctor profile?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.full_name}&rdquo; will be removed from the public site
              immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
