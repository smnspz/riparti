import { calculateTrip, type Trip, type TripResult } from '../core'
import type { LegDraft, PassengerDraft } from '../types'

/**
 * Parse a decimal input, accepting both dot and comma separators.
 *
 * @param value - Raw input value.
 * @returns The parsed number, or NaN when the input is empty or invalid.
 */
function parseDecimal(value: string): number {
  const normalized = value.trim().replace(',', '.')
  return normalized === '' ? Number.NaN : Number(normalized)
}

/**
 * Convert a euro input to integer cents.
 *
 * @param value - Raw euro value, with dot or comma decimals.
 * @returns The rounded amount in cents, or NaN when the input is invalid.
 */
function eurosToCents(value: string): number {
  return Math.round(parseDecimal(value) * 100)
}

/**
 * Convert editable drafts into the immutable trip passed to the calculator.
 *
 * Empty or malformed numeric fields become NaN so that `calculateTrip` reports
 * a validation error instead of silently treating them as zero.
 *
 * @param passengers - Passengers currently declared in the editor.
 * @param legs - Legs currently declared in the editor.
 * @returns A trip ready for `calculateTrip`.
 */
export function buildTrip(
  passengers: PassengerDraft[],
  legs: LegDraft[],
): Trip {
  return {
    passengers: passengers.map((passenger) => ({
      id: passenger.id,
      name: passenger.name,
    })),
    legs: legs.map((leg) => ({
      distanceKm: parseDecimal(leg.distanceKm),
      fuelConsumptionLPer100Km: parseDecimal(leg.fuelConsumption),
      fuelPriceCentsPerLiter: eurosToCents(leg.fuelPriceEuros),
      tollCents: eurosToCents(leg.tollsEuros),
      roundTrip: leg.roundTrip,
      passengerIds: leg.passengerIds,
    })),
  }
}

/**
 * Calculate a trip from editable drafts.
 *
 * @param passengers - Passengers currently declared in the editor.
 * @param legs - Legs currently declared in the editor.
 * @returns The calculated trip result.
 * @throws {Error} When the drafts fail validation.
 */
export function calculateDraftTrip(
  passengers: PassengerDraft[],
  legs: LegDraft[],
): TripResult {
  return calculateTrip(buildTrip(passengers, legs))
}
