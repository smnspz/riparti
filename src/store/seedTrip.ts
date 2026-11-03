import type { Language } from '@/i18n'
import { formatDistanceKm } from '@/lib/format'
import { haversineKm, type LatLng } from '@/lib/geo'
import type { LegDraft, PassengerDraft } from '@/types'

/** Passengers shown on first load. */
export const SEED_PASSENGERS: PassengerDraft[] = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'carol', name: 'Carol' },
]

/** Start of the example route. */
export const SEED_START: LatLng = { lat: 41.9028, lng: 12.4964 }

/** End of the example route. */
export const SEED_END: LatLng = { lat: 43.7696, lng: 11.2558 }

/** Identifier of the example leg shown on first load. */
export const SEED_LEG_ID = 'seed-leg'

/** Localized labels for the example route. */
export const SEED_LABELS: Record<Language, { start: string; end: string }> = {
  it: { start: 'Roma', end: 'Firenze' },
  en: { start: 'Rome', end: 'Florence' },
}

/**
 * Build the example leg shown on first load so the map and results are not
 * empty.
 *
 * @param language - Language used for the city labels.
 * @returns A leg from Rome to Florence, still waiting for its road route.
 */
export function createSeedLeg(language: Language): LegDraft {
  // Initializations
  const labels = SEED_LABELS[language]

  // Return the example leg
  return {
    id: SEED_LEG_ID,
    start: SEED_START,
    startLabel: labels.start,
    end: SEED_END,
    endLabel: labels.end,
    route: null,
    routeOptions: [],
    routePreference: null,
    routeStatus: 'loading',
    distanceKm: formatDistanceKm(haversineKm(SEED_START, SEED_END), language),
    fuelConsumption: '6.5',
    fuelPriceEuros: '1.89',
    tollsEuros: '15.00',
    roundTrip: false,
    passengerIds: ['alice', 'bob'],
  }
}

/**
 * Check whether a point is the given seed endpoint.
 *
 * Coordinates are compared by value because a leg restored from storage holds
 * fresh objects rather than the seed constants.
 *
 * @param point - Point stored on the leg, if any.
 * @param seed - Seed endpoint to compare against.
 * @returns True when both points hold the same coordinates.
 */
function isSamePoint(point: LatLng | null, seed: LatLng): boolean {
  return point !== null && point.lat === seed.lat && point.lng === seed.lng
}

/**
 * Check whether a leg is still the untouched example route.
 *
 * @param leg - Leg to inspect.
 * @returns True when the leg is the seed leg with its original endpoints.
 */
export function isSeedLeg(leg: LegDraft): boolean {
  return (
    leg.id === SEED_LEG_ID &&
    isSamePoint(leg.start, SEED_START) &&
    isSamePoint(leg.end, SEED_END)
  )
}
