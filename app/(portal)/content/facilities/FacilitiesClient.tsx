'use client';
// app/(portal)/content/facilities/FacilitiesClient.tsx
// Client Component — Facilities CRUD: Table + Dialog (add/edit) + AlertDialog (delete).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Facility, FacilityCategory } from '@/lib/db/facilities';
import {
  createFacilityAction,
  updateFacilityAction,
  deleteFacilityAction,
  toggleFeatured,
  setFeaturedOrder,
} from '@/app/(portal)/actions/content';

import { Switch } from '@/components/ui/switch';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS: FacilityCategory[] = ['OPD', 'ICU', 'Diagnostics', 'Surgery', 'Other'];

const facilitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(300, 'Description must be 300 characters or fewer'),
  category: z.enum(['OPD', 'ICU', 'Diagnostics', 'Surgery', 'Other']),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialData: Facility[];
  fetchError: boolean;
}

export default function FacilitiesClient({ initialData, fetchError }: Props) {
  const router = useRouter();

  // Featured optimistic state: record id -> { isFeatured, order }
  const [featuredState, setFeaturedState] = useState<
    Record<string, { isFeatured: boolean; order: number }>
  >(() =>
    Object.fromEntries(
      initialData.map((f) => [f.id, { isFeatured: f.is_featured ?? false, order: f.featured_order ?? 0 }])
    )
  );

  const featuredCount = Object.values(featuredState).filter((s) => s.isFeatured).length;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: { category: 'OPD' },
  });

  const watchedCategory = watch('category');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setEditingFacility(null);
    reset({ name: '', description: '', category: 'OPD' });
    setDialogOpen(true);
  }

  function openEditDialog(facility: Facility) {
    setEditingFacility(facility);
    reset({
      name: facility.name,
      description: facility.description,
      category: facility.category,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingFacility(null);
    reset();
  }

  async function onSubmit(values: FacilityFormValues) {
    setSubmitting(true);
    try {
      const result = editingFacility
        ? await updateFacilityAction(editingFacility.id, {
            name: values.name,
            description: values.description,
            category: values.category,
          })
        : await createFacilityAction({
            name: values.name,
            description: values.description,
            category: values.category,
          });

      if (result.error) {
        toast.error('Failed to save. Try again.');
      } else {
        toast.success(editingFacility ? 'Facility saved' : 'Facility added');
        closeDialog();
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
      const result = await deleteFacilityAction(deleteTarget.id);
      if (result.error) {
        toast.error('Failed to delete. Try again.');
      } else {
        toast.success('Facility removed');
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
        <h1 className="text-xl font-semibold text-slate-800">Facilities</h1>
        <Button onClick={openAddDialog}>Add Facility</Button>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load facilities. Check your connection and refresh.
        </div>
      )}

      {/* Empty state */}
      {!fetchError && initialData.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <h2 className="text-base font-semibold text-slate-700">No facilities listed yet</h2>
          <p className="text-sm text-slate-500">
            Add your first facility to display it on the public site.
          </p>
          <Button onClick={openAddDialog}>Add Facility</Button>
        </div>
      )}

      {/* Table */}
      {!fetchError && initialData.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <p className="px-4 pt-3 text-sm text-slate-500">{featuredCount} featured</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((facility) => {
                const fs = featuredState[facility.id] ?? { isFeatured: facility.is_featured ?? false, order: facility.featured_order ?? 0 };
                return (
                  <TableRow key={facility.id}>
                    <TableCell className="font-medium">{facility.name}</TableCell>
                    <TableCell className="text-slate-500">
                      {facility.description.length > 60
                        ? facility.description.slice(0, 60) + '…'
                        : facility.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{facility.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-h-[44px] items-center">
                        <Switch
                          checked={fs.isFeatured}
                          onCheckedChange={async (checked) => {
                            setFeaturedState((prev) => ({
                              ...prev,
                              [facility.id]: { ...prev[facility.id], isFeatured: checked },
                            }));
                            const result = await toggleFeatured('facilities', facility.id, checked);
                            if (result.error) {
                              toast.error(result.error);
                              setFeaturedState((prev) => ({
                                ...prev,
                                [facility.id]: { ...prev[facility.id], isFeatured: !checked },
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
                        defaultValue={fs.order}
                        className="w-14 border rounded px-1 text-sm"
                        onBlur={async (e) => {
                          const val = Number(e.target.value);
                          await setFeaturedOrder('facilities', facility.id, val);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-2 h-10 w-10"
                          aria-label={`Edit ${facility.name}`}
                          onClick={() => openEditDialog(facility)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-2 h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                          aria-label={`Remove ${facility.name}`}
                          onClick={() => setDeleteTarget(facility)}
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFacility ? 'Edit Facility' : 'Add Facility'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label htmlFor="facility-name" className="text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="facility-name"
                placeholder="e.g. Advanced ICU"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="facility-description" className="text-sm font-medium text-slate-700">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="facility-description"
                placeholder="Brief description of the facility"
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="facility-category" className="text-sm font-medium text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={watchedCategory}
                onValueChange={(value) => setValue('category', value as FacilityCategory)}
              >
                <SelectTrigger id="facility-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-red-500">{errors.category.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
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
                ) : editingFacility ? (
                  'Save Changes'
                ) : (
                  'Add Facility'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove facility?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be removed from the public site immediately.
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
