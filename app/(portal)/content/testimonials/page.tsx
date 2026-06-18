// app/(portal)/content/testimonials/page.tsx
// Server Component — fetches testimonials from Supabase and passes to TestimonialsClient.
// Auth + role guard is enforced by the parent portal content layout.

import { getTestimonials, Testimonial } from '@/lib/db/testimonials';
import TestimonialsClient from './TestimonialsClient';

export default async function TestimonialsPage() {
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
