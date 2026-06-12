// app/login/page.tsx
// Login page — placed OUTSIDE (portal) route group to prevent redirect loop (Pitfall 2).
// D-12: already-authenticated users are redirected to /dashboard.
// T-04-11 mitigation: page is at top-level app/login/, never touched by the portal auth guard.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/portal/LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // D-12: redirect already-authenticated users away from the login page
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="w-full flex items-center justify-center px-4 py-16">
      <LoginForm />
    </div>
  )
}
