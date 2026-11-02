import { describe, expect, it } from 'vitest'
import { buildTrip } from './trip'
import type { LegDraft, PassengerDraft } from '../types'

const PASSENGERS: PassengerDraft[] = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
]

/**
 * Build a draft leg with sensible defaults for the tests.
 *
 * @param patch - Fields to override on the default leg.
 * @returns The draft leg.
 */
function makeLeg(patch: Partial<LegDraft> = {}): LegDraft {
  return {
    id: 'leg-1',
    start: null,
    startLabel: '',
    end: null,
    endLabel: '',
    route: null,
    routeOptions: [],
    routePreference: null,
    routeStatus: 'idle',
    distanceKm: '100',
    fuelConsumption: '5',
    fuelPriceEuros: '1.89',
    tollsEuros: '2.50',
    roundTrip: false,
    passengerIds: ['alice', 'bob'],
    ...patch,
  }
}

describe('buildTrip', () => {
  it('converts euro inputs to integer cents', () => {
    const trip = buildTrip(PASSENGERS, [makeLeg()])

    expect(trip.legs[0]).toMatchObject({
      distanceKm: 100,
      fuelConsumptionLPer100Km: 5,
      fuelPriceCentsPerLiter: 189,
      tollCents: 250,
      roundTrip: false,
      passengerIds: ['alice', 'bob'],
    })
  })

  it('accepts comma decimals and keeps partial input as NaN', () => {
    const trip = buildTrip(PASSENGERS, [
      makeLeg({ distanceKm: '12,5', fuelPriceEuros: '1,899' }),
      makeLeg({ distanceKm: '' }),
    ])

    expect(trip.legs[0]?.distanceKm).toBe(12.5)
    expect(trip.legs[0]?.fuelPriceCentsPerLiter).toBe(190)
    expect(trip.legs[1]?.distanceKm).toBeNaN()
  })

  it('copies passengers and round-trip flags', () => {
    const trip = buildTrip(PASSENGERS, [makeLeg({ roundTrip: true })])

    expect(trip.passengers).toEqual(PASSENGERS)
    expect(trip.legs[0]?.roundTrip).toBe(true)
  })
})
