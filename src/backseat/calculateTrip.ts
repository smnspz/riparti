import { splitCents } from './money'
import type {
  Leg,
  LegResult,
  PassengerResult,
  PassengerShare,
  Trip,
  TripResult,
} from './types'
import { validateTrip } from './validation'

/** Conversion factor from litres per 100 km to litres per km. */
const LITERS_PER_100_KM = 100

/**
 * Calculate the total cost of a trip and the amount owed by each passenger.
 *
 * Fuel is priced from the effective distance, which is doubled on a return
 * trip. Each leg total is rounded once to integer cents and split equally,
 * with leftover cents given to the first passengers. The passenger totals
 * therefore always add up to the trip total exactly.
 *
 * @param trip - The passengers and legs making up the trip.
 * @returns The trip total, the per-leg breakdown, and each passenger's share.
 * @throws {Error} If a leg has no passengers, references an unknown passenger,
 * or contains a negative or non-integer monetary value.
 */
export function calculateTrip(trip: Trip): TripResult {
  // Validate the whole trip before computing anything
  validateTrip(trip)

  // Initializations
  const totalsByPassengerId = new Map<string, number>(
    trip.passengers.map((passenger) => [passenger.id, 0]),
  )

  // Calculate every leg and accumulate each passenger's share
  const legs = trip.legs.map((leg, index) =>
    calculateLeg(leg, index, totalsByPassengerId),
  )

  // Collect the passenger totals in input order
  const passengers: PassengerResult[] = trip.passengers.map((passenger) => ({
    id: passenger.id,
    name: passenger.name,
    totalCents: totalsByPassengerId.get(passenger.id) ?? 0,
  }))

  // Sum the leg totals, which equals the sum of every passenger share
  const totalCents = legs.reduce((sum, leg) => sum + leg.totalCents, 0)

  return { totalCents, legs, passengers }
}

/**
 * Calculate one leg and add its split to the running passenger totals.
 *
 * @param leg - The leg to calculate.
 * @param index - Zero-based position of the leg in the trip.
 * @param totalsByPassengerId - Running totals, updated in place.
 * @returns The leg breakdown and its per-passenger shares.
 */
function calculateLeg(
  leg: Leg,
  index: number,
  totalsByPassengerId: Map<string, number>,
): LegResult {
  // Initializations
  const roundTrip = leg.roundTrip ?? false
  const tollCents = leg.tollCents ?? 0

  // Double distance and tolls on a return trip
  const distanceKm = roundTrip ? leg.distanceKm * 2 : leg.distanceKm
  const effectiveTollCents = roundTrip ? tollCents * 2 : tollCents

  // Compute the fuel cost, rounded once at leg level
  const liters = (distanceKm * leg.fuelConsumptionLPer100Km) / LITERS_PER_100_KM
  const fuelCostCents = Math.round(liters * leg.fuelPriceCentsPerLiter)
  const totalCents = fuelCostCents + effectiveTollCents

  // Split the leg total and accumulate each passenger's share
  const shareAmounts = splitCents(totalCents, leg.passengerIds.length)
  const shares: PassengerShare[] = leg.passengerIds.map(
    (passengerId, shareIndex) => {
      const amountCents = shareAmounts[shareIndex] ?? 0
      const previousTotal = totalsByPassengerId.get(passengerId) ?? 0
      totalsByPassengerId.set(passengerId, previousTotal + amountCents)
      return { passengerId, amountCents }
    },
  )

  // Return the leg breakdown
  return {
    index,
    roundTrip,
    distanceKm,
    liters,
    fuelCostCents,
    tollCents: effectiveTollCents,
    totalCents,
    shares,
  }
}
