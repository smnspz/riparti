import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  formatDistanceKm as formatDistanceKmForLanguage,
  formatEuros as formatEurosForLanguage,
  formatLiters as formatLitersForLanguage,
} from '@/lib/format'
import {
  messages,
  translate,
  type Language,
  type Translate,
} from './messages'

/** Local storage key holding the selected language. */
const STORAGE_KEY = 'backseat.language'

/** Language used before the user makes a choice. */
const DEFAULT_LANGUAGE: Language = 'it'

/** Value exposed by the i18n context. */
export interface I18nContextValue {
  /** Language currently shown in the UI. */
  language: Language
  /** Change the UI language and persist the choice. */
  setLanguage: (language: Language) => void
  /** Translate a key with optional interpolation parameters. */
  t: Translate
  /** Format integer cents in the current language. */
  formatEuros: (cents: number) => string
  /** Format a distance in the current language. */
  formatDistanceKm: (km: number) => string
  /** Format a fuel volume in the current language. */
  formatLiters: (liters: number) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

/**
 * Read the persisted language, falling back to Italian.
 *
 * @returns The stored or default language.
 */
function readStoredLanguage(): Language {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  // Read the saved choice, ignoring unavailable storage
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'it' || stored === 'en') {
      return stored
    }
  } catch {
    // Storage can be unavailable in private browsing; keep the default
  }

  return DEFAULT_LANGUAGE
}

/**
 * Provide translations and locale-aware formatters to the app.
 *
 * @param children - React tree that can call `useI18n`.
 * @returns The i18n context provider.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  // Initializations
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)

  /**
   * Change the language and remember it for the next visit.
   *
   * @param nextLanguage - Language to show in the UI.
   * @returns Nothing. Updates state and local storage.
   */
  function setLanguage(nextLanguage: Language): void {
    setLanguageState(nextLanguage)
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage)
    } catch {
      // Storage can fail; the choice still applies to this session
    }
  }

  // Keep the document metadata in sync with the selected language
  useEffect(() => {
    document.documentElement.lang = language
    document.title = messages[language]['app.documentTitle']
  }, [language])

  // Expose translations and formatters bound to the current language
  const value: I18nContextValue = {
    language,
    setLanguage,
    t: (key, params) => translate(language, key, params),
    formatEuros: (cents) => formatEurosForLanguage(cents, language),
    formatDistanceKm: (km) => formatDistanceKmForLanguage(km, language),
    formatLiters: (liters) => formatLitersForLanguage(liters, language),
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Access translations and locale-aware formatters.
 *
 * @returns The current i18n context.
 * @throws {Error} If used outside `I18nProvider`.
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (context === null) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
