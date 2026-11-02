import { describe, expect, it } from 'vitest'
import { calculateTrip } from './index'
import type { Leg, Passenger, Trip, TripResult } from './index'

const alice: Passenger = { id: 'alice', name: 'Alice' }
const bob: Passenger = { id: 'bob', name: 'Bob' }
const carol: Passenger = { id: 'carol', name: 'Carol' }
const dave: Passenger = { id: 'dave', name: 'Dave' }

const baseLeg: Leg = {
  distanceKm: 100,
  fuelConsumptionLPer100Km: 5,
  fuelPriceCentsPerLiter: 200,
  tollCents: 500,
  passengerIds: ['alice', 'bob', 'carol'],
}

/**
 * Sum every share of every leg of a result.
 *
 * @param result - Trip result to inspect.
 * @returns Total of all leg shares, in cents.
 */
function sumLegShares(result: TripResult): number {
  return result.legs.reduce(
    (total, leg) =>
      total + leg.shares.reduce((legTotal, share) => legTotal + share.amountCents, 0),
    0,
  )
}

/**
 * Sum the totals of every passenger of a result.
 *
 * @param result - Trip result to inspect.
 * @returns Total owed by all passengers, in cents.
 */
function sumPassengerTotals(result: TripResult): number {
  return result.passengers.reduce(
    (total, passenger) => total + passenger.totalCents,
    0,
  )
}

describe('calculateTrip', () => {
  it('calculates a single leg with fuel and tolls', () => {
    // Initializations
    const trip: Trip = { passengers: [alice, bob, carol], legs: [baseLeg] }

    // Calculate the trip
    const result = calculateTrip(trip)

    // Check the leg breakdown
    expect(result.legs).toHaveLength(1)
    expect(result.legs[0]).toMatchObject({
      index: 0,
      roundTrip: false,
      distanceKm: 100,
      liters: 5,
      fuelCostCents: 1000,
      tollCents: 500,
      totalCents: 1500,
    })
    expect(result.legs[0]?.shares).toEqual([
      { passengerId: 'alice', amountCents: 500 },
      { passengerId: 'bob', amountCents: 500 },
      { passengerId: 'carol', amountCents: 500 },
    ])

    // Check the trip totals
    expect(result.totalCents).toBe(1500)
    expect(result.passengers).toEqual([
      { id: 'alice', name: 'Alice', totalCents: 500 },
      { id: 'bob', name: 'Bob', totalCents: 500 },
      { id: 'carol', name: 'Carol', totalCents: 500 },
    ])
  })

  it('splits costs when passengers join only some legs', () => {
    // Initializations
    const trip: Trip = {
      passengers: [alice, bob, carol, dave],
      legs: [
        { ...baseLeg, tollCents: 0, passengerIds: ['alice', 'bob'] },
        {
          distanceKm: 50,
          fuelConsumptionLPer100Km: 5,
          fuelPriceCentsPerLiter: 200,
          passengerIds: ['bob', 'carol'],
        },
      ],
    }

    // Calculate the trip
    const result = calculateTrip(trip)

    // Check each passenger's total, including the absent passenger
    expect(result.totalCents).toBe(1500)
    expect(result.passengers).toEqual([
      { id: 'alice', name: 'Alice', totalCents: 500 },
      { id: 'bob', name: 'Bob', totalCents: 750 },
      { id: 'carol', name: 'Carol', totalCents: 250 },
      { id: 'dave', name: 'Dave', totalCents: 0 },
    ])
  })

  it('doubles distance and tolls when round trip is enabled', () => {
    // Initializations
    const roundTripLeg: Leg = {
      ...baseLeg,
      tollCents: 300,
      roundTrip: true,
      passengerIds: ['alice'],
    }
    const oneWayLeg: Leg = {
      ...baseLeg,
      tollCents: 300,
      passengerIds: ['alice'],
    }

    // Calculate both variants
    const roundTripResult = calculateTrip({
      passengers: [alice],
      legs: [roundTripLeg],
    })
    const oneWayResult = calculateTrip({
      passengers: [alice],
      legs: [oneWayLeg],
    })

    // Check the doubled values
    expect(roundTripResult.legs[0]).toMatchObject({
      roundTrip: true,
      distanceKm: 200,
      liters: 10,
      fuelCostCents: 2000,
      tollCents: 600,
      totalCents: 2600,
    })
    expect(roundTripResult.totalCents).toBe(2600)

    // Check the values left untouched
    expect(oneWayResult.legs[0]).toMatchObject({
      roundTrip: false,
      distanceKm: 100,
      fuelCostCents: 1000,
      tollCents: 300,
      totalCents: 1300,
    })
    expect(oneWayResult.totalCents).toBe(1300)
  })

  it('distributes leftover cents when the total does not divide evenly', () => {
    // Initializations
    const trip: Trip = {
      passengers: [alice, bob, carol],
      legs: [
        {
          distanceKm: 100,
          fuelConsumptionLPer100Km: 10,
          fuelPriceCentsPerLiter: 292,
          passengerIds: ['alice', 'bob', 'carol'],
        },
      ],
    }

    // Calculate the trip
    const result = calculateTrip(trip)

    // Check that the remainder goes to the first shares
    expect(result.totalCents).toBe(2920)
    expect(result.legs[0]?.shares).toEqual([
      { passengerId: 'alice', amountCents: 974 },
      { passengerId: 'bob', amountCents: 973 },
      { passengerId: 'carol', amountCents: 973 },
    ])
    expect(sumLegShares(result)).toBe(2920)
  })

  it('keeps every share and passenger total aligned across multiple legs', () => {
    // Initializations
    const trip: Trip = {
      passengers: [alice, bob, carol, dave],
      legs: [
        {
          distanceKm: 123.4,
          fuelConsumptionLPer100Km: 6.7,
          fuelPriceCentsPerLiter: 189,
          tollCents: 450,
          passengerIds: ['alice', 'bob'],
        },
        {
          distanceKm: 7,
          fuelConsumptionLPer100Km: 8.9,
          fuelPriceCentsPerLiter: 175,
          passengerIds: ['alice', 'bob', 'carol'],
        },
        {
          distanceKm: 88.8,
          fuelConsumptionLPer100Km: 4.2,
          fuelPriceCentsPerLiter: 203,
          tollCents: 99,
          roundTrip: true,
          passengerIds: ['carol'],
        },
      ],
    }

    // Calculate the trip
    const result = calculateTrip(trip)

    // Check each leg split
    for (const leg of result.legs) {
      const legShareTotal = leg.shares.reduce(
        (total, share) => total + share.amountCents,
        0,
      )
      expect(legShareTotal).toBe(leg.totalCents)
      expect(leg.shares).toHaveLength(
        trip.legs[leg.index]?.passengerIds.length ?? 0,
      )
    }

    // Check that all totals agree
    const legTotal = result.legs.reduce((total, leg) => total + leg.totalCents, 0)
    expect(result.totalCents).toBe(legTotal)
    expect(sumPassengerTotals(result)).toBe(result.totalCents)
    expect(sumLegShares(result)).toBe(result.totalCents)
  })

  it('returns zero costs for a trip without legs or without fuel', () => {
    // Initializations
    const emptyTrip: Trip = { passengers: [alice], legs: [] }
    const freeLeg: Leg = {
      ...baseLeg,
      fuelConsumptionLPer100Km: 0,
      tollCents: undefined,
      passengerIds: ['alice'],
    }

    // Calculate both variants
    const emptyResult = calculateTrip(emptyTrip)
    const freeResult = calculateTrip({ passengers: [alice], legs: [freeLeg] })

    // Check the empty trip
    expect(emptyResult.totalCents).toBe(0)
    expect(emptyResult.legs).toEqual([])
    expect(emptyResult.passengers).toEqual([
      { id: 'alice', name: 'Alice', totalCents: 0 },
    ])

    // Check the free leg
    expect(freeResult.totalCents).toBe(0)
    expect(freeResult.legs[0]?.shares).toEqual([
      { passengerId: 'alice', amountCents: 0 },
    ])
  })
})

