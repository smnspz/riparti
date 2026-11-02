import type { Leg, Trip } from './types'

/**
 * Throw an error when a leg cannot be calculated.
 *
 * @param leg - The leg to validate.
 * @param index - Zero-based position of the leg, used in error messages.
 * @param knownPassengerIds - Identifiers of every passenger declared on the trip.
 * @returns Nothing. Throws when the leg is invalid.
 * @throws {Error} If the leg has no passengers, references an unknown passenger,
 * lists a passenger twice, or has an invalid distance, consumption, price, or toll.
 */
export function validateLeg(
  leg: Leg,
  index: number,
  knownPassengerIds: ReadonlySet<string>,
): void {
  const label = `Leg ${index + 1}`

  // Check the passenger list
  validatePassengers(leg, label, knownPassengerIds)

  // Check the distances and consumption
  assertPositiveNumber(leg.distanceKm, `${label}: distanceKm`)
  assertNonNegativeNumber(
    leg.fuelConsumptionLPer100Km,
    `${label}: fuelConsumptionLPer100Km`,
  )

  // Check the monetary inputs
  assertNonNegativeInteger(
    leg.fuelPriceCentsPerLiter,
    `${label}: fuelPriceCentsPerLiter`,
  )
  assertNonNegativeInteger(leg.tollCents ?? 0, `${label}: tollCents`)
}

/**
 * Throw an error when a trip cannot be calculated.
 *
 * @param trip - The trip to validate.
 * @returns Nothing. Throws when the trip is invalid.
 * @throws {Error} If passenger ids are duplicated or any leg is invalid.
 */
export function validateTrip(trip: Trip): void {
  // Collect the declared passengers and reject duplicate ids
  const knownPassengerIds = new Set<string>()
  for (const passenger of trip.passengers) {
    if (knownPassengerIds.has(passenger.id)) {
      throw new Error(`Duplicate passenger id: ${passenger.id}`)
    }
    knownPassengerIds.add(passenger.id)
  }

  // Validate every leg against the declared passengers
  trip.legs.forEach((leg, index) => validateLeg(leg, index, knownPassengerIds))
}

/**
 * Check the passenger list of a leg.
 *
 * @param leg - The leg whose passengers are validated.
 * @param label - Human-readable prefix for error messages.
 * @param knownPassengerIds - Identifiers of every passenger declared on the trip.
 * @returns Nothing. Throws when the list is invalid.
 */
function validatePassengers(
  leg: Leg,
  label: string,
  knownPassengerIds: ReadonlySet<string>,
): void {
  // Reject legs without passengers, since there is nobody to split the cost
  if (leg.passengerIds.length === 0) {
    throw new Error(`${label}: at least one passenger is required`)
  }

  // Reject passengers that were never declared and passengers listed twice
  const seen = new Set<string>()
  for (const passengerId of leg.passengerIds) {
    if (!knownPassengerIds.has(passengerId)) {
      throw new Error(`${label}: unknown passenger id: ${passengerId}`)
    }
    if (seen.has(passengerId)) {
      throw new Error(`${label}: duplicate passenger id: ${passengerId}`)
    }
    seen.add(passengerId)
  }
}

/**
 * Ensure a value is a finite number greater than zero.
 *
 * @param value - Value to check.
 * @param field - Human-readable field name used in the error message.
 * @returns Nothing. Throws when the value is not a positive finite number.
 */
function assertPositiveNumber(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0`)
  }
}

/**
 * Ensure a value is a finite number greater than or equal to zero.
 *
 * @param value - Value to check.
 * @param field - Human-readable field name used in the error message.
 * @returns Nothing. Throws when the value is not a non-negative finite number.
 */
function assertNonNegativeNumber(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be greater than or equal to 0`)
  }
}

/**
 * Ensure a value is a non-negative integer number of cents.
 *
 * @param value - Value to check.
 * @param field - Human-readable field name used in the error message.
 * @returns Nothing. Throws when the value is not a non-negative integer.
 */
function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer number of cents`)
  }
}
