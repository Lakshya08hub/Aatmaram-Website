'use client';
// app/(portal)/staff/StaffClient.tsx
// Client Component — full Staff CRUD UI.
// Add Dialog (STAFF-01) + Edit Sheet (STAFF-02) + Activate/Deactivate toggle (STAFF-03/04)
// + Delete AlertDialog (STAFF-03) + Doctor Profile Link (STAFF-05).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

import { StaffMember } from '@/lib/db/staff';
import { Doctor } from '@/lib/db/doctors';
import {
  createStaffAction,
  updateStaffAction,
  toggleActiveAction,
  deleteStaffAction,
} from '@/app/(portal)/actions/staff';
import { updateDoctorStaffLinkAction } from '@/app/(portal)/actions/staff';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ---------------------------------------------------------------------------
// Form schemas
// ---------------------------------------------------------------------------

const addStaffSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  temp_password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'doctor', 'receptionist']),
  phone: z.string().optional(),
  salary: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().optional()
  ),
  join_date: z.string().optional(),
});

const editStaffSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'doctor', 'receptionist']),
  phone: z.string().optional(),
  salary: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().optional()
  ),
  join_date: z.string().optional(),
  doctor_id: z.string().optional(),
});

type AddStaffValues = z.infer<typeof addStaffSchema>;
type EditStaffValues = z.infer<typeof editStaffSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  initialStaff: StaffMember[];
  doctors: Doctor[];
  fetchError?: boolean;
}

