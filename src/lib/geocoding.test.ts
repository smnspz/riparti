import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchPlaces } from './geocoding'

/**
 * Build a JSON response for the mocked fetch.
 *
 * @param body - Payload to serialize.
 * @param status - HTTP status code.
 * @returns A response object.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Minimal Photon payload with one complete and one incomplete feature. */
const PHOTON_PAYLOAD = {
  features: [
    {
      geometry: { coordinates: [11.2556404, 43.7697955] },
      properties: {
        osm_type: 'R',
        osm_id: 42602,
        name: 'Florence',
        state: 'Tuscany',
        country: 'Italy',
      },
    },
    {
      properties: {
        osm_type: 'R',
        osm_id: 1,
        name: 'Incomplete place',
      },
    },
  ],
}

/** Photon payload for an unnamed house number. */
const ADDRESS_PAYLOAD = {
  features: [
    {
      geometry: { coordinates: [12.4770387, 41.9092679] },
      properties: {
        osm_type: 'N',
        osm_id: 12046628552,
        street: 'Via del Corso',
        housenumber: '12',
        city: 'Roma',
        state: 'Lazio',
        country: 'Italia',
      },
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchPlaces', () => {
  it('returns place labels and coordinates', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search for the city
    const places = await searchPlaces('Florence')

    // Check the converted place
    expect(places).toEqual([
      {
        id: 'R-42602',
        name: 'Florence',
        detail: 'Tuscany, Italy',
        selectionLabel: 'Florence',
        point: { lat: 43.7697955, lng: 11.2556404 },
      },
    ])
  })

  it('builds street addresses from unnamed buildings', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ADDRESS_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search for a house number
    const places = await searchPlaces('Via del Corso 12')

    // Check the street address and its city detail
    expect(places).toEqual([
      {
        id: 'N-12046628552',
        name: 'Via del Corso 12',
        detail: 'Roma, Lazio, Italia',
        selectionLabel: 'Via del Corso 12, Roma',
        point: { lat: 41.9092679, lng: 12.4770387 },
      },
    ])
  })

  it('requests addresses, streets, and cities and encodes the query', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search for a multi-word city
    await searchPlaces('San Gimignano')

    // Check the request URL
    const requestUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestUrl).toContain('San+Gimignano')
    expect(requestUrl).toContain('layer=house')
    expect(requestUrl).toContain('layer=street')
    expect(requestUrl).toContain('layer=city')
    expect(requestUrl).toContain('limit=6')
  })

  it('translates names only into languages Photon supports', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search in Italian, which Photon cannot translate into
    await searchPlaces('Firenze', { language: 'it' })

    // Check that the request asks for local names instead
    const requestUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestUrl).toContain('lang=default')
    expect(requestUrl).not.toContain('lang=it')
  })

  it('requests translated names for supported languages', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search in English, which Photon supports
    await searchPlaces('Florence', { language: 'en' })

    // Check the language parameter
    const requestUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestUrl).toContain('lang=en')
  })

  it('returns no results for a blank query without calling the service', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchPlaces('   ')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'down' }, 429)),
    )

    await expect(searchPlaces('Rome')).rejects.toThrow(/HTTP 429/)
  })
})
