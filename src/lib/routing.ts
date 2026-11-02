import type { LatLng } from './geo'
import { decodePolyline } from './polyline'

/**
 * Preference for a computed road route.
 */
export type RoutePreference = 'fastest' | 'no-tolls'

/**
 * One road route option between two points.
 */
export interface RoadRoute {
  /** Geometry of the route, in travel order. */
  points: LatLng[]
  /** Driving distance along the route, in kilometres. */
  distanceKm: number
  /** Whether the route uses toll roads. */
  hasToll: boolean
  /** How the route was requested. */
  preference: RoutePreference
}

/** Valhalla routing endpoint used for road routes. */
const ROUTING_ENDPOINT = 'https://valhalla1.openstreetmap.de/route'

/** Decimal places used by the encoded Valhalla shape. */
const SHAPE_PRECISION = 6

/** Subset of the Valhalla response used by the app. */
interface ValhallaResponse {
  trip?: {
    summary: {
      length: number
      has_toll?: boolean
    }
    legs?: Array<{
      shape: string
    }>
  }
}

/**
 * Request a single road route from Valhalla.
 *
 * @param start - Starting point.
 * @param end - Ending point.
 * @param preference - Fastest route or toll-free route.
 * @param signal - Optional abort signal for a superseded request.
 * @returns The route, or null when Valhalla returns no usable trip.
 * @throws {Error} If the request fails.
 */
async function requestRoute(
  start: LatLng,
  end: LatLng,
  preference: RoutePreference,
  signal?: AbortSignal,
): Promise<RoadRoute | null> {
  // Build the Valhalla request, avoiding tolls when requested
  const body: Record<string, unknown> = {
    locations: [
      { lat: start.lat, lon: start.lng },
      { lat: end.lat, lon: end.lng },
    ],
    costing: 'auto',
    directions_options: { units: 'kilometers' },
  }
  if (preference === 'no-tolls') {
    body.costing_options = { auto: { use_tolls: 0 } }
  }

  const response = await fetch(ROUTING_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  // Reject HTTP failures before parsing the payload
  if (!response.ok) {
    throw new Error(`Road routing failed with HTTP ${response.status}`)
  }

  // Read the first leg of the returned trip
  const payload = (await response.json()) as ValhallaResponse
  const trip = payload.trip
  const leg = trip?.legs?.[0]
  if (trip === undefined || leg === undefined || leg.shape === '') {
    return null
  }

  return {
    points: decodePolyline(leg.shape, SHAPE_PRECISION),
    distanceKm: trip.summary.length,
    hasToll: trip.summary.has_toll ?? false,
    preference,
  }
}

/**
 * Fetch the fastest route and, when it uses tolls, a toll-free alternative.
 *
 * The fastest route is always first. A second option is returned only when the
 * toll-free request succeeds and avoids tolls. If one of the two requests
 * fails, the other is still returned; only two failures raise an error.
 *
 * @param start - Starting point.
 * @param end - Ending point.
 * @param signal - Optional abort signal for superseded requests.
 * @returns Available route options, fastest first.
 * @throws {Error} If neither route can be computed.
 */
export async function fetchRoadRoutes(
  start: LatLng,
  end: LatLng,
  signal?: AbortSignal,
): Promise<RoadRoute[]> {
  // Request both preferences in parallel
  const results = await Promise.allSettled([
    requestRoute(start, end, 'fastest', signal),
    requestRoute(start, end, 'no-tolls', signal),
  ])

  // Keep the requests that produced a usable route
  const routes = results.flatMap((result) =>
    result.status === 'fulfilled' && result.value !== null ? [result.value] : [],
  )
  const fastest = routes.find((route) => route.preference === 'fastest')
  const noTolls = routes.find((route) => route.preference === 'no-tolls')

  // Fail only when neither request produced a route
  if (fastest === undefined && noTolls === undefined) {
    throw new Error('No road route found between the selected points')
  }
  if (fastest === undefined) {
    return noTolls === undefined ? [] : [noTolls]
  }

  // Offer the toll-free route only when it actually avoids tolls
  if (
    fastest.hasToll &&
    noTolls !== undefined &&
    noTolls.hasToll === false
  ) {
    return [fastest, noTolls]
  }

  return [fastest]
}
