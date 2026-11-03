import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegDraft } from '@/types'
import { createSeedLeg, isSeedLeg } from './seedTrip'

// Routing is a network call; the store tests only care about its bookkeeping
vi.mock('@/lib/routing', () => ({
  fetchRoadRoutes: vi.fn(() => new Promise(() => undefined)),
}))

/** Storage key holding the saved trip. */
const STORAGE_KEY = 'backseat.trip'

/**
 * Build an in-memory stand-in for local storage.
 *
 * @returns Storage operations plus the map holding the written values.
 */
function createMemoryStorage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    clear: () => {
      values.clear()
    },
  }
}

// The store reads local storage while it is created, so stub it before import
const memory = createMemoryStorage()
vi.stubGlobal('localStorage', memory)

const { useTripStore } = await import('./tripStore')

/**
 * Build a leg with known values for the tests.
 *
 * @param id - Identifier of the leg.
 * @returns A leg from nowhere to nowhere.
 */
function createLeg(id: string): LegDraft {
  return {
    id,
    start: null,
    startLabel: '',
    end: null,
    endLabel: '',
    route: null,
    routeOptions: [],
    routePreference: null,
    routeStatus: 'idle',
    distanceKm: '10.0',
    fuelConsumption: '6.5',
    fuelPriceEuros: '1.89',
    tollsEuros: '0.00',
    roundTrip: false,
    passengerIds: ['alice'],
  }
}

/**
 * Put the store back into a known state.
 *
 * @returns Nothing. Replaces the trip and clears the history.
 */
function resetStore(): void {
  useTripStore.setState({
    passengers: [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ],
    legs: [createLeg('leg-1')],
    paidById: null,
    paypalHandle: '',
    past: [],
    future: [],
    settingsOpen: false,
    historyKey: null,
    historyAt: 0,
  })
  memory.clear()
}

describe('trip store history', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('undoes and redoes a structural edit', () => {
    useTripStore.getState().removeLeg('leg-1')
    expect(useTripStore.getState().legs).toHaveLength(0)

    useTripStore.getState().undo()
    expect(useTripStore.getState().legs).toHaveLength(1)

    useTripStore.getState().redo()
    expect(useTripStore.getState().legs).toHaveLength(0)
  })

  it('restores passenger membership when a removal is undone', () => {
    useTripStore.getState().removePassenger('alice')
    expect(useTripStore.getState().passengers).toHaveLength(1)
    expect(useTripStore.getState().legs[0]?.passengerIds).toEqual([])

    useTripStore.getState().undo()
    expect(useTripStore.getState().passengers).toHaveLength(2)
    expect(useTripStore.getState().legs[0]?.passengerIds).toEqual(['alice'])
  })

  it('leaves typed fuel and toll fields out of the history', () => {
    useTripStore.getState().updateLeg('leg-1', { fuelConsumption: '8.0' })
    useTripStore.getState().updateLeg('leg-1', { tollsEuros: '12.00' })

    expect(useTripStore.getState().past).toHaveLength(0)
    expect(useTripStore.getState().legs[0]?.fuelConsumption).toBe('8.0')
  })

  it('merges endpoint edits on the same field into one step', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const format = (km: number) => km.toFixed(1)

    useTripStore
      .getState()
      .setEndpoint('leg-1', 'start', { lat: 1, lng: 1 }, 'A', format)
    vi.setSystemTime(new Date('2026-01-01T00:00:00.200Z'))
    useTripStore
      .getState()
      .setEndpoint('leg-1', 'start', { lat: 2, lng: 2 }, 'B', format)

    expect(useTripStore.getState().past).toHaveLength(1)

    vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'))
    useTripStore
      .getState()
      .setEndpoint('leg-1', 'start', { lat: 3, lng: 3 }, 'C', format)

    expect(useTripStore.getState().past).toHaveLength(2)
  })

  it('starts a new step after undo', () => {
    useTripStore.getState().addPassenger('Dave')
    useTripStore.getState().undo()
    useTripStore.getState().addPassenger('Erin')

    expect(useTripStore.getState().future).toHaveLength(0)
    expect(useTripStore.getState().past).toHaveLength(1)
  })
})

describe('trip store persistence', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restores the saved trip and repairs a stale loading status', async () => {
    const storedLeg = { ...createLeg('leg-9'), routeStatus: 'loading' }
    memory.values.set(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          passengers: [{ id: 'zoe', name: 'Zoe' }],
          legs: [storedLeg],
          paidById: 'zoe',
          paypalHandle: 'zoe',
        },
        version: 1,
      }),
    )

    vi.resetModules()
    const fresh = await import('./tripStore')

    expect(fresh.useTripStore.getState().legs[0]?.id).toBe('leg-9')
    expect(fresh.useTripStore.getState().legs[0]?.routeStatus).toBe('idle')
    expect(fresh.useTripStore.getState().paidById).toBe('zoe')
    expect(fresh.useTripStore.getState().paypalHandle).toBe('zoe')
    expect(fresh.useTripStore.getState().past).toHaveLength(0)
  })

  it('saves the trip without the undo history', () => {
    vi.useFakeTimers()
    useTripStore.getState().addPassenger('Dave')
    vi.advanceTimersByTime(1000)

    const raw = memory.values.get(STORAGE_KEY)
    expect(raw).toBeDefined()
    const stored = JSON.parse(raw ?? '{}') as {
      state?: { passengers?: unknown[]; past?: unknown }
    }

    expect(stored.state?.passengers).toHaveLength(3)
    expect(stored.state?.past).toBeUndefined()
  })

  it('keeps the seed leg out of a trip the user emptied', async () => {
    vi.useFakeTimers()
    useTripStore.getState().clearLegs()
    vi.advanceTimersByTime(1000)

    vi.resetModules()
    const fresh = await import('./tripStore')
    expect(fresh.useTripStore.getState().legs).toHaveLength(0)
  })
})

describe('seedTrip', () => {
  it('recognizes the example leg after a storage round trip', () => {
    const leg = createSeedLeg('it')
    const restored = JSON.parse(JSON.stringify(leg)) as LegDraft

    expect(isSeedLeg(restored)).toBe(true)
    expect(restored.startLabel).toBe('Roma')
  })
})
