import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/** Theme choices exposed to the user. */
export type Theme = 'system' | 'light' | 'dark'

/** Colour scheme actually applied to the document. */
export type ResolvedTheme = 'light' | 'dark'

/** Local storage key holding the theme choice. */
const STORAGE_KEY = 'backseat.theme'

/** Theme used before the user makes a choice. */
const DEFAULT_THEME: Theme = 'system'

/** Media query matching a dark operating system preference. */
const DARK_PREFERENCE_QUERY = '(prefers-color-scheme: dark)'

/** Value exposed by the theme context. */
export interface ThemeContextValue {
  /** Theme chosen by the user. */
  theme: Theme
  /** Colour scheme currently applied, with `system` resolved. */
  resolvedTheme: ResolvedTheme
  /** Change the theme and persist the choice. */
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Read the theme saved in the browser.
 *
 * @returns The stored theme, or `system` when nothing valid is saved.
 */
function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  // Read the saved choice, ignoring unavailable storage
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // Storage can be unavailable in private browsing; keep the default
  }

  return DEFAULT_THEME
}

/**
 * Read the operating system colour scheme.
 *
 * @returns `dark` when the system prefers a dark scheme, otherwise `light`.
 */
function readSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia(DARK_PREFERENCE_QUERY).matches ? 'dark' : 'light'
}

/**
 * Resolve the theme chosen by the user into an applied colour scheme.
 *
 * @param theme - Theme chosen by the user.
 * @param systemTheme - Colour scheme currently preferred by the system.
 * @returns The colour scheme to apply to the document.
 */
function resolveTheme(theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme {
  return theme === 'system' ? systemTheme : theme
}

/**
 * Provide the colour scheme and keep the document in sync with it.
 *
 * @param children - React tree that can call `useTheme`.
 * @returns The theme context provider.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initializations
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(readSystemTheme)
  const resolvedTheme = resolveTheme(theme, systemTheme)

  /**
   * Change the theme and remember it for the next visit.
   *
   * @param nextTheme - Theme to apply.
   * @returns Nothing. Updates state and local storage.
   */
  function setTheme(nextTheme: Theme): void {
    setThemeState(nextTheme)
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch {
      // Storage can fail; the choice still applies to this session
    }
  }

  // Follow the operating system while the system theme is selected
  useEffect(() => {
    const preference = window.matchMedia(DARK_PREFERENCE_QUERY)

    function handleChange(event: MediaQueryListEvent): void {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    preference.addEventListener('change', handleChange)
    return () => preference.removeEventListener('change', handleChange)
  }, [])

  // Apply the resolved scheme so Tailwind's dark variant matches
  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      resolvedTheme === 'dark',
    )
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  // Expose the current theme and the action that changes it
  const value: ThemeContextValue = { theme, resolvedTheme, setTheme }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Access the current colour scheme and the action that changes it.
 *
 * @returns The current theme context.
 * @throws {Error} If used outside `ThemeProvider`.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
