"use client"
// components/portal/theme-provider.tsx
// Thin client wrapper around next-themes ThemeProvider. Mounted ONLY in the portal
// layout (app/(portal)/layout.tsx) so dark mode never reaches the public site.

import type { ComponentProps } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>
) {
  return <NextThemesProvider {...props} />
}
