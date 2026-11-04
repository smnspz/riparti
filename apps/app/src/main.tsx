import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { LoaderCircle } from 'lucide-react'
import './index.css'
import { AppHeader } from '@/components/AppHeader'
import { SharedTripError, SharedTripView } from '@/components/SharedTripView'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useShareRoute } from '@/hooks/useShareRoute'
import { I18nProvider, useI18n } from '@/i18n'
import type { TranslationKey } from '@/i18n'
import type { ShareRoute, SharedTrip } from '@/lib/shareLink'
import { calculateDraftTrip } from '@/lib/trip'
import { ThemeProvider } from '@/theme'

/** Editor loaded only when the URL does not address a shared trip. */
const App = lazy(() => import('./App'))

/**
 * Check whether a shared trip can be calculated.
 *
 * @param trip - Trip decoded from the share link.
 * @returns True when the summary can show its totals.
 */
function canShowSharedTrip(trip: SharedTrip): boolean {
  try {
    calculateDraftTrip(trip.passengers, trip.legs)
    return true
  } catch {
    // A link can decode but still carry values the calculator rejects
    return false
  }
}

/**
 * Pick the document title that matches the page addressed by the URL.
 *
 * @param route - Share route read from the URL hash.
 * @returns The translation key for the document title.
 */
function documentTitleFor(route: ShareRoute): TranslationKey {
  if (route.status === 'trip') {
    return canShowSharedTrip(route.trip)
      ? 'shared.documentTitle'
      : 'shared.invalidTripDocumentTitle'
  }
  if (route.status === 'invalid') {
    return 'shared.invalidDocumentTitle'
  }
  return 'app.documentTitle'
}

/**
 * Shell shown while the editor chunk downloads.
 *
 * @returns The editor header and a loading status.
 */
function EditorLoading() {
  // Initializations
  const { t } = useI18n()

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <AppHeader title={t('app.editorTitle')} />
      <div
        role="status"
        className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <LoaderCircle
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
        />
        {t('app.loading')}
      </div>
    </div>
  )
}

/**
 * Choose the editor or the read-only summary addressed by the URL.
 *
 * @returns The matching page for the current share route.
 */
function Root() {
  // Initializations
  const route = useShareRoute()
  const forcedLanguage =
    route.status === 'trip' ? route.trip.language : undefined
  const documentTitleKey = documentTitleFor(route)

  // Keep the shared trip in the language it was created in
  return (
    <ThemeProvider>
      <I18nProvider
        language={forcedLanguage}
        documentTitleKey={documentTitleKey}
      >
        <TooltipProvider delayDuration={400}>
          {route.status === 'trip' ? (
            <SharedTripView trip={route.trip} />
          ) : route.status === 'invalid' ? (
            <SharedTripError />
          ) : (
            <Suspense fallback={<EditorLoading />}>
              <App />
            </Suspense>
          )}
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
