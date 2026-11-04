/** Local storage key holding the PayPal.Me handle. */
const PAYPAL_HANDLE_STORAGE_KEY = 'backseat.paypalHandle'

/**
 * Valid PayPal.Me handle: letters and numbers, up to 20 characters.
 *
 * PayPal does not allow symbols, dashes, or spaces in handles.
 */
const PAYPAL_HANDLE_PATTERN = /^[A-Za-z0-9]{1,20}$/

/**
 * Normalize a pasted PayPal.Me link or handle.
 *
 * Accepts handles with or without the `paypal.me/` prefix, protocol, `www.`,
 * a leading `@`, or a trailing amount, and returns just the handle.
 *
 * @param raw - Text typed or pasted by the user.
 * @returns The bare PayPal.Me handle.
 */
export function normalizePayPalHandle(raw: string): string {
  const trimmed = raw.trim()
  const withoutProtocol = trimmed.replace(
    /^https?:\/\/(?:www\.)?paypal\.me\//i,
    '',
  )
  const withoutPrefix = withoutProtocol.replace(
    /^(?:www\.)?paypal\.me\//i,
    '',
  )
  const withoutAt = withoutPrefix.replace(/^@/, '')
  return withoutAt.split('/')[0]?.trim() ?? ''
}

/**
 * Check whether a PayPal.Me handle is usable.
 *
 * @param handle - Handle or link to validate.
 * @returns True when the normalized handle matches PayPal's rules.
 */
export function isValidPayPalHandle(handle: string): boolean {
  return PAYPAL_HANDLE_PATTERN.test(normalizePayPalHandle(handle))
}

/**
 * Build a PayPal.Me payment link for one share.
 *
 * The link pre-fills the amount in euros; the payer can still change it inside
 * PayPal, so it is a request rather than a locked payment.
 *
 * @param handle - PayPal.Me handle of the person who paid.
 * @param amountCents - Amount to request, in integer cents.
 * @returns The payment link, or null for an invalid handle or zero amount.
 */
export function buildPayPalMeUrl(
  handle: string,
  amountCents: number,
): string | null {
  // Check the handle and amount
  const normalized = normalizePayPalHandle(handle)
  if (!PAYPAL_HANDLE_PATTERN.test(normalized) || amountCents <= 0) {
    return null
  }

  // Format the amount with a dot, dropping the cents when they are zero
  const euros = Math.floor(amountCents / 100)
  const cents = amountCents % 100
  const amount =
    cents === 0 ? String(euros) : `${euros}.${String(cents).padStart(2, '0')}`

  // Return the prefilled PayPal.Me link
  return `https://paypal.me/${normalized}/${amount}EUR`
}

/**
 * Read the PayPal.Me handle saved on this device.
 *
 * The trip store persists the handle with the rest of the trip; this reader
 * only seeds the store from the key used before the store existed.
 *
 * @returns The stored handle, or an empty string when none is saved.
 */
export function readStoredPayPalHandle(): string {
  try {
    return window.localStorage.getItem(PAYPAL_HANDLE_STORAGE_KEY) ?? ''
  } catch {
    // Ignore storage that the browser refuses to expose
    return ''
  }
}
