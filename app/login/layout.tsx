// Minimal shell for the /login route.
// Root layout (app/layout.tsx) returns children-only with no html/body.
// This layout provides the required html/body shell for the login segment.
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center">
        {children}
      </body>
    </html>
  )
}
