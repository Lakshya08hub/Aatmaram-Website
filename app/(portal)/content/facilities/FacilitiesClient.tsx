'use client';
// app/(portal)/content/facilities/FacilitiesClient.tsx
// Client Component — Facilities CRUD: Table + Dialog (add/edit) + AlertDialog (delete).

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2, Building } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

import { Facility, FacilityCategory } from '@/lib/db/facilities';
import {
  createFacilityAction,
  updateFacilityAction,
  deleteFacilityAction,
  toggleFeatured,
  setFeaturedOrder,
} from '@/app/(portal)/actions/content';
import { uploadImageAction } from '@/app/(portal)/actions/media';

import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';

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
  image_url: z.string().optional(),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialData: Facility[];
  fetchError: boolean;
}

// WR-002: extract map builder so useState initialiser and useEffect share the same logic.
function buildFeaturedMap(
  items: Facility[]
): Record<string, { isFeatured: boolean; order: number }> {
  return Object.fromEntries(
    items.map((f) => [f.id, { isFeatured: f.is_featured ?? false, order: f.featured_order ?? 0 }])
  );
}

export default function FacilitiesClient({ initialData, fetchError }: Props) {
  const router = useRouter();

  // Featured optimistic state: record id -> { isFeatured, order }
  const [featuredState, setFeaturedState] = useState<
    Record<string, { isFeatured: boolean; order: number }>
  >(() => buildFeaturedMap(initialData));

  // WR-002: sync featuredState when initialData changes (e.g. after router.refresh()).
  useEffect(() => {
    setFeaturedState(buildFeaturedMap(initialData));
  }, [initialData]);

  const featuredCount = Object.values(featuredState).filter((s) => s.isFeatured).length;

  const [uploadingImage, setUploadingImage] = useState(false);

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
    defaultValues: { category: 'OPD', image_url: '' },
  });

  const watchedCategory = watch('category');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setEditingFacility(null);
    reset({ name: '', description: '', category: 'OPD', image_url: '' });
    setDialogOpen(true);
  }

  function openEditDialog(facility: Facility) {
    setEditingFacility(facility);
    reset({
      name: facility.name,
      description: facility.description,
      category: facility.category,
      image_url: facility.image_url ?? '',
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
            image_url: values.image_url || undefined,
          })
        : await createFacilityAction({
            name: values.name,
            description: values.description,
            category: values.category,
            image_url: values.image_url || undefined,
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
        <h1 className="text-xl font-semibold text-foreground">Facilities</h1>
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
        <EmptyState
          icon={Building}
          title="No facilities yet"
          description="Add your first facility to display it on the public site."
          action={<Button onClick={openAddDialog}>Add Facility</Button>}
        />
      )}

      {/* Table */}
      {!fetchError && initialData.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <p className="px-4 pt-3 text-sm text-muted-foreground">{featuredCount} featured</p>
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
                    <TableCell className="text-muted-foreground">
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
                        value={fs.order}
                        className="w-14 border rounded px-1 text-sm"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (e.target.value === '' || isNaN(val)) return;
                          setFeaturedState((prev) => ({
                            ...prev,
                            [facility.id]: { ...prev[facility.id], order: val },
                          }));
                        }}
                        onBlur={async (e) => {
                          if (e.target.value === '') return;
                          const val = Number(e.target.value);
                          if (isNaN(val) || val === (facility.featured_order ?? 0)) return;
                          // WR-003: check result and surface errors to the user.
                          const result = await setFeaturedOrder('facilities', facility.id, val);
                          if (result?.error) {
                            toast.error('Could not save order');
                          }
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
              <label htmlFor="facility-name" className="text-sm font-medium text-foreground">
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
              <label htmlFor="facility-description" className="text-sm font-medium text-foreground">
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
              <label htmlFor="facility-category" className="text-sm font-medium text-foreground">
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

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Image <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              {watch('image_url') && (
                <div className="relative w-40 aspect-video overflow-hidden rounded border border-border">
                  <Image src={watch('image_url')!} alt="Preview" fill className="object-cover" />
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImage || !editingFacility}
                className="block text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !editingFacility) return;
                  setUploadingImage(true);
                  try {
                    const fd = new FormData();
                    fd.append('image', file);
                    const result = await uploadImageAction(fd, 'facilities', editingFacility.id, 'facilities', 'image_url');
                    if (result.url) {
                      setValue('image_url', result.url);
                      toast.success('Image uploaded');
                      router.refresh();
                    } else if (result.error) {
                      toast.error(result.error);
                    }
                  } finally {
                    setUploadingImage(false);
                  }
                }}
              />
              {!editingFacility && (
                <p className="text-xs text-muted-foreground">Save the facility first, then upload an image.</p>
              )}
              {uploadingImage && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading…
                </p>
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
