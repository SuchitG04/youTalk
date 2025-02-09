"use client"

import { ThemeProvider } from "next-themes"
import type React from "react" // Added import for React

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  )
}

