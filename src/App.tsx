import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { calculateTrip } from '@/core'
import type { TripResult } from '@/core'
import { LegEditor } from '@/components/LegEditor'
import { MapView } from '@/components/MapView'
import { PassengerList } from '@/components/PassengerList'
import { SettingsDialog } from '@/components/SettingsDialog'
import { TripResults } from '@/components/TripResults'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import type { Language, Translate } from '@/i18n'
import { translateTripError } from '@/i18n/tripErrors'
import { formatDistanceKm as formatDistanceKmForLanguage } from '@/lib/format'
import { haversineKm, type LatLng } from '@/lib/geo'
import { fetchRoadRoutes, type RoutePreference } from '@/lib/routing'
import { buildTrip } from '@/lib/trip'
import type { LegDraft, PassengerDraft } from '@/types'
import '@/App.css'

/** Default passengers shown on first load. */
const SEED_PASSENGERS: PassengerDraft[] = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'carol', name: 'Carol' },
]

/** Start of the example route. */
const ROME: LatLng = { lat: 41.9028, lng: 12.4964 }

/** End of the example route. */
const FLORENCE: LatLng = { lat: 43.7696, lng: 11.2558 }

/** Identifier of the example leg shown on first load. */
const SEED_LEG_ID = 'seed-leg'

/** Localized labels for the example route. */
const SEED_LABELS: Record<Language, { start: string; end: string }> = {
  it: { start: 'Roma', end: 'Firenze' },
  en: { start: 'Rome', end: 'Florence' },
}

/**
 * Build the example leg shown on first load so the map and results are not
 * empty.
 *
 * @param language - Language used for the city labels.
 * @returns A leg from Rome to Florence.
 */
function createSeedLeg(language: Language): LegDraft {
  // Initializations
  const labels = SEED_LABELS[language]

  // Return the example leg
  return {
    id: SEED_LEG_ID,
    start: ROME,
    startLabel: labels.start,
    end: FLORENCE,
    endLabel: labels.end,
    route: null,
    routeOptions: [],
    routePreference: null,
    routeStatus: 'loading',
    distanceKm: formatDistanceKmForLanguage(
      haversineKm(ROME, FLORENCE),
      language,
    ),
    fuelConsumption: '6.5',
    fuelPriceEuros: '1.89',
    tollsEuros: '15.00',
    roundTrip: false,
    passengerIds: ['alice', 'bob'],
  }
}

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
 * @returns The Backseat single-page app.
 */
