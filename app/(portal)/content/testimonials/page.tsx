// app/(portal)/content/testimonials/page.tsx
// Server Component — fetches testimonials from Supabase and passes to TestimonialsClient.
// Auth + section-level role guard enforced here (CR-005).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffRole, canAccessSection } from '@/lib/portal/roles';
import { getTestimonials, Testimonial } from '@/lib/db/testimonials';
import TestimonialsClient from './TestimonialsClient';

export default async function TestimonialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || !canAccessSection(profile.role as StaffRole, 'content')) {
    redirect('/dashboard');
  }

  let testimonials: Testimonial[] = [];
  let fetchError = false;

  try {
    testimonials = await getTestimonials();
  } catch {
    fetchError = true;
  }

  return (
    <TestimonialsClient initialData={testimonials} fetchError={fetchError} />
  );
}
