import { describe, expect, it } from 'vitest'
import type { LegDraft } from '@/types'
import {
  buildShareUrl,
  decodeSharePayload,
  encodeSharePayload,
  parseShareHash,
  type SharedTrip,
} from './shareLink'

/**
 * Build a leg with a short route and known values.
 *
 * @param overrides - Fields to replace on the default leg.
 * @returns A leg ready to share.
 */
function createLeg(overrides: Partial<LegDraft> = {}): LegDraft {
  return {
    id: 'leg-1',
    start: { lat: 41.9028, lng: 12.4964 },
    startLabel: 'Roma',
    end: { lat: 43.7696, lng: 11.2558 },
    endLabel: 'Firenze',
    route: [
      { lat: 41.9028, lng: 12.4964 },
      { lat: 42.8, lng: 11.8 },
      { lat: 43.7696, lng: 11.2558 },
    ],
    routeOptions: [],
    routePreference: null,
    routeStatus: 'ready',
    distanceKm: '282,9',
    fuelConsumption: '6.5',
    fuelPriceEuros: '1.89',
    tollsEuros: '15.00',
    roundTrip: false,
    passengerIds: ['alice', 'bob'],
    ...overrides,
  }
}

/** Trip used by the round-trip tests. */
const TRIP: SharedTrip = {
  language: 'it',
  passengers: [
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
  ],
  legs: [createLeg()],
  paidById: 'bob',
  paypalHandle: 'bobpay',
}

describe('shareLink', () => {
  it('round-trips a trip through the URL payload', () => {
    const decoded = decodeSharePayload(encodeSharePayload(TRIP))

    expect(decoded.language).toBe('it')
    expect(decoded.passengers.map((passenger) => passenger.name)).toEqual([
      'Alice',
      'Bob',
    ])
    expect(decoded.legs[0]?.startLabel).toBe('Roma')
    expect(decoded.legs[0]?.endLabel).toBe('Firenze')
    expect(decoded.legs[0]?.distanceKm).toBe('282,9')
    expect(decoded.legs[0]?.passengerIds).toEqual(['p0', 'p1'])
    expect(decoded.paidById).toBe('p1')
    expect(decoded.paypalHandle).toBe('bobpay')
  })

  it('keeps the route close to the original geometry', () => {
    const decoded = decodeSharePayload(encodeSharePayload(TRIP))
    const route = decoded.legs[0]?.route

    expect(route).toHaveLength(3)
    expect(route?.[0]?.lat).toBeCloseTo(41.9028, 4)
    expect(route?.[0]?.lng).toBeCloseTo(12.4964, 4)
    expect(route?.at(-1)?.lat).toBeCloseTo(43.7696, 4)
    expect(route?.at(-1)?.lng).toBeCloseTo(11.2558, 4)
  })

  it('round-trips missing endpoints and a missing route', () => {
    const trip: SharedTrip = {
      ...TRIP,
      legs: [
        createLeg({
          start: null,
          startLabel: '',
          end: null,
          endLabel: '',
          route: null,
          routeStatus: 'idle',
        }),
      ],
      paidById: null,
      paypalHandle: '',
    }

    const decoded = decodeSharePayload(encodeSharePayload(trip))
    expect(decoded.legs[0]?.start).toBeNull()
    expect(decoded.legs[0]?.end).toBeNull()
    expect(decoded.legs[0]?.route).toBeNull()
    expect(decoded.paidById).toBeNull()
    expect(decoded.paypalHandle).toBe('')
  })

  it('builds an absolute URL with the share payload in the hash', () => {
    const url = buildShareUrl(TRIP, 'https://example.com/backseat?x=1#/old')

    expect(url).toContain('https://example.com/backseat?x=1#/s/')
    const parsed = new URL(url)
    expect(parseShareHash(parsed.hash).status).toBe('trip')
  })

  it('ignores hashes that are not share links', () => {
    expect(parseShareHash('')).toEqual({ status: 'none' })
    expect(parseShareHash('#/other')).toEqual({ status: 'none' })
    expect(parseShareHash('#trip')).toEqual({ status: 'none' })
  })

  it('reports malformed payloads as invalid', () => {
    expect(parseShareHash('#/s/')).toEqual({ status: 'invalid' })
    expect(parseShareHash('#/s/not-base64!!')).toEqual({ status: 'invalid' })
    expect(() => decodeSharePayload('')).toThrow()
  })

  it('rejects a leg that references an undeclared passenger', () => {
    const trip: SharedTrip = {
      ...TRIP,
      legs: [createLeg({ passengerIds: ['carol'] })],
    }

    expect(() => encodeSharePayload(trip)).toThrow()
  })
})
