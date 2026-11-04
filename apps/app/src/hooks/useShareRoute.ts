import { useEffect, useMemo, useState } from 'react'
import { parseShareHash, type ShareRoute } from '@/lib/shareLink'

/**
 * Read the shared trip encoded in the current URL hash.
 *
 * The hook follows hash changes so opening a share link in the same tab swaps
 * the editor for the read-only summary without a reload.
 *
 * @returns The share route currently addressed by the URL.
 */
export function useShareRoute(): ShareRoute {
  // Initializations
  const [hash, setHash] = useState(() => window.location.hash)

  // Follow hash navigation inside the same document
  useEffect(() => {
    /**
     * Store the new hash so the route is decoded again.
     *
     * @returns Nothing. Updates the local hash state.
     */
    function handleHashChange(): void {
      setHash(window.location.hash)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Decode only when the hash changes
  return useMemo(() => parseShareHash(hash), [hash])
}
