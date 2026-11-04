import type { Language } from '@/i18n/messages'
import type { LegDraft, PassengerDraft } from '@/types'
import { simplifyPath, type LatLng } from './geo'
import { decodePolyline, encodePolyline } from './polyline'

/** Version of the payload written into shared links. */
const SHARE_VERSION = 1

/** Path segment identifying a shared trip in the URL hash. */
const SHARE_ROUTE = '/s/'

/** Decimal places used by the polyline stored in a shared link. */
const SHARE_POLYLINE_PRECISION = 4

/** Maximum distance, in degrees, a simplified route point may move. */
const SHARE_SIMPLIFY_TOLERANCE = 0.0005

/** Largest payload accepted from a link, to reject obviously bad input. */
const MAX_PAYLOAD_LENGTH = 120_000

/** Largest route accepted from a link, to bound decoding work. */
const MAX_ROUTE_POINTS = 20_000

/** A trip encoded in a share link. */
export interface SharedTrip {
  /** Language the trip was created in. */
  language: Language
  /** Passengers declared on the trip. */
  passengers: PassengerDraft[]
  /** Legs declared on the trip. */
  legs: LegDraft[]
  /** Id of the passenger who paid, if chosen. */
  paidById: string | null
  /** PayPal.Me handle used for payment requests, or an empty string. */
  paypalHandle: string
}

/** Outcome of reading the current URL hash. */
export type ShareRoute =
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'trip'; trip: SharedTrip }

/** One leg in the compact wire format. */
type WireLeg = [
  number | null,
  number | null,
  string,
  number | null,
  number | null,
  string,
  string | null,
  string,
  string,
  string,
  string,
  number,
  number[],
]

/** Trip object serialized into the link before base64 encoding. */
interface WireTrip {
  /** Payload version. */
  v: number
  /** Language code. */
  l: Language
  /** Passenger names, indexed by their position. */
  p: string[]
  /** Legs in travel order. */
  g: WireLeg[]
  /** Index of the payer in `p`, when one was chosen. */
  b?: number
  /** PayPal.Me handle used for requests, when available. */
  h?: string
}

/**
 * Encode text as unpadded base64url.
 *
 * @param value - Text to encode.
 * @returns The URL-safe base64 representation.
 */