export default function App() {
  // Initializations
  const { language, t, formatDistanceKm } = useI18n()
  const [passengers, setPassengers] =
    useState<PassengerDraft[]>(SEED_PASSENGERS)
  const [legs, setLegs] = useState<LegDraft[]>(() => [
    createSeedLeg(language),
  ])
  const routeRequestIds = useRef(new Map<string, number>())
  const hasRoutedSeed = useRef(false)

  // Route the example leg once so the map starts on roads
  useEffect(() => {
    if (hasRoutedSeed.current) {
      return
    }
    hasRoutedSeed.current = true
    void requestRoute(SEED_LEG_ID, ROME, FLORENCE)
  }, [])

  // Re-localize the example leg when the language changes
  useEffect(() => {
    setLegs((currentLegs) =>
      currentLegs.map((leg) => {
        const isSeedRoute =
          leg.id === SEED_LEG_ID && leg.start === ROME && leg.end === FLORENCE
        if (!isSeedRoute) {
          return leg
        }

        const labels = SEED_LABELS[language]
        return { ...leg, startLabel: labels.start, endLabel: labels.end }
      }),
    )
  }, [language])

  const calculation = computeTrip(passengers, legs, t)

  /**
   * Fetch the road routes for a leg and store the geometry and options.
   *
   * Only the latest request for a leg is applied, so quickly changing the
   * searched places cannot leave an older route on screen.
   *
   * @param legId - Identifier of the leg to route.
   * @param start - Start point used for the request.
   * @param end - End point used for the request.
   * @returns Nothing. Resolves after the editor state has been updated.
   */
  async function requestRoute(
    legId: string,
    start: LatLng,
    end: LatLng,
  ): Promise<void> {
    // Track this request as the latest one for the leg
    const requestId = (routeRequestIds.current.get(legId) ?? 0) + 1
    routeRequestIds.current.set(legId, requestId)
    handleChangeLeg(legId, { routeStatus: 'loading' })

    try {
      // Ask Valhalla for the fastest and toll-free routes
      const options = await fetchRoadRoutes(start, end)
      if (routeRequestIds.current.get(legId) !== requestId) {
        return
      }

      // Show the fastest route and keep every option for the picker
      const selected = options[0]
      if (selected === undefined) {
        return
      }

      setLegs((currentLegs) =>
        currentLegs.map((leg) =>
          leg.id === legId && leg.start === start && leg.end === end
            ? {
                ...leg,
                route: selected.points,
                routeOptions: options,
                routePreference: selected.preference,
                routeStatus: 'ready',
                distanceKm: formatDistanceKm(selected.distanceKm),
              }
            : leg,
        ),
      )
    } catch {
      if (routeRequestIds.current.get(legId) !== requestId) {
        return
      }

      // Fall back to the straight line already drawn between the endpoints
      setLegs((currentLegs) =>
        currentLegs.map((leg) =>
          leg.id === legId && leg.start === start && leg.end === end
            ? {
                ...leg,
                route: null,
                routeOptions: [],
                routePreference: null,
                routeStatus: 'error',
              }
            : leg,
        ),
      )
    }
  }

  /**
   * Apply a partial update to one leg.
   *
   * @param legId - Identifier of the leg to update.
   * @param patch - Fields to replace on the leg.
   * @returns Nothing. Updates the editor state.
   */
  function handleChangeLeg(legId: string, patch: Partial<LegDraft>): void {
    setLegs((currentLegs) =>
      currentLegs.map((leg) =>
        leg.id === legId ? { ...leg, ...patch } : leg,
      ),
    )
  }

  /**
   * Append an empty leg and reuse the last leg's fuel settings.
   *
   * @returns Nothing. Updates the editor state.
   */
  function handleAddLeg(): void {
    if (passengers.length === 0) {
      return
    }

    // Reuse the first leg's fuel settings as a sensible default
    const template = legs.at(0)
    const leg: LegDraft = {
      id: crypto.randomUUID(),
      start: null,
      startLabel: '',
      end: null,
      endLabel: '',
      route: null,
      routeOptions: [],
      routePreference: null,
      routeStatus: 'idle',
      distanceKm: '',
      fuelConsumption: template?.fuelConsumption ?? '6.5',
      fuelPriceEuros: template?.fuelPriceEuros ?? '1.89',
      tollsEuros: '0.00',
      roundTrip: false,
      passengerIds: passengers.map((passenger) => passenger.id),
    }

    // Prepend the leg so it appears above the existing ones
    setLegs((currentLegs) => [leg, ...currentLegs])
  }

  /**
   * Remove a leg from the trip.
   *
   * @param legId - Identifier of the leg to remove.
   * @returns Nothing. Updates the editor state.
   */
  function handleRemoveLeg(legId: string): void {
    setLegs((currentLegs) => currentLegs.filter((leg) => leg.id !== legId))
  }

  /**
   * Remove every leg.
   *
   * @returns Nothing. Updates the editor state.
   */
  function handleClearLegs(): void {
    setLegs([])
  }

  /**
   * Add a passenger with a unique name.
   *
   * @param name - Trimmed, unique passenger name.
   * @returns Nothing. Updates the editor state.
   */
  function handleAddPassenger(name: string): void {
    setPassengers((currentPassengers) => [
      ...currentPassengers,
      { id: crypto.randomUUID(), name },
    ])
  }

  /**
   * Remove a passenger from the trip and from every leg.
   *
   * @param passengerId - Identifier of the passenger to remove.
   * @returns Nothing. Updates the editor state.
   */
  function handleRemovePassenger(passengerId: string): void {
    setPassengers((currentPassengers) =>
      currentPassengers.filter((passenger) => passenger.id !== passengerId),
    )
    setLegs((currentLegs) =>
      currentLegs.map((leg) => ({
        ...leg,
        passengerIds: leg.passengerIds.filter((id) => id !== passengerId),
      })),
    )
  }

  /**
   * Replace the passengers present on a leg.
   *
   * @param legId - Identifier of the leg to update.
   * @param passengerIds - Identifiers selected for the leg.
   * @returns Nothing. Updates the editor state.
   */
  function handleChangePassengers(
    legId: string,
    passengerIds: string[],
  ): void {
    handleChangeLeg(legId, { passengerIds })
  }

  /**
   * Set one endpoint of a leg from a place search.
   *
   * Updates the displayed distance immediately, clears the old geometry, and
   * requests the road route when the other endpoint is already known.
   *
   * @param legId - Identifier of the leg to update.
   * @param field - Whether the start or the end changes.
   * @param point - New coordinates of the endpoint.
   * @param label - Display label for the endpoint.
   * @returns Nothing. Updates the editor state.
   */
  function handleEndpointChange(
    legId: string,
    field: 'start' | 'end',
    point: LatLng,
    label: string,
  ): void {
    const leg = legs.find((candidate) => candidate.id === legId)
    if (leg === undefined) {
      return
    }

    const otherPoint = field === 'start' ? leg.end : leg.start
    let distanceKm = leg.distanceKm
    if (otherPoint !== null) {
      distanceKm =
        field === 'start'
          ? formatDistanceKm(haversineKm(point, otherPoint))
          : formatDistanceKm(haversineKm(otherPoint, point))
    }

    const endpoint =
      field === 'start'
        ? { start: point, startLabel: label }
        : { end: point, endLabel: label }

    handleChangeLeg(legId, {
      ...endpoint,
      distanceKm,
      route: null,
      routeOptions: [],
      routePreference: null,
      routeStatus: otherPoint === null ? 'idle' : 'loading',
    })

    if (otherPoint !== null) {
      void requestRoute(
        legId,
        field === 'start' ? point : otherPoint,
        field === 'start' ? otherPoint : point,
      )
    }
  }

  /**
   * Set an endpoint from a place chosen in the search field.
   *
   * @param legId - Identifier of the leg to update.
   * @param field - Whether the start or the end changes.
   * @param point - Coordinates of the chosen place.
   * @param label - Display label of the chosen place.
   * @returns Nothing. Updates the editor state.
   */
  function handleSelectPlace(
    legId: string,
    field: 'start' | 'end',
    point: LatLng,
    label: string,
  ): void {
    handleEndpointChange(legId, field, point, label)
  }

  /**
   * Switch a leg to one of its computed route options.
   *
   * Choosing the toll-free route clears the toll amount, since that route
   * avoids toll roads by construction.
   *
   * @param legId - Identifier of the leg to update.
   * @param preference - Route option to show.
   * @returns Nothing. Updates the editor state.
   */
  function handleSelectRoute(
    legId: string,
    preference: RoutePreference,
  ): void {
    setLegs((currentLegs) =>
      currentLegs.map((leg) => {
        if (leg.id !== legId) {
          return leg
        }

        const option = leg.routeOptions.find(
          (route) => route.preference === preference,
        )
        if (option === undefined) {
          return leg
        }

        return {
          ...leg,
          route: option.points,
          routePreference: option.preference,
          distanceKm: formatDistanceKm(option.distanceKm),
          tollsEuros:
            option.preference === 'no-tolls' ? '0.00' : leg.tollsEuros,
        }
      }),
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-muted/40 max-md:h-auto max-md:min-h-dvh">
      <header className="flex items-center justify-between gap-3 border-b bg-background px-5 py-4">
        <div className="flex flex-col">
          <h1 className="font-heading text-xl font-semibold tracking-tight">Backseat</h1>
          <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsDialog />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(360px,430px)_1fr] max-md:grid-cols-1">
        <aside className="sidebar-scroll flex min-h-0 flex-col gap-5 overflow-y-auto p-5 max-md:order-2 max-md:overflow-visible [&>*]:shrink-0">
          <PassengerList
            passengers={passengers}
            onAdd={handleAddPassenger}
            onRemove={handleRemovePassenger}
          />

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
                    onClick={handleClearLegs}
                  >
                    <Trash2 />
                    {t('legs.clear')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddLeg}
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
                  <LegEditor
                    key={leg.id}
                    leg={leg}
                    index={index}
                    passengers={passengers}
                    onChange={handleChangeLeg}
                    onRemove={handleRemoveLeg}
                    onSelectPlace={handleSelectPlace}
                    onSelectRoute={handleSelectRoute}
                    onChangePassengers={handleChangePassengers}
                  />
                ))}
              </div>
            )}
          </section>

          <TripResults
            legs={legs}
            result={calculation.result}
            error={calculation.error}
          />
        </aside>

        <section className="relative isolate min-h-0 border-l max-md:order-1 max-md:h-[52dvh] max-md:border-b max-md:border-l-0">
          <MapView legs={legs} />
        </section>
      </main>
    </div>
  )
}
