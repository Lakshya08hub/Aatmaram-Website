'use client';
// app/(portal)/content/testimonials/TestimonialsClient.tsx
// Client Component — Testimonials CRUD: Table + Dialog (add/edit) + AlertDialog (delete).
// T-15-03: requireCmsRole() enforced in all server actions called here.
// T-15-04: quote field capped at 600 chars by Zod schema.
// T-15-05: sort_order validated as integer 0–999 by Zod schema.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2, MessageSquareQuote } from 'lucide-react';
import { toast } from 'sonner';

import { Testimonial } from '@/lib/db/testimonials';
import { InlineEditCell } from '@/components/portal/InlineEditCell';
import {
  createTestimonialAction,
  updateTestimonialAction,
  deleteTestimonialAction,
  toggleTestimonialActiveAction,
} from '@/app/(portal)/actions/content';

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
// Form schema (T-15-04, T-15-05)
// ---------------------------------------------------------------------------

const testimonialSchema = z.object({
  patient_name: z
    .string()
    .min(1, 'Required')
    .max(100, 'Must be 100 characters or fewer'),
  quote: z
    .string()
    .min(1, 'Required')
    .max(600, 'Must be 600 characters or fewer'),
  designation: z.string().max(100, 'Must be 100 characters or fewer').optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

type TestimonialFormValues = z.infer<typeof testimonialSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialData: Testimonial[];
  fetchError: boolean;
}

export default function TestimonialsClient({ initialData, fetchError }: Props) {
  const router = useRouter();

  // Active toggle optimistic state
  const [activeState, setActiveState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialData.map((t) => [t.id, t.is_active]))
  );

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      is_active: true,
      sort_order: 0,
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setEditingTestimonial(null);
    reset({ patient_name: '', quote: '', designation: '', is_active: true, sort_order: 0 });
    setDialogOpen(true);
  }

  function openEditDialog(testimonial: Testimonial) {
    setEditingTestimonial(testimonial);
    reset({
      patient_name: testimonial.patient_name,
      quote: testimonial.quote,
      designation: testimonial.designation ?? '',
      is_active: testimonial.is_active,
      sort_order: testimonial.sort_order,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTestimonial(null);
    reset();
  }

  async function onSubmit(values: TestimonialFormValues) {
    setSubmitting(true);
    try {
      const input = {
        patient_name: values.patient_name,
        quote: values.quote,
        designation: values.designation || undefined,
        is_active: values.is_active,
        sort_order: values.sort_order,
      };

      const result = editingTestimonial
        ? await updateTestimonialAction(editingTestimonial.id, input)
        : await createTestimonialAction(input);

      if (result.error) {
        toast.error('Failed to save. Try again.');
      } else {
        toast.success(editingTestimonial ? 'Testimonial saved' : 'Testimonial added');
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
      const result = await deleteTestimonialAction(deleteTarget.id);
      if (result.error) {
        toast.error('Failed to delete. Try again.');
      } else {
        toast.success('Testimonial deleted');
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
        <h1 className="text-xl font-semibold text-slate-800">Testimonials</h1>
        <Button onClick={openAddDialog}>Add Testimonial</Button>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load testimonials. Check your connection and refresh.
        </div>
      )}

      {/* Empty state */}
      {!fetchError && initialData.length === 0 && (
        <EmptyState
          icon={MessageSquareQuote}
          title="No testimonials yet"
          description="Add your first testimonial to display it on the homepage."
          action={<Button onClick={openAddDialog}>Add Testimonial</Button>}
        />
      )}

      {/* Table */}
      {!fetchError && initialData.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((testimonial) => (
                <TableRow key={testimonial.id}>
                  <TableCell className="font-medium">
                    <InlineEditCell
                      value={testimonial.patient_name}
                      onSave={async (v) => {
                        if (v.trim() === '') return { error: 'Field cannot be empty' };
                        const r = await updateTestimonialAction(testimonial.id, {
                          patient_name: v,
                          quote: testimonial.quote,
                          designation: testimonial.designation ?? undefined,
                          is_active: testimonial.is_active,
                          sort_order: testimonial.sort_order,
                        });
                        if (!r.error) router.refresh();
                        return r;
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {testimonial.quote.length > 60
                      ? testimonial.quote.slice(0, 60) + '…'
                      : testimonial.quote}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {testimonial.designation ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-h-[44px] items-center">
                      <Switch
                        checked={activeState[testimonial.id] ?? testimonial.is_active}
                        onCheckedChange={async (checked) => {
                          setActiveState((prev) => ({ ...prev, [testimonial.id]: checked }));
                          const result = await toggleTestimonialActiveAction(testimonial.id, checked);
                          if (result.error) {
                            toast.error(result.error);
                            setActiveState((prev) => ({
                              ...prev,
                              [testimonial.id]: !checked,
                            }));
                          }
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{testimonial.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-2 h-10 w-10"
                        aria-label={`Edit ${testimonial.patient_name}`}
                        onClick={() => openEditDialog(testimonial)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-2 h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${testimonial.patient_name}`}
                        onClick={() => setDeleteTarget(testimonial)}
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label htmlFor="patient-name" className="text-sm font-medium text-slate-700">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="patient-name"
                placeholder="e.g. Ramesh Kumar"
                {...register('patient_name')}
              />
              {errors.patient_name && (
                <p className="text-xs text-red-500">{errors.patient_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="quote" className="text-sm font-medium text-slate-700">
                Quote <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="quote"
                placeholder="Patient's testimonial (max 600 characters)"
                rows={4}
                {...register('quote')}
              />
              {errors.quote && (
                <p className="text-xs text-red-500">{errors.quote.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="designation" className="text-sm font-medium text-slate-700">
                Designation <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                id="designation"
                placeholder="e.g. Patient's father, Kanpur"
                {...register('designation')}
              />
              {errors.designation && (
                <p className="text-xs text-red-500">{errors.designation.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is-active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <label htmlFor="is-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                Active (visible on homepage)
              </label>
            </div>

            <div className="space-y-1">
              <label htmlFor="sort-order" className="text-sm font-medium text-slate-700">
                Sort Order
              </label>
              <Input
                id="sort-order"
                type="number"
                min="0"
                max="999"
                placeholder="0"
                {...register('sort_order', { valueAsNumber: true })}
              />
              {errors.sort_order && (
                <p className="text-xs text-red-500">{errors.sort_order.message}</p>
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
                ) : editingTestimonial ? (
                  'Save Changes'
                ) : (
                  'Add Testimonial'
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
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              The testimonial from &ldquo;{deleteTarget?.patient_name}&rdquo; will be removed
              from the homepage immediately. This cannot be undone.
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
