import { describe, expect, it } from 'vitest'
import type { LegDraft } from '@/types'
import { formatLegName } from './format'

/**
 * Build a minimal leg draft for naming tests.
 *
 * @param startLabel - Label of the start point.
 * @param endLabel - Label of the end point.
 * @returns A leg draft with the given endpoint labels.
 */
function createLeg(startLabel: string, endLabel: string): LegDraft {
  return {
    id: 'leg-1',
    start: null,
    startLabel,
    end: null,
    endLabel,
    route: null,
    routeOptions: [],
    routePreference: null,
    routeStatus: 'idle',
    distanceKm: '',
    fuelConsumption: '',
    fuelPriceEuros: '',
    tollsEuros: '',
    roundTrip: false,
    passengerIds: [],
  }
}

describe('formatLegName', () => {
  it('names a leg after its endpoints when both are known', () => {
    expect(
      formatLegName(createLeg('Rome, Lazio, Italy', 'Florence, Tuscany, Italy'), 'Leg 1'),
    ).toBe('Rome, Lazio, Italy - Florence, Tuscany, Italy')
  })

  it('keeps the numbered default until both endpoints are known', () => {
    expect(formatLegName(createLeg('Rome, Lazio, Italy', ''), 'Leg 1')).toBe(
      'Leg 1',
    )
    expect(formatLegName(createLeg('', 'Florence, Tuscany, Italy'), 'Leg 2')).toBe(
      'Leg 2',
    )
  })

  it('ignores labels that contain only whitespace', () => {
    expect(formatLegName(createLeg('  ', '  '), 'Leg 1')).toBe('Leg 1')
  })
})
