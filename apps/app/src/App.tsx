import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { TripResult } from '@/core'
import { AppHeader } from '@/components/AppHeader'
import { LegEditor } from '@/components/LegEditor'
import { MapView } from '@/components/MapView'
import { PassengerList } from '@/components/PassengerList'
import { SettingsDialog } from '@/components/SettingsDialog'
import { TripResults } from '@/components/TripResults'
import { TripTotalBar } from '@/components/TripTotalBar'
import { UndoRedo } from '@/components/UndoRedo'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import type { Translate } from '@/i18n'
import { translateTripError } from '@/i18n/tripErrors'
import { calculateDraftTrip } from '@/lib/trip'
import { useTripStore } from '@/store/tripStore'
import type { LegDraft, PassengerDraft } from '@/types'
import '@/App.css'

/**
 * Build and calculate the trip from the current editor drafts.
 *
 * @param passengers - Passengers currently declared in the editor.
 * @param legs - Legs currently declared in the editor.
 * @param t - Translation function for the current language.
 * @returns The calculation result, or the validation message on failure.
 */
function computeTrip(
  passengers: PassengerDraft[],
  legs: LegDraft[],
  t: Translate,
): { result: TripResult | null; error: string | null } {
  try {
    return { result: calculateDraftTrip(passengers, legs), error: null }
  } catch (error) {
    return {
      result: null,
      error: translateTripError(error, t),
    }
  }
}

/**
 * Application shell wiring the trip editor, the map, and the calculator.
 *
 * The trip itself lives in the store, so this component only lays the pieces
 * out and keeps the example leg localized.
 *
 * @returns The Riparti single-page app.
 */
export default function App() {
  // Initializations
  const { language, t, formatDistanceKm } = useI18n()
  const passengers = useTripStore((state) => state.passengers)
  const legs = useTripStore((state) => state.legs)
  const addLeg = useTripStore((state) => state.addLeg)
  const clearLegs = useTripStore((state) => state.clearLegs)
  const localizeSeed = useTripStore((state) => state.localizeSeed)
  const routeSeedLeg = useTripStore((state) => state.routeSeedLeg)
  const retryFallbackRoutes = useTripStore((state) => state.retryFallbackRoutes)
  const resultsRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLElement>(null)
  const [resultsInView, setResultsInView] = useState(false)
  const [mapInView, setMapInView] = useState(true)

  // Show the phone total bar once the map has scrolled away
  useEffect(() => {
    const node = mapRef.current
    if (node === null) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMapInView(entry?.isIntersecting ?? false)
      },
      { threshold: 0.05 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Keep the phone total bar hidden once the result card is on screen
  useEffect(() => {
    const node = resultsRef.current
    if (node === null) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setResultsInView(entry?.isIntersecting ?? false)
      },
      { threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Route the example leg once, when it still needs a road route
  useEffect(() => {
    routeSeedLeg(formatDistanceKm)
  }, [routeSeedLeg, formatDistanceKm])

  // Re-localize the example leg when the language changes
  useEffect(() => {
    localizeSeed(language)
  }, [language, localizeSeed])

  const calculation = computeTrip(passengers, legs, t)
  const displayedLegs = legs
    .map((leg, index) => ({ leg, index }))
    .reverse()

  return (
    <div className="app-shell flex h-dvh flex-col bg-muted/40 max-md:h-auto max-md:min-h-svh md:overflow-hidden">
      <AppHeader title={t('app.editorTitle')}>
        <SettingsDialog />
      </AppHeader>

      <main className="app-main grid min-h-0 flex-1 grid-cols-[minmax(360px,430px)_1fr] max-md:grid-cols-1 md:grid-cols-[minmax(320px,340px)_1fr] lg:grid-cols-[minmax(360px,430px)_1fr]">
        <aside className="app-aside sidebar-scroll flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-md:order-2 max-md:overflow-visible [&>*]:shrink-0">
          <PassengerList />

          <section className="flex flex-col gap-3" aria-labelledby="legs-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="legs-title" className="font-heading text-base font-semibold">
                {t('legs.title')}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {legs.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearLegs}
                  >
                    <Trash2 />
                    {t('legs.clear')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={addLeg}
                  disabled={passengers.length === 0}
                >
                  <Plus />
                  {t('legs.add')}
                </Button>
              </div>
            </div>

            {passengers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('legs.needPassenger')}
              </p>
            )}

            {legs.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                {t('legs.empty')}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {displayedLegs.map(({ leg, index }) => (
                  <LegEditor key={leg.id} leg={leg} index={index} />
                ))}
              </div>
            )}
          </section>

          <div id="trip-results" ref={resultsRef} className="scroll-mt-4">
            <TripResults result={calculation.result} error={calculation.error} />
          </div>
        </aside>

        <section
          ref={mapRef}
          aria-labelledby="map-title"
          className="app-map relative isolate min-h-0 border-l max-md:order-1 max-md:h-[max(52svh,20rem)] max-md:border-b max-md:border-l-0"
        >
          <MapView
            legs={legs}
            onRetryFallbackRoutes={() => retryFallbackRoutes(formatDistanceKm)}
          />
          <div className="map-top-left absolute z-[1100]">
            <UndoRedo />
          </div>
        </section>
      </main>

      <TripTotalBar
        result={calculation.result}
        visible={!resultsInView && !mapInView}
        targetId="trip-results"
      />
    </div>
  )
}
