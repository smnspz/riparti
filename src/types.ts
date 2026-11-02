import type { LatLng } from './lib/geo'
import type { RoadRoute, RoutePreference } from './lib/routing'

/**
 * A passenger as edited in the UI, before conversion to the calculator types.
 */
export interface PassengerDraft {
  /** Stable identifier referenced by legs. */
  id: string
  /** Display name shown in the editor. */
  name: string
}

/**
 * State of the road routing request for a leg.
 */
export type RouteStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * A leg as edited in the UI. Numeric fields stay as strings so partially typed
 * values are preserved, and euro fields are converted to cents at calculation.
 */
export interface LegDraft {
  /** Stable identifier used for React keys and updates. */
  id: string
  /** Start point picked on the map, if any. */
  start: LatLng | null
  /** Display label of the start point, from search or coordinates. */
  startLabel: string
  /** End point picked on the map, if any. */
  end: LatLng | null
  /** Display label of the end point, from search or coordinates. */
  endLabel: string
  /** Road geometry between the endpoints, or null when unrouted. */
  route: LatLng[] | null
  /** Route options returned by the last routing request. */
  routeOptions: RoadRoute[]
  /** Preference of the route currently shown on the map. */
  routePreference: RoutePreference | null
  /** Routing state of the leg. */
  routeStatus: RouteStatus
  /** One-way or round-trip distance in kilometres, as typed. */
  distanceKm: string
  /** Fuel consumption in litres per 100 km, as typed. */
  fuelConsumption: string
  /** Fuel price in euros per litre, as typed. */
  fuelPriceEuros: string
  /** Tolls in euros, as typed. */
  tollsEuros: string
  /** Whether distance and tolls are doubled for a return trip. */
  roundTrip: boolean
  /** Ids of the passengers present on the leg. */
  passengerIds: string[]
}
