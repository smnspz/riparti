import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SharedTripError, SharedTripView } from '@/components/SharedTripView'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useShareRoute } from '@/hooks/useShareRoute'
import { I18nProvider } from '@/i18n'
import { ThemeProvider } from '@/theme'

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
  const documentTitleKey =
    route.status === 'trip'
      ? 'shared.documentTitle'
      : route.status === 'invalid'
        ? 'shared.invalidDocumentTitle'
        : 'app.documentTitle'

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
            <App />
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
