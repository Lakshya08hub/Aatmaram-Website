'use client';
// components/portal/InlineEditCell.tsx
// Reusable click-to-edit table cell component.
// Renders a span in view mode; activates an Input on click.
// Ring states: blue (active), green (success flash 600ms), red (error).

import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InlineEditCellProps {
  value: string;
  onSave: (newValue: string) => Promise<{ error?: string }>;
  className?: string;
}

type RingState = 'idle' | 'saving' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineEditCell({ value, onSave, className }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [ringState, setRingState] = useState<RingState>('idle');

  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep localValue in sync when the server value changes (after router.refresh)
  useEffect(() => {
    if (!editing) {
      setLocalValue(value);
    }
  }, [value, editing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleSave() {
    if (localValue === value) {
      setEditing(false);
      return;
    }

    setRingState('saving');
    const result = await onSave(localValue);

    if (result.error) {
      setRingState('error');
      toast.error('Could not save — please try again.');
    } else {
      setRingState('success');
      setEditing(false);
      timeoutRef.current = setTimeout(() => setRingState('idle'), 600);
    }
  }

  if (editing) {
    const ringClass =
      ringState === 'success'
        ? 'ring-2 ring-green-500'
        : ringState === 'error'
        ? 'ring-2 ring-red-500'
        : 'ring-2 ring-blue-500';

    return (
      <Input
        ref={inputRef}
        autoFocus
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          } else if (e.key === 'Escape') {
            setLocalValue(value);
            setEditing(false);
            setRingState('idle');
          }
        }}
        className={cn(
          'h-7 px-1 py-0',
          ringClass,
          ringState === 'saving' && 'opacity-70',
          className
        )}
        disabled={ringState === 'saving'}
      />
    );
  }

  return (
    <div className="group inline-flex items-center cursor-text" onClick={() => { setEditing(true); }}>
      <span className={cn('hover:underline decoration-dotted', className)}>
        {value || <span className="text-slate-400 italic">—</span>}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground ml-1 inline opacity-0 group-hover:opacity-100" />
    </div>
  );
}
