import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { calculateTrip } from '@/core'
import type { TripResult } from '@/core'
import { LegEditor } from '@/components/LegEditor'
import { MapView } from '@/components/MapView'
import { PassengerList } from '@/components/PassengerList'
import { SettingsDialog } from '@/components/SettingsDialog'
import { TripResults } from '@/components/TripResults'
import { UndoRedo } from '@/components/UndoRedo'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import type { Translate } from '@/i18n'
import { translateTripError } from '@/i18n/tripErrors'
import { buildTrip } from '@/lib/trip'
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
    return { result: calculateTrip(buildTrip(passengers, legs)), error: null }
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
 * @returns The Backseat single-page app.
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

  // Route the example leg once, when it still needs a road route
  useEffect(() => {
    routeSeedLeg(formatDistanceKm)
  }, [routeSeedLeg, formatDistanceKm])

  // Re-localize the example leg when the language changes
  useEffect(() => {
    localizeSeed(language)
  }, [language, localizeSeed])

  const calculation = computeTrip(passengers, legs, t)

  return (
    <div className="flex h-dvh flex-col bg-muted/40 max-md:h-auto max-md:min-h-svh md:overflow-hidden">
      <h1 className="sr-only">Backseat</h1>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(360px,430px)_1fr] max-md:grid-cols-1">
        <aside className="sidebar-scroll flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain p-5 max-md:order-2 max-md:overflow-visible [&>*]:shrink-0">
          <PassengerList />

          <section className="flex flex-col gap-3" aria-labelledby="legs-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="legs-title" className="font-heading text-base font-semibold">
                {t('legs.title')}
              </h2>
              <div className="flex items-center gap-2">
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
                {legs.map((leg, index) => (
                  <LegEditor key={leg.id} leg={leg} index={index} />
                ))}
              </div>
            )}
          </section>

          <TripResults result={calculation.result} error={calculation.error} />
        </aside>

        <section className="relative isolate min-h-0 border-l max-md:order-1 max-md:h-[52svh] max-md:border-b max-md:border-l-0">
          <MapView legs={legs} />
          <div className="absolute top-3 left-3 z-[1100]">
            <UndoRedo />
          </div>
          <div className="absolute top-3 right-3 z-[1100]">
            <SettingsDialog />
          </div>
        </section>
      </main>
    </div>
  )
}
