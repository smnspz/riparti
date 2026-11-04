import type { Translate } from './messages'

/** Leg-scoped validation message from the calculator. */
const LEG_MESSAGE = /^Leg (\d+): (.+)$/

/** Duplicate passenger id reported for the whole trip. */
const TRIP_DUPLICATE_MESSAGE = /^Duplicate passenger id: (.+)$/

/** Unknown passenger id reported inside a leg. */
const LEG_UNKNOWN_PASSENGER = /^unknown passenger id: (.+)$/

/** Duplicate passenger id reported inside a leg. */
const LEG_DUPLICATE_PASSENGER = /^duplicate passenger id: (.+)$/

/**
 * Translate a validation error thrown by the trip calculator.
 *
 * The calculator is a dependency-free module that reports English developer
 * messages. This boundary maps the known messages to localized UI text and
 * falls back to the original message for anything unrecognized.
 *
 * @param error - Error caught while calculating the trip.
 * @param t - Translation function for the current language.
 * @returns A localized message suitable for the results card.
 */
export function translateTripError(error: unknown, t: Translate): string {
  // Initializations
  const message = error instanceof Error ? error.message : ''

  // Map duplicate passenger ids declared on the whole trip
  const tripDuplicate = message.match(TRIP_DUPLICATE_MESSAGE)
  if (tripDuplicate !== null) {
    return t('error.duplicatePassenger', { id: tripDuplicate[1] })
  }

  // Map leg-scoped validation messages
  const legMessage = message.match(LEG_MESSAGE)
  if (legMessage === null) {
    return message === '' ? t('app.invalidTrip') : message
  }

  const n = legMessage[1]
  const detail = legMessage[2]

  if (detail === 'at least one passenger is required') {
    return t('error.legNeedsPassenger', { n })
  }

  const unknownPassenger = detail.match(LEG_UNKNOWN_PASSENGER)
  if (unknownPassenger !== null) {
    return t('error.legUnknownPassenger', { n, id: unknownPassenger[1] })
  }

  const duplicatePassenger = detail.match(LEG_DUPLICATE_PASSENGER)
  if (duplicatePassenger !== null) {
    return t('error.legDuplicatePassenger', { n, id: duplicatePassenger[1] })
  }

  if (detail === 'distanceKm must be greater than 0') {
    return t('error.distance', { n })
  }

  if (
    detail === 'fuelConsumptionLPer100Km must be greater than or equal to 0'
  ) {
    return t('error.consumption', { n })
  }

  if (
    detail ===
    'fuelPriceCentsPerLiter must be a non-negative integer number of cents'
  ) {
    return t('error.fuelPrice', { n })
  }

  if (detail === 'tollCents must be a non-negative integer number of cents') {
    return t('error.tolls', { n })
  }

  return message
}
