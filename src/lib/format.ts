/** Formatter for euro amounts entered as integer cents. */
const euroFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
})

/** Formatter for distances and volumes with one decimal place. */
const decimalFormatter = new Intl.NumberFormat('en-IE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Format integer cents as a euro amount.
 *
 * @param cents - Amount in euro cents.
 * @returns The amount with the euro symbol and two decimals.
 */
export function formatEuros(cents: number): string {
  return euroFormatter.format(cents / 100)
}

/**
 * Format a distance with one decimal place.
 *
 * @param km - Distance in kilometres.
 * @returns The distance formatted for display, without a unit suffix.
 */
export function formatDistanceKm(km: number): string {
  return decimalFormatter.format(km)
}

/**
 * Format a fuel volume with one decimal place.
 *
 * @param liters - Volume in litres.
 * @returns The volume formatted for display, without a unit suffix.
 */
export function formatLiters(liters: number): string {
  return decimalFormatter.format(liters)
}
