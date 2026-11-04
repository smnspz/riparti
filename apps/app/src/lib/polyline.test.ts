import { describe, expect, it } from 'vitest'
import { decodePolyline, encodePolyline } from './polyline'

/** Precision-5 example from the Google polyline algorithm documentation. */
const GOOGLE_EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'

/** Precision-6 polyline for Rome, a midpoint, and Milan. */
const VALHALLA_EXAMPLE = '_lp|nA_`vyV_~}aA~ay{@o{kuC~u~kC'

describe('decodePolyline', () => {
  it('decodes the documented precision-5 example', () => {
    expect(decodePolyline(GOOGLE_EXAMPLE, 5)).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ])
  })

  it('decodes precision-6 coordinates', () => {
    expect(decodePolyline(VALHALLA_EXAMPLE, 6)).toEqual([
      { lat: 41.9028, lng: 12.4964 },
      { lat: 43, lng: 11.5 },
      { lat: 45.4642, lng: 9.19 },
    ])
  })

  it('returns no points for an empty string', () => {
    expect(decodePolyline('', 6)).toEqual([])
  })
})

describe('encodePolyline', () => {
  it('round-trips the documented precision-5 example', () => {
    expect(encodePolyline(decodePolyline(GOOGLE_EXAMPLE, 5), 5)).toBe(
      GOOGLE_EXAMPLE,
    )
  })

  it('round-trips precision-6 coordinates', () => {
    expect(encodePolyline(decodePolyline(VALHALLA_EXAMPLE, 6), 6)).toBe(
      VALHALLA_EXAMPLE,
    )
  })

  it('returns an empty string without points', () => {
    expect(encodePolyline([])).toBe('')
  })
})
