import { describe, expect, it } from 'vitest'
import { haversineKm } from './geo'

const ROME = { lat: 41.9028, lng: 12.4964 }
const FLORENCE = { lat: 43.7696, lng: 11.2558 }

describe('haversineKm', () => {
  it('returns zero for identical points', () => {
    expect(haversineKm(ROME, ROME)).toBe(0)
  })

  it('measures a known intercity distance', () => {
    expect(haversineKm(ROME, FLORENCE)).toBeCloseTo(231, 0)
  })

  it('is symmetric', () => {
    expect(haversineKm(ROME, FLORENCE)).toBeCloseTo(
      haversineKm(FLORENCE, ROME),
      10,
    )
  })

  it('handles antipodal points without exceeding half the circumference', () => {
    const distance = haversineKm(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 180 },
    )
    expect(distance).toBeCloseTo(20015, 0)
  })
})
