import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchCities } from './geocoding'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchCities', () => {
  it('returns city labels and coordinates', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search for the city
    const places = await searchCities('Florence')

    // Check the converted place
    expect(places).toEqual([
      {
        id: 'R-42602',
        name: 'Florence',
        detail: 'Tuscany, Italy',
        label: 'Florence, Tuscany, Italy',
        point: { lat: 43.7697955, lng: 11.2556404 },
      },
    ])
  })

  it('requests city-level results and encodes the query', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search for a multi-word city
    await searchCities('San Gimignano')

    // Check the request URL
    const requestUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestUrl).toContain('San+Gimignano')
    expect(requestUrl).toContain('layer=city')
    expect(requestUrl).toContain('limit=6')
  })

  it('requests results in the requested language', async () => {
    // Initializations
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_PAYLOAD))
    vi.stubGlobal('fetch', fetchMock)

    // Search with an explicit language
    await searchCities('Florence', { language: 'it' })

    // Check the request URL
    const requestUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestUrl).toContain('lang=it')
  })

  it('returns no results for a blank query without calling the service', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchCities('   ')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'down' }, 429)),
    )

    await expect(searchCities('Rome')).rejects.toThrow(/HTTP 429/)
  })
})
