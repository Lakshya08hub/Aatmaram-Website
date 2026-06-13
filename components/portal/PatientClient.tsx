'use client';
// components/portal/PatientClient.tsx
// Client Component — Patient Records list + Add/Edit Sheet with role-aware fields.
// Receptionist/Admin/Super Admin: full CRUD except clinical_notes.
// Doctor: read-only view of assigned records + editable clinical_notes textarea.

import { useState, useEffect, useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { PatientRecord } from '@/lib/db/patient_records';
import { StaffRole } from '@/lib/portal/roles';
import {
  createPatientAction,
  updatePatientAction,
  updateClinicalNotesAction,
} from '@/app/(portal)/actions/patients';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientClientProps {
  records: PatientRecord[];
  doctors: { id: string; full_name: string }[];
  role: StaffRole;
  currentUserId: string;
  fetchError?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Receptionist/Admin Sheet Form
// ---------------------------------------------------------------------------

function ReceptionistSheetForm({
  editingRecord,
  doctors,
  onSuccess,
  onClose,
}: {
  editingRecord: PatientRecord | null;
  doctors: { id: string; full_name: string }[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const isEdit = editingRecord !== null;

  const boundAction = isEdit
    ? updatePatientAction.bind(null, editingRecord!.id)
    : createPatientAction;

  const [state, formAction, isPending] = useActionState(boundAction, {});
  const [submitted, setSubmitted] = useState(false);

  // Move all side-effects into useEffect — calling setState/toast in render body
  // throws "Cannot update a component while rendering a different component" in React 19.
  useEffect(() => {
    if (!submitted || isPending) return;
    if (state?.error) {
      toast.error(state.error);
    } else {
      toast.success(isEdit ? 'Record updated' : 'Patient record added');
      setSubmitted(false);
      onSuccess();
    }
  }, [state, isPending, submitted]);

  const [assignedDoctor, setAssignedDoctor] = useState<string>(
    editingRecord !== null && editingRecord.assigned_doctor_id !== null
      ? editingRecord.assigned_doctor_id
      : ''
  );

  return (
    <form
      action={(fd) => {
        setSubmitted(true);
        formAction(fd);
      }}
      className="space-y-4 pt-4"
    >
      {/* Patient Name */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">
          Patient Name <span className="text-red-500">*</span>
        </label>
        <Input
          name="patient_name"
          placeholder="Full name"
          defaultValue={editingRecord?.patient_name ?? ''}
          required
        />
      </div>

      {/* Age */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">
          Age <span className="text-red-500">*</span>
        </label>
        <Input
          name="age"
          type="number"
          placeholder="Age in years"
          min={0}
          max={120}
          defaultValue={editingRecord?.age ?? ''}
          required
        />
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">
          Phone <span className="text-red-500">*</span>
        </label>
        <Input
          name="phone"
          placeholder="+91 98765 43210"
          defaultValue={editingRecord?.phone ?? ''}
          required
        />
      </div>

      {/* Reason */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">
          Reason for Visit <span className="text-red-500">*</span>
        </label>
        <Input
          name="reason"
          placeholder="Chief complaint or reason"
          defaultValue={editingRecord?.reason ?? ''}
          required
        />
      </div>

      {/* Assigned Doctor */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Assigned Doctor</label>
        {/* Hidden input carries the value for FormData */}
        <input type="hidden" name="assigned_doctor_id" value={assignedDoctor} />
        <Select
          value={assignedDoctor}
          onValueChange={(val) => setAssignedDoctor(val ?? '')}
        >
          <SelectTrigger>
            <SelectValue placeholder="None / Unassigned">
              {assignedDoctor
                ? (doctors.find((d) => d.id === assignedDoctor)?.full_name ?? assignedDoctor)
                : 'None / Unassigned'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None / Unassigned</SelectItem>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visit Date */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">
          Visit Date <span className="text-red-500">*</span>
        </label>
        <Input
          name="visit_date"
          type="date"
          defaultValue={editingRecord?.visit_date ?? todayISO()}
          required
        />
      </div>

      {/* Error */}
      {state?.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}

      <SheetFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {isEdit ? 'Discard Changes' : 'Discard'}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? 'Saving…' : 'Adding…'}
            </>
          ) : isEdit ? (
            'Save Changes'
          ) : (
            'Add Patient'
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Doctor Sheet Form (clinical notes only)
// ---------------------------------------------------------------------------

function DoctorSheetForm({
  editingRecord,
  onSuccess,
  onClose,
}: {
  editingRecord: PatientRecord;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const boundAction = updateClinicalNotesAction.bind(null, editingRecord.id);
  const [state, formAction, isPending] = useActionState(boundAction, {});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted || isPending) return;
    if (state?.error) {
      toast.error(state.error);
    } else {
      toast.success('Notes saved');
      setSubmitted(false);
      onSuccess();
    }
  }, [state, isPending, submitted]);

  return (
    <form
      action={(fd) => {
        setSubmitted(true);
        formAction(fd);
      }}
      className="space-y-4 pt-4"
    >
      {/* Read-only patient info */}
      <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
        <ReadOnlyField label="Patient Name" value={editingRecord.patient_name} />
        <ReadOnlyField label="Age" value={String(editingRecord.age)} />
        <ReadOnlyField label="Phone" value={editingRecord.phone} />
        <ReadOnlyField label="Reason for Visit" value={editingRecord.reason} />
        <ReadOnlyField
          label="Visit Date"
          value={formatDate(editingRecord.visit_date)}
        />
        <ReadOnlyField
          label="Assigned Doctor"
          value={editingRecord.assigned_doctor_name}
        />
      </div>

      {/* Clinical Notes textarea */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Clinical Notes</label>
        <Textarea
          name="clinical_notes"
          placeholder="Medications prescribed, treatment notes, follow-up instructions…"
          rows={6}
          className="resize-none"
          defaultValue={editingRecord.clinical_notes ?? ''}
        />
        <p className="text-xs text-slate-400">
          Only you can edit this field. Changes save immediately on Submit.
        </p>
      </div>

      {state?.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}

      <SheetFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Close
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Notes'
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PatientClient({
  records,
  doctors,
  role,
  currentUserId: _currentUserId,
  fetchError = false,
}: PatientClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PatientRecord | null>(null);

  const isDoctor = role === 'doctor';

  // Client-side filtering
  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.patient_name.toLowerCase().includes(q) || r.phone.includes(search);
  });

  function openAdd() {
    setEditingRecord(null);
    setSheetOpen(true);
  }

  function openEdit(record: PatientRecord) {
    setEditingRecord(record);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingRecord(null);
  }

  function handleSuccess() {
    closeSheet();
    startTransition(() => {
      router.refresh();
    });
  }

  // Determine sheet title
  function sheetTitle(): string {
    if (isDoctor) return 'Add Clinical Notes';
    return editingRecord ? 'Edit Patient Record' : 'Add Patient Record';
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Patient Records</h1>
        {!isDoctor && (
          <Button onClick={openAdd}>Add Patient</Button>
        )}
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load patient records. Check your connection and refresh.
        </div>
      )}

      {!fetchError && (
        <>
          {/* Search input */}
          <div className="mt-4">
            <Input
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Empty state — no records at all */}
          {records.length === 0 && (
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              {isDoctor ? (
                <p className="text-sm text-slate-500">No patients assigned to you yet.</p>
              ) : (
                <>
                  <p className="text-sm text-slate-500">No patient records yet.</p>
                  <p className="text-xs text-slate-400">Add a new patient record to get started.</p>
                </>
              )}
            </div>
          )}

          {/* Empty state — search miss */}
          {records.length > 0 && filteredRecords.length === 0 && search !== '' && (
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500">No records match your search.</p>
              <p className="text-xs text-slate-400">Try a different name or phone number.</p>
            </div>
          )}

          {/* Table */}
          {filteredRecords.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.patient_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.age}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">{record.phone}</TableCell>
                      <TableCell className="text-slate-500">
                        {truncate(record.reason, 40)}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {record.assigned_doctor_name ?? (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(record.visit_date)}
                      </TableCell>
                      <TableCell>
                        {record.clinical_notes ? (
                          <Badge variant="secondary">Added</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={
                            isDoctor
                              ? `Add notes for ${record.patient_name}`
                              : `Edit ${record.patient_name}`
                          }
                          onClick={() => openEdit(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetTitle()}</SheetTitle>
          </SheetHeader>

          {sheetOpen && isDoctor && editingRecord && (
            <DoctorSheetForm
              editingRecord={editingRecord}
              onSuccess={handleSuccess}
              onClose={closeSheet}
            />
          )}

          {sheetOpen && !isDoctor && (
            <ReceptionistSheetForm
              editingRecord={editingRecord}
              doctors={doctors}
              onSuccess={handleSuccess}
              onClose={closeSheet}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
