import type { StateStorage } from 'zustand/middleware'

/** Delay before a pending write reaches local storage. */
export const PERSIST_WRITE_DELAY_MS = 300

/** Storage operations needed to persist string values. */
export type StringStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

/** Storage that can flush its pending writes immediately. */
export interface DebouncedStorage extends StateStorage {
  /** Write every pending value now. */
  flush: () => void
}

/**
 * Wrap a storage so frequent writes are batched into one.
 *
 * Every keystroke in the editor changes the trip, and the trip includes the
 * route geometry, so writing on each change would serialize the whole trip
 * hundreds of times. Writes are coalesced and flushed when the page is hidden,
 * so a reload still keeps the latest edit.
 *
 * @param storage - Synchronous storage to write into.
 * @param delayMs - Time to wait before writing pending values.
 * @returns A zustand storage with an extra `flush` method.
 */
export function createDebouncedStorage(
  storage: StringStorage,
  delayMs: number = PERSIST_WRITE_DELAY_MS,
): DebouncedStorage {
  // Initializations
  const pending = new Map<string, string>()
  let timeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Write every pending value and stop the scheduled write.
   *
   * @returns Nothing. Storage failures are ignored.
   */
  function flush(): void {
    if (timeout !== null) {
      clearTimeout(timeout)
      timeout = null
    }
    if (pending.size === 0) {
      return
    }

    for (const [key, value] of pending) {
      try {
        storage.setItem(key, value)
      } catch {
        // Storage can be full or blocked; keep the in-memory state usable
      }
    }
    pending.clear()
  }

  /**
   * Schedule a flush, replacing any flush already waiting.
   *
   * @returns Nothing.
   */
  function schedule(): void {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(flush, delayMs)
  }

  /**
   * Read a value from storage, tolerating blocked storage.
   *
   * @param name - Storage key to read.
   * @returns The stored value, or null when it is missing or unreadable.
   */
  function read(name: string): string | null {
    try {
      return storage.getItem(name)
    } catch {
      return null
    }
  }

  // Flush before the page goes away so a reload keeps the latest edit
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    })
  }

  return {
    getItem: (name) => {
      if (pending.has(name)) {
        return pending.get(name) ?? null
      }
      return read(name)
    },
    setItem: (name, value) => {
      pending.set(name, value)
      schedule()
    },
    removeItem: (name) => {
      pending.delete(name)
      try {
        storage.removeItem(name)
      } catch {
        // Storage can be blocked; the next write recreates the key anyway
      }
    },
    flush,
  }
}

/**
 * Return the browser storage, or a stand-in when it is unavailable.
 *
 * @returns Local storage, or a storage that discards every write.
 */
export function resolveStorage(): StringStorage {
  try {
    const storage = globalThis.localStorage
    if (storage !== undefined) {
      return storage
    }
  } catch {
    // Accessing localStorage can throw when the browser blocks it
  }

  return {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  }
}
