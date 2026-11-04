/**
 * Split an integer amount of cents into equal shares.
 *
 * The first shares receive one extra cent when the amount does not divide
 * evenly, so the returned shares always add up to the input amount.
 *
 * @param totalCents - Amount to split, as a non-negative integer number of cents.
 * @param shareCount - Number of shares to produce, greater than zero.
 * @returns One amount per share, in input order.
 */
export function splitCents(totalCents: number, shareCount: number): number[] {
  // Compute the base share and the cents left over
  const baseShare = Math.floor(totalCents / shareCount)
  const remainder = totalCents - baseShare * shareCount

  // Give one extra cent to the first shares until the remainder is used up
  return Array.from(
    { length: shareCount },
    (_, index) => baseShare + (index < remainder ? 1 : 0),
  )
}
