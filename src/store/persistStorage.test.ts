import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncedStorage } from './persistStorage'

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
  }
}

describe('createDebouncedStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('batches writes until the delay elapses', () => {
    const memory = createMemoryStorage()
    const storage = createDebouncedStorage(memory, 300)

    storage.setItem('backseat.trip', 'first')
    storage.setItem('backseat.trip', 'second')

    expect(memory.values.has('backseat.trip')).toBe(false)
    expect(storage.getItem('backseat.trip')).toBe('second')

    vi.advanceTimersByTime(300)
    expect(memory.values.get('backseat.trip')).toBe('second')
  })

  it('writes pending values when flushed early', () => {
    const memory = createMemoryStorage()
    const storage = createDebouncedStorage(memory, 300)

    storage.setItem('backseat.trip', 'saved')
    storage.flush()

    expect(memory.values.get('backseat.trip')).toBe('saved')
  })

  it('removes a key immediately', () => {
    const memory = createMemoryStorage()
    const storage = createDebouncedStorage(memory, 300)

    memory.values.set('backseat.trip', 'stale')
    storage.removeItem('backseat.trip')

    expect(memory.values.has('backseat.trip')).toBe(false)
  })
})
