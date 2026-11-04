import { useEffect, useState } from 'react'

/** Media query matching a coarse primary pointer, such as a finger. */
const COARSE_POINTER_QUERY = '(pointer: coarse)'

/**
 * Track whether the primary pointer is coarse.
 *
 * Touch devices use one-finger drags for both map panning and page scrolling,
 * so the map needs to know which gesture to leave to the page.
 *
 * @returns True while the primary pointer is coarse.
 */
export function useCoarsePointer(): boolean {
  // Initializations
  const [coarsePointer, setCoarsePointer] = useState(
    () => window.matchMedia(COARSE_POINTER_QUERY).matches,
  )

  // Follow changes when a device switches between touch and pointer input
  useEffect(() => {
    const query = window.matchMedia(COARSE_POINTER_QUERY)

    /**
     * Store the new pointer class.
     *
     * @param event - Media query change event.
     * @returns Nothing. Updates the local state.
     */
    function handleChange(event: MediaQueryListEvent): void {
      setCoarsePointer(event.matches)
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return coarsePointer
}
