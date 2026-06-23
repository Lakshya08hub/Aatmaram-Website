'use client';

const MAX_FEATURED_DEPARTMENTS = 8
// app/(portal)/content/departments/DepartmentsClient.tsx
// Client Component — Departments CRUD: Table + Dialog (add/edit) + AlertDialog (delete).

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

import { Department } from '@/lib/db/departments';
import { InlineEditCell } from '@/components/portal/InlineEditCell';
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  toggleFeatured,
  setFeaturedOrder,
} from '@/app/(portal)/actions/content';
import { uploadImageAction } from '@/app/(portal)/actions/media';

import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or fewer'),
  image_url: z.string().optional(),
  name_hi: z.string().max(80).optional(),
  description_hi: z.string().max(500).optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialData: Department[];
  fetchError: boolean;
}

// WR-002: extract map builder so useState initialiser and useEffect share the same logic.
function buildFeaturedMap(
  items: Department[]
): Record<string, { isFeatured: boolean; order: number }> {
  return Object.fromEntries(
    items.map((d) => [d.id, { isFeatured: d.is_featured ?? false, order: d.featured_order ?? 0 }])
  );
}

export default function DepartmentsClient({ initialData, fetchError }: Props) {
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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setEditingDepartment(null);
    reset({ name: '', description: '', image_url: '', name_hi: '', description_hi: '' });
    setDialogOpen(true);
  }

  function openEditDialog(dept: Department) {
    setEditingDepartment(dept);
    reset({
      name: dept.name,
      description: dept.description,
      image_url: dept.image_url ?? '',
      name_hi: dept.name_hi ?? '',
      description_hi: dept.description_hi ?? '',
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingDepartment(null);
    reset();
  }

  async function onSubmit(values: DepartmentFormValues) {
    setSubmitting(true);
    try {
      const result = editingDepartment
        ? await updateDepartmentAction(editingDepartment.id, {
            name: values.name,
            description: values.description,
            image_url: values.image_url || undefined,
            name_hi: values.name_hi || undefined,
            description_hi: values.description_hi || undefined,
          })
        : await createDepartmentAction({
            name: values.name,
            description: values.description,
            image_url: values.image_url || undefined,
            name_hi: values.name_hi || undefined,
            description_hi: values.description_hi || undefined,
          });

      if (result.error) {
        toast.error('Failed to save. Try again.');
      } else {
        toast.success(editingDepartment ? 'Department saved' : 'Department added');
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
      const result = await deleteDepartmentAction(deleteTarget.id);
      if (result.error) {
        toast.error('Failed to delete. Try again.');
      } else {
        toast.success('Department deleted');
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
        <h1 className="text-xl font-semibold text-foreground">Departments</h1>
        <Button onClick={openAddDialog}>Add Department</Button>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load departments. Check your connection and refresh.
        </div>
      )}

      {/* Empty state */}
      {!fetchError && initialData.length === 0 && (
        <EmptyState
          icon={LayoutGrid}
          title="Nothing here yet"
          description="Add the first entry using the button above."
        />
      )}

      {/* Table */}
      {!fetchError && initialData.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <p className="px-4 pt-3 text-sm text-muted-foreground">{featuredCount} of {MAX_FEATURED_DEPARTMENTS} featured</p>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((dept) => {
                const fs = featuredState[dept.id] ?? { isFeatured: dept.is_featured ?? false, order: dept.featured_order ?? 0 };
                return (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">
                      <InlineEditCell
                        value={dept.name}
                        onSave={async (v) => {
                          if (v.trim() === '') return { error: 'Field cannot be empty' };
                          const r = await updateDepartmentAction(dept.id, { name: v });
                          if (!r.error) router.refresh();
                          return r;
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dept.description.length > 60
                        ? dept.description.slice(0, 60) + '…'
                        : dept.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-h-[44px] items-center">
                        <Switch
                          checked={fs.isFeatured}
                          onCheckedChange={async (checked) => {
                            setFeaturedState((prev) => ({
                              ...prev,
                              [dept.id]: { ...prev[dept.id], isFeatured: checked },
                            }));
                            const result = await toggleFeatured('departments', dept.id, checked);
                            if (result.error) {
                              toast.error(result.error);
                              setFeaturedState((prev) => ({
                                ...prev,
                                [dept.id]: { ...prev[dept.id], isFeatured: !checked },
                              }));
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
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
                            [dept.id]: { ...prev[dept.id], order: val },
                          }));
                        }}
                        onBlur={async (e) => {
                          if (e.target.value === '') return;
                          const val = Number(e.target.value);
                          if (isNaN(val) || val === (dept.featured_order ?? 0)) return;
                          const result = await setFeaturedOrder('departments', dept.id, val);
                          if (result?.error) toast.error('Could not save order');
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-2 h-10 w-10"
                          aria-label={`Edit ${dept.name}`}
                          onClick={() => openEditDialog(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-2 h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${dept.name}`}
                          onClick={() => setDeleteTarget(dept)}
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
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label htmlFor="dept-name" className="text-sm font-medium text-foreground">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="dept-name"
                placeholder="e.g. Cardiology"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="dept-description" className="text-sm font-medium text-foreground">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="dept-description"
                placeholder="Brief overview of the department"
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Hindi Translation Section */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-3">Hindi Translation / हिंदी अनुवाद <span className="font-normal">(optional)</span></p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="dept-name-hi" className="text-sm font-medium text-foreground">
                    Name (हिंदी)
                  </label>
                  <Input id="dept-name-hi" placeholder="e.g. हृदय रोग विभाग" {...register('name_hi')} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="dept-description-hi" className="text-sm font-medium text-foreground">
                    Description (हिंदी)
                  </label>
                  <Textarea id="dept-description-hi" placeholder="विभाग का संक्षिप्त विवरण" rows={3} {...register('description_hi')} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Image <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              {watch('image_url') && (
                <div className="relative w-20 h-20 overflow-hidden rounded border border-border">
                  <Image src={watch('image_url')!} alt="Preview" fill className="object-cover" />
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImage || !editingDepartment}
                className="block text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !editingDepartment) return;
                  setUploadingImage(true);
                  try {
                    const fd = new FormData();
                    fd.append('image', file);
                    const result = await uploadImageAction(fd, 'departments', editingDepartment.id, 'departments', 'image_url');
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
              {!editingDepartment && (
                <p className="text-xs text-muted-foreground">Save the department first, then upload an image.</p>
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
                ) : editingDepartment ? (
                  'Save Changes'
                ) : (
                  'Add Department'
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
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be removed from the public site
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
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