describe('calculateTrip validation', () => {
  const validPassengers = [alice, bob]

  /**
   * Calculate a trip made of one leg derived from the valid base leg.
   *
   * @param patch - Fields to override on the base leg.
   * @returns The calculation result.
   */
  function calculatePatchedLeg(patch: Partial<Leg>): TripResult {
    return calculateTrip({
      passengers: validPassengers,
      legs: [{ ...baseLeg, passengerIds: ['alice', 'bob'], ...patch }],
    })
  }

  it('rejects a leg without passengers', () => {
    expect(() => calculatePatchedLeg({ passengerIds: [] })).toThrow(
      /at least one passenger/,
    )
  })

  it('rejects an unknown passenger id', () => {
    expect(() => calculatePatchedLeg({ passengerIds: ['alice', 'zoe'] })).toThrow(
      /unknown passenger id: zoe/,
    )
  })

  it('rejects a passenger listed twice on the same leg', () => {
    expect(() =>
      calculatePatchedLeg({ passengerIds: ['alice', 'alice'] }),
    ).toThrow(/duplicate passenger id: alice/)
  })

  it('rejects a passenger declared twice on the trip', () => {
    expect(() =>
      calculateTrip({ passengers: [alice, alice], legs: [] }),
    ).toThrow(/Duplicate passenger id: alice/)
  })

  it.each<[string, Partial<Leg>]>([
    ['distanceKm', { distanceKm: -1 }],
    ['zero distance', { distanceKm: 0 }],
    ['negative consumption', { fuelConsumptionLPer100Km: -1 }],
    ['negative fuel price', { fuelPriceCentsPerLiter: -1 }],
    ['negative tolls', { tollCents: -1 }],
  ])('rejects %s', (_label, patch) => {
    expect(() => calculatePatchedLeg(patch)).toThrow(/must be/)
  })

  it('rejects monetary values that are not integer cents', () => {
    expect(() =>
      calculatePatchedLeg({ fuelPriceCentsPerLiter: 1.85 }),
    ).toThrow(/non-negative integer number of cents/)
    expect(() => calculatePatchedLeg({ tollCents: 4.5 })).toThrow(
      /non-negative integer number of cents/,
    )
  })

  it('rejects non-finite numbers', () => {
    expect(() => calculatePatchedLeg({ distanceKm: Number.NaN })).toThrow(
      /distanceKm/,
    )
    expect(() =>
      calculatePatchedLeg({ fuelConsumptionLPer100Km: Number.POSITIVE_INFINITY }),
    ).toThrow(/fuelConsumptionLPer100Km/)
  })
})
