import type { Language } from '@/i18n/messages'

/** BCP 47 locales used for number and currency formatting. */
const LOCALES: Record<Language, string> = {
  it: 'it-IT',
  en: 'en-IE',
}

/** Cached euro formatters, one per supported language. */
const euroFormatters: Record<Language, Intl.NumberFormat> = {
  it: new Intl.NumberFormat(LOCALES.it, {
    style: 'currency',
    currency: 'EUR',
  }),
  en: new Intl.NumberFormat(LOCALES.en, {
    style: 'currency',
    currency: 'EUR',
  }),
}

/** Cached decimal formatters, one per supported language. */
const decimalFormatters: Record<Language, Intl.NumberFormat> = {
  it: new Intl.NumberFormat(LOCALES.it, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }),
  en: new Intl.NumberFormat(LOCALES.en, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }),
}

/**
 * Format integer cents as a euro amount.
 *
 * @param cents - Amount in euro cents.
 * @param language - Language whose number format is used.
 * @returns The amount with the euro symbol and two decimals.
 */
export function formatEuros(cents: number, language: Language = 'it'): string {
  return euroFormatters[language].format(cents / 100)
}

/**
 * Format a distance with one decimal place.
 *
 * @param km - Distance in kilometres.
 * @param language - Language whose number format is used.
 * @returns The distance formatted for display, without a unit suffix.
 */
export function formatDistanceKm(
  km: number,
  language: Language = 'it',
): string {
  return decimalFormatters[language].format(km)
}

/**
 * Format a fuel volume with one decimal place.
 *
 * @param liters - Volume in litres.
 * @param language - Language whose number format is used.
 * @returns The volume formatted for display, without a unit suffix.
 */
export function formatLiters(
  liters: number,
  language: Language = 'it',
): string {
  return decimalFormatters[language].format(liters)
}