// ---------------------------------------------------------------------------
// Role badge helper
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
};

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  super_admin: 'default',
  admin: 'default',
  doctor: 'secondary',
  receptionist: 'outline',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffClient({ initialStaff, doctors, fetchError }: Props) {
  const router = useRouter();

  // Edit sheet state
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle state — track which row is mid-toggle
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Add form
  // ---------------------------------------------------------------------------

  const addForm = useForm<AddStaffValues, unknown, AddStaffValues>({
    resolver: zodResolver(addStaffSchema) as import('react-hook-form').Resolver<AddStaffValues>,
    defaultValues: {
      full_name: '',
      email: '',
      temp_password: '',
      role: 'receptionist',
      phone: '',
      join_date: '',
    },
  });

  // ---------------------------------------------------------------------------
  // Edit form
  // ---------------------------------------------------------------------------

  const editForm = useForm<EditStaffValues, unknown, EditStaffValues>({
    resolver: zodResolver(editStaffSchema) as import('react-hook-form').Resolver<EditStaffValues>,
  });

  // ---------------------------------------------------------------------------
  // Handlers — Add
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    addForm.reset({
      full_name: '',
      email: '',
      temp_password: '',
      role: 'receptionist',
      phone: '',
      join_date: '',
    });
    setAddDialogOpen(true);
  }

  async function onAddSubmit(values: AddStaffValues) {
    setAddSubmitting(true);
    try {
      const result = await createStaffAction({
        email: values.email,
        temp_password: values.temp_password,
        role: values.role as 'admin' | 'doctor' | 'receptionist',
        full_name: values.full_name,
        phone: values.phone || undefined,
        salary: values.salary,
        join_date: values.join_date || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Staff member added (pending activation)');
        setAddDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error('Failed to add staff. Try again.');
    } finally {
      setAddSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers — Edit
  // ---------------------------------------------------------------------------

  function openEditSheet(staff: StaffMember) {
    setEditingStaff(staff);
    // Find linked doctor for this staff member
    const linkedDoctor = doctors.find((d) => d.staff_user_id === staff.id);
    editForm.reset({
      full_name: staff.full_name ?? '',
      role: (staff.role === 'super_admin' ? 'admin' : staff.role) as 'admin' | 'doctor' | 'receptionist',
      phone: staff.phone ?? '',
      salary: staff.salary ?? undefined,
      join_date: staff.join_date ?? '',
      doctor_id: linkedDoctor?.id ?? '',
    });
    setEditSheetOpen(true);
  }

  function closeEditSheet() {
    setEditSheetOpen(false);
    setEditingStaff(null);
  }

  async function onEditSubmit(values: EditStaffValues) {
    if (!editingStaff) return;
    setEditSubmitting(true);
    try {
      const result = await updateStaffAction(editingStaff.id, {
        full_name: values.full_name,
        role: values.role as 'admin' | 'doctor' | 'receptionist',
        phone: values.phone || undefined,
        salary: values.salary,
        join_date: values.join_date || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        setEditSubmitting(false);
        return;
      }

      // Doctor profile linkage (STAFF-05)
      if (editingStaff.role === 'doctor' || values.role === 'doctor') {
        const selectedDoctorId = values.doctor_id || undefined;
        const linkResult = await updateDoctorStaffLinkAction(
          selectedDoctorId ?? null,
          selectedDoctorId ? editingStaff.id : null
        );
        if (linkResult.error) {
          toast.error(`Staff saved but doctor link failed: ${linkResult.error}`);
          setEditSubmitting(false);
          closeEditSheet();
          router.refresh();
          return;
        }
      }

      toast.success('Staff member updated');
      closeEditSheet();
      router.refresh();
    } catch {
      toast.error('Failed to update staff. Try again.');
    } finally {
      setEditSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers — Toggle Active
  // ---------------------------------------------------------------------------

  async function handleToggleActive(staff: StaffMember) {
    setTogglingId(staff.id);
    try {
      const result = await toggleActiveAction(staff.id, !staff.is_active);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(staff.is_active ? 'Staff member deactivated' : 'Staff member activated');
        router.refresh();
      }
    } catch {
      toast.error('Failed to update status. Try again.');
    } finally {
      setTogglingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers — Delete
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteStaffAction(deleteTarget.id, deleteTarget.user_id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Staff member deleted');
        router.refresh();
      }
    } catch {
      toast.error('Failed to delete staff. Try again.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived filtered lists
  // ---------------------------------------------------------------------------

  const activeStaff = initialStaff.filter((s) => s.is_active);
  const pendingStaff = initialStaff.filter((s) => !s.is_active);

  // ---------------------------------------------------------------------------
  // Staff table row renderer
  // ---------------------------------------------------------------------------

  function StaffRow({ staff }: { staff: StaffMember }) {
    const isToggling = togglingId === staff.id;

    return (
      <TableRow key={staff.id}>
        <TableCell className="font-medium">{staff.full_name ?? '—'}</TableCell>
        <TableCell className="text-slate-500">{staff.email}</TableCell>
        <TableCell>
          <Badge variant={ROLE_VARIANT[staff.role] ?? 'outline'}>
            {ROLE_LABEL[staff.role] ?? staff.role}
          </Badge>
        </TableCell>
        <TableCell className="text-slate-500">{staff.phone ?? '—'}</TableCell>
        <TableCell className="text-slate-500">
          {staff.join_date ? new Date(staff.join_date).toLocaleDateString('en-IN') : '—'}
        </TableCell>
        <TableCell>
          {staff.is_active ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pending</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`Edit ${staff.full_name}`}
              onClick={() => openEditSheet(staff)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={staff.is_active ? 'Deactivate' : 'Activate'}
              onClick={() => handleToggleActive(staff)}
              disabled={isToggling}
            >
              {isToggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : staff.is_active ? (
                <UserX className="h-4 w-4 text-amber-600" />
              ) : (
                <UserCheck className="h-4 w-4 text-green-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
              aria-label={`Delete ${staff.full_name}`}
              onClick={() => setDeleteTarget(staff)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // ---------------------------------------------------------------------------
  // Staff table
  // ---------------------------------------------------------------------------

  function StaffTable({ rows }: { rows: StaffMember[] }) {
    if (rows.length === 0) {
      return (
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-slate-500">No staff members in this category.</p>
        </div>
      );
    }

    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((staff) => (
              <StaffRow key={staff.id} staff={staff} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Available doctors for linkage dropdown (unlinked OR linked to this staff)
  // ---------------------------------------------------------------------------

  function availableDoctors(staffProfileId: string) {
    return doctors.filter(
      (d) => d.staff_user_id === null || d.staff_user_id === staffProfileId
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Staff Management</h1>
        <Button onClick={openAddDialog}>Add Staff</Button>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load staff list. Check your connection and refresh.
        </div>
      )}

      {/* Tabs: Active / Pending */}
      {!fetchError && (
        <Tabs defaultValue="active" className="mt-6">
          <TabsList>
            <TabsTrigger value="active">
              Active
              {activeStaff.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {activeStaff.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingStaff.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {pendingStaff.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <StaffTable rows={activeStaff} />
          </TabsContent>

          <TabsContent value="pending">
            <div className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              These accounts are awaiting activation. Click the activate button to grant access, or delete to reject.
            </div>
            <StaffTable rows={pendingStaff} />
          </TabsContent>
        </Tabs>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Add Staff Dialog                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setAddDialogOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>

          <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 pt-2">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input placeholder="Dr. Ravi Sharma" {...addForm.register('full_name')} />
              {addForm.formState.errors.full_name && (
                <p className="text-xs text-red-500">{addForm.formState.errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <Input type="email" placeholder="staff@hospital.com" {...addForm.register('email')} />
              {addForm.formState.errors.email && (
                <p className="text-xs text-red-500">{addForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Temp Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Temporary Password <span className="text-red-500">*</span>
              </label>
              <Input type="password" placeholder="Min. 8 characters" {...addForm.register('temp_password')} />
              {addForm.formState.errors.temp_password && (
                <p className="text-xs text-red-500">{addForm.formState.errors.temp_password.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Role <span className="text-red-500">*</span>
              </label>
              <Select
                defaultValue={addForm.getValues('role')}
                onValueChange={(val) => addForm.setValue('role', val as 'admin' | 'doctor' | 'receptionist')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
              {addForm.formState.errors.role && (
                <p className="text-xs text-red-500">{addForm.formState.errors.role.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input placeholder="+91 98765 43210" {...addForm.register('phone')} />
            </div>

            {/* Salary */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Salary (monthly, INR)</label>
              <Input type="number" placeholder="30000" {...addForm.register('salary')} />
            </div>

            {/* Join Date */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Join Date</label>
              <Input type="date" {...addForm.register('join_date')} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} disabled={addSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSubmitting}>
                {addSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Add Staff'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Edit Staff Sheet                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={editSheetOpen} onOpenChange={(open) => { if (!open) closeEditSheet(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Staff Member</SheetTitle>
          </SheetHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input {...editForm.register('full_name')} />
              {editForm.formState.errors.full_name && (
                <p className="text-xs text-red-500">{editForm.formState.errors.full_name.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Role <span className="text-red-500">*</span>
              </label>
              <Select
                defaultValue={editForm.getValues('role')}
                onValueChange={(val) => editForm.setValue('role', val as 'admin' | 'doctor' | 'receptionist')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
              {editForm.formState.errors.role && (
                <p className="text-xs text-red-500">{editForm.formState.errors.role.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input placeholder="+91 98765 43210" {...editForm.register('phone')} />
            </div>

            {/* Salary */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Salary (monthly, INR)</label>
              <Input type="number" {...editForm.register('salary')} />
            </div>

            {/* Join Date */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Join Date</label>
              <Input type="date" {...editForm.register('join_date')} />
            </div>

            {/* Doctor Profile Link — shown only when editing a doctor-role staff */}
            {editingStaff && (editingStaff.role === 'doctor' || editForm.watch('role') === 'doctor') && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Doctor Profile</label>
                {(() => {
                  const watchedId = editForm.watch('doctor_id') ?? '';
                  const selectedDoc = doctors.find((d) => d.id === watchedId);
                  const displayLabel = selectedDoc
                    ? `${selectedDoc.full_name} — ${selectedDoc.specialization}`
                    : undefined;
                  return (
                    <Select
                      value={watchedId}
                      onValueChange={(val) => editForm.setValue('doctor_id', val || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link to doctor record (optional)">
                          {displayLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableDoctors(editingStaff.id).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.full_name} — {d.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
                <p className="text-xs text-slate-400">
                  Links this login to a doctor record on the public site.
                </p>
              </div>
            )}

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeEditSheet} disabled={editSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* Delete AlertDialog                                                  */}
      {/* ------------------------------------------------------------------ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>{deleteTarget?.full_name ?? deleteTarget?.email}</strong>&apos;s account.
              This action cannot be undone.
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
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
