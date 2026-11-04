import { describe, expect, it } from 'vitest'
import { haversineKm, simplifyPath } from './geo'

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

describe('simplifyPath', () => {
  it('keeps short paths untouched', () => {
    expect(simplifyPath([ROME, FLORENCE], 0.001)).toEqual([ROME, FLORENCE])
  })

  it('removes a point that sits on the chord', () => {
    const midpoint = {
      lat: (ROME.lat + FLORENCE.lat) / 2,
      lng: (ROME.lng + FLORENCE.lng) / 2,
    }
    expect(simplifyPath([ROME, midpoint, FLORENCE], 0.001)).toEqual([
      ROME,
      FLORENCE,
    ])
  })

  it('keeps a point that deviates beyond the tolerance', () => {
    const detour = {
      lat: (ROME.lat + FLORENCE.lat) / 2 + 0.1,
      lng: (ROME.lng + FLORENCE.lng) / 2,
    }
    expect(simplifyPath([ROME, detour, FLORENCE], 0.001)).toEqual([
      ROME,
      detour,
      FLORENCE,
    ])
  })

  it('never drops the endpoints of a long path', () => {
    const points = [ROME, { lat: 42, lng: 12 }, { lat: 42.5, lng: 11.8 }, FLORENCE]
    const simplified = simplifyPath(points, 10)
    expect(simplified[0]).toEqual(ROME)
    expect(simplified.at(-1)).toEqual(FLORENCE)
  })
})
