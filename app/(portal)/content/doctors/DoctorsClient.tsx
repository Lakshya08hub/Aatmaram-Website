'use client';
// app/(portal)/content/doctors/DoctorsClient.tsx
// Client Component — Doctors CRUD: Table + Sheet (add/edit) + AlertDialog (delete).
// Uses Sheet (right side, sm:max-w-lg) instead of Dialog because of the longer doctor form.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

import { Doctor } from '@/lib/db/doctors';
import {
  createDoctorAction,
  updateDoctorAction,
  deleteDoctorAction,
  toggleFeatured,
  setFeaturedOrder,
} from '@/app/(portal)/actions/content';
import { uploadImageAction } from '@/app/(portal)/actions/media';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
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
  photo_url: z.string().optional(),
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

  // Featured optimistic state: record id -> { isFeatured, order }
  const [featuredState, setFeaturedState] = useState<
    Record<string, { isFeatured: boolean; order: number }>
  >(() =>
    Object.fromEntries(
      initialData.map((d) => [d.id, { isFeatured: d.is_featured ?? false, order: d.featured_order ?? 0 }])
    )
  );

  const featuredCount = Object.values(featuredState).filter((s) => s.isFeatured).length;

  const [uploadingImage, setUploadingImage] = useState(false);

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
        <EmptyState
          icon={Stethoscope}
          title="No doctors yet"
          description="Add your first doctor to display it on the public site."
          action={<Button onClick={openAddSheet}>Add Doctor</Button>}
        />
      )}

      {/* Table */}
      {!fetchError && initialData.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <p className="px-4 pt-3 text-sm text-slate-500">{featuredCount} of 3 featured</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((doctor) => {
                const fs = featuredState[doctor.id] ?? { isFeatured: doctor.is_featured ?? false, order: doctor.featured_order ?? 0 };
                return (
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
                    <TableCell>
                      <div className="flex min-h-[44px] items-center">
                        <Switch
                          checked={fs.isFeatured}
                          onCheckedChange={async (checked) => {
                            setFeaturedState((prev) => ({
                              ...prev,
                              [doctor.id]: { ...prev[doctor.id], isFeatured: checked },
                            }));
                            const result = await toggleFeatured('doctors', doctor.id, checked);
                            if (result.error) {
                              toast.error(result.error);
                              setFeaturedState((prev) => ({
                                ...prev,
                                [doctor.id]: { ...prev[doctor.id], isFeatured: !checked },
                              }));
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={fs.order}
                        className="w-14 border rounded px-1 text-sm"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (e.target.value === '' || isNaN(val)) return;
                          setFeaturedState((prev) => ({
                            ...prev,
                            [doctor.id]: { ...prev[doctor.id], order: val },
                          }));
                        }}
                        onBlur={async (e) => {
                          if (e.target.value === '') return;
                          const val = Number(e.target.value);
                          if (isNaN(val) || val === (doctor.featured_order ?? 0)) return;
                          await setFeaturedOrder('doctors', doctor.id, val);
                        }}
                      />
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
                );
              })}
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

            {/* Photo Upload */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Photo <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              {watch('photo_url') && (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border border-slate-200">
                  <Image src={watch('photo_url')!} alt="Preview" fill className="object-cover" />
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImage || !editingDoctor}
                className="block text-sm text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !editingDoctor) return;
                  setUploadingImage(true);
                  try {
                    const fd = new FormData();
                    fd.append('image', file);
                    const result = await uploadImageAction(fd, 'doctors', editingDoctor.id, 'doctors', 'photo_url');
                    if (result.url) {
                      setValue('photo_url', result.url);
                      toast.success('Photo uploaded');
                      router.refresh();
                    } else if (result.error) {
                      toast.error(result.error);
                    }
                  } finally {
                    setUploadingImage(false);
                  }
                }}
              />
              {!editingDoctor && (
                <p className="text-xs text-slate-400">Save the doctor record first, then upload a photo.</p>
              )}
              {uploadingImage && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading…
                </p>
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
