"use client"
// components/portal/theme-toggle.tsx
// Sidebar dark-mode toggle. SSR-safe via a mounted guard (next-themes standard) to
// avoid hydration mismatch. Toggles between light and dark; 44px min hit area.

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="min-h-[44px] min-w-[44px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Until mounted, render a stable neutral icon to avoid hydration mismatch. */}
      {mounted && isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