function encodeBase64Url(value: string): string {
  // Initializations
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  // Convert the UTF-8 bytes without spreading a large array
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  // Return the URL-safe alphabet without padding
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decode unpadded base64url text.
 *
 * @param value - URL-safe base64 representation.
 * @returns The decoded text.
 * @throws {Error} If the value is not valid base64.
 */
function decodeBase64Url(value: string): string {
  // Initializations
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized.padEnd(normalized.length + paddingLength, '=')

  // Decode the bytes and read them back as UTF-8
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Build the compact route string stored for one leg.
 *
 * @param route - Full route geometry, if the leg has one.
 * @returns The simplified encoded polyline, or null without a route.
 */
function encodeRoute(route: LatLng[] | null): string | null {
  if (route === null || route.length < 2) {
    return null
  }

  // Keep the shape recognizable while shortening the link
  return encodePolyline(
    simplifyPath(route, SHARE_SIMPLIFY_TOLERANCE),
    SHARE_POLYLINE_PRECISION,
  )
}

/**
 * Read one leg from the compact wire format.
 *
 * @param value - Candidate leg tuple.
 * @param index - Zero-based position of the leg.
 * @param passengerIds - Passenger ids available to the leg.
 * @returns The decoded leg draft.
 * @throws {Error} If the tuple is malformed.
 */
function decodeLeg(
  value: unknown,
  index: number,
  passengerIds: string[],
): LegDraft {
  // Check the tuple shape before reading it
  if (!Array.isArray(value) || value.length !== 13) {
    throw new Error('Malformed shared leg')
  }

  const [
    startLat,
    startLng,
    startLabel,
    endLat,
    endLng,
    endLabel,
    encodedRoute,
    distanceKm,
    fuelConsumption,
    fuelPriceEuros,
    tollsEuros,
    roundTrip,
    memberIndexes,
  ] = value

  // Read the endpoints, which may both be absent
  const start = readPoint(startLat, startLng)
  const end = readPoint(endLat, endLng)
  if (
    typeof startLabel !== 'string' ||
    typeof endLabel !== 'string' ||
    typeof distanceKm !== 'string' ||
    typeof fuelConsumption !== 'string' ||
    typeof fuelPriceEuros !== 'string' ||
    typeof tollsEuros !== 'string' ||
    (roundTrip !== 0 && roundTrip !== 1) ||
    !Array.isArray(memberIndexes)
  ) {
    throw new Error('Malformed shared leg fields')
  }

  // Resolve the passenger positions back to their ids
  const members = memberIndexes.map((memberIndex) => {
    if (typeof memberIndex !== 'number' || !Number.isInteger(memberIndex)) {
      throw new Error('Malformed shared leg passenger')
    }
    const passengerId = passengerIds[memberIndex]
    if (passengerId === undefined) {
      throw new Error('Shared leg references an unknown passenger')
    }
    return passengerId
  })

  // Decode the route when the link carries one
  let route: LatLng[] | null = null
  if (encodedRoute !== null) {
    if (
      typeof encodedRoute !== 'string' ||
      encodedRoute.length === 0 ||
      encodedRoute.length > MAX_PAYLOAD_LENGTH
    ) {
      throw new Error('Malformed shared route')
    }
    route = decodePolyline(encodedRoute, SHARE_POLYLINE_PRECISION)
    if (route.length > MAX_ROUTE_POINTS) {
      throw new Error('Shared route is too long')
    }
  }

  // Return the leg ready for the map and the calculator
  return {
    id: `leg-${index}`,
    start,
    startLabel,
    end,
    endLabel,
    route,
    routeOptions: [],
    routePreference: null,
    routeStatus: route === null ? 'error' : 'ready',
    distanceKm,
    fuelConsumption,
    fuelPriceEuros,
    tollsEuros,
    roundTrip: roundTrip === 1,
    passengerIds: members,
  }
}

/**
 * Read an optional point from two wire coordinates.
 *
 * @param latitude - Latitude value, or null when the point is absent.
 * @param longitude - Longitude value, or null when the point is absent.
 * @returns The decoded point, or null when both coordinates are absent.
 * @throws {Error} If the coordinates are malformed or out of range.
 */
function readPoint(latitude: unknown, longitude: unknown): LatLng | null {
  // Treat two nulls as a missing endpoint
  if (latitude === null && longitude === null) {
    return null
  }

  // Reject partial, non-numeric, or out-of-range coordinates
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Malformed shared point')
  }

  return { lat: latitude, lng: longitude }
}

/**
 * Encode a trip into the payload stored after the share route.
 *
 * @param trip - Trip to encode.
 * @returns The URL-safe payload.
 * @throws {Error} If a leg references a passenger that is not declared.
 */
export function encodeSharePayload(trip: SharedTrip): string {
  // Map every passenger to its position in the wire format
  const passengerIndexes = new Map(
    trip.passengers.map((passenger, index) => [passenger.id, index]),
  )
  const legs = trip.legs.map((leg): WireLeg => {
    const members = leg.passengerIds.map((passengerId) => {
      const index = passengerIndexes.get(passengerId)
      if (index === undefined) {
        throw new Error('Leg references an unknown passenger')
      }
      return index
    })

    return [
      leg.start?.lat ?? null,
      leg.start?.lng ?? null,
      leg.startLabel,
      leg.end?.lat ?? null,
      leg.end?.lng ?? null,
      leg.endLabel,
      encodeRoute(leg.route),
      leg.distanceKm,
      leg.fuelConsumption,
      leg.fuelPriceEuros,
      leg.tollsEuros,
      leg.roundTrip ? 1 : 0,
      members,
    ]
  })

  // Add the payer and handle only when they can produce a request
  const payerIndex = trip.paidById
    ? passengerIndexes.get(trip.paidById)
    : undefined
  const wire: WireTrip = {
    v: SHARE_VERSION,
    l: trip.language,
    p: trip.passengers.map((passenger) => passenger.name),
    g: legs,
  }
  if (payerIndex !== undefined) {
    wire.b = payerIndex
  }
  if (trip.paypalHandle.trim() !== '') {
    wire.h = trip.paypalHandle.trim()
  }

  // Serialize and make the payload safe inside a URL
  return encodeBase64Url(JSON.stringify(wire))
}

/**
 * Decode a payload produced by {@link encodeSharePayload}.
 *
 * @param payload - URL-safe payload from a share link.
 * @returns The decoded trip.
 * @throws {Error} If the payload is malformed or from an unknown version.
 */
export function decodeSharePayload(payload: string): SharedTrip {
  // Check the payload size before decoding it
  if (payload === '' || payload.length > MAX_PAYLOAD_LENGTH) {
    throw new Error('Shared trip payload is missing or too large')
  }

  // Parse the wire object and check its version
  const value: unknown = JSON.parse(decodeBase64Url(payload))
  if (typeof value !== 'object' || value === null) {
    throw new Error('Shared trip payload is not an object')
  }
  const wire = value as Partial<WireTrip>
  if (wire.v !== SHARE_VERSION) {
    throw new Error('Unsupported shared trip version')
  }

  // Check the language and passenger names
  if (wire.l !== 'it' && wire.l !== 'en') {
    throw new Error('Shared trip language is invalid')
  }
  if (!Array.isArray(wire.p) || !wire.p.every((name) => typeof name === 'string')) {
    throw new Error('Shared trip passengers are invalid')
  }
  if (!Array.isArray(wire.g)) {
    throw new Error('Shared trip legs are invalid')
  }

  // Rebuild passengers with stable ids for the shared page
  const passengers = wire.p.map(
    (name, index): PassengerDraft => ({ id: `p${index}`, name }),
  )
  const passengerIds = passengers.map((passenger) => passenger.id)
  const legs = wire.g.map((leg, index) =>
    decodeLeg(leg, index, passengerIds),
  )

  // Resolve the optional payer and payment handle
  let paidById: string | null = null
  if (wire.b !== undefined) {
    if (
      typeof wire.b !== 'number' ||
      !Number.isInteger(wire.b) ||
      passengers[wire.b] === undefined
    ) {
      throw new Error('Shared trip payer is invalid')
    }
    paidById = `p${wire.b}`
  }
  if (wire.h !== undefined && typeof wire.h !== 'string') {
    throw new Error('Shared trip payment handle is invalid')
  }

  return {
    language: wire.l,
    passengers,
    legs,
    paidById,
    paypalHandle: wire.h ?? '',
  }
}

/**
 * Build the absolute share URL for a trip.
 *
 * The hash carries the encoded trip, so the page needs no server storage.
 *
 * @param trip - Trip to encode.
 * @param baseHref - Current page URL used as the base.
 * @returns The shareable absolute URL.
 */
export function buildShareUrl(trip: SharedTrip, baseHref: string): string {
  const url = new URL(baseHref)
  url.hash = `${SHARE_ROUTE}${encodeSharePayload(trip)}`
  return url.toString()
}

/**
 * Read a shared trip from a URL hash.
 *
 * @param hash - Hash of the current URL, including the leading `#` if present.
 * @returns The shared trip, an empty route, or an invalid marker.
 */
export function parseShareHash(hash: string): ShareRoute {
  // Normalize the hash and check the share route
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  if (!path.startsWith(SHARE_ROUTE)) {
    return { status: 'none' }
  }

  // Decode the payload, treating any failure as an invalid link
  const payload = path.slice(SHARE_ROUTE.length)
  try {
    return { status: 'trip', trip: decodeSharePayload(payload) }
  } catch {
    return { status: 'invalid' }
  }
}
