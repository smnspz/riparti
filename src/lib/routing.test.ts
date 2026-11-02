import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRoadRoutes } from './routing'

const ROME = { lat: 41.9028, lng: 12.4964 }
const MILAN = { lat: 45.4642, lng: 9.19 }

/** Precision-6 polyline for Rome, a midpoint, and Milan. */
const SHAPE = '_lp|nA_`vyV_~}aA~ay{@o{kuC~u~kC'

/** Valhalla payload for the fastest route, which uses tolls. */
const FASTEST_PAYLOAD = {
  trip: {
    summary: { length: 580.6, has_toll: true },
    legs: [{ shape: SHAPE }],
  },
}

/** Valhalla payload for the toll-free route. */
const TOLL_FREE_PAYLOAD = {
  trip: {
    summary: { length: 687.3, has_toll: false },
    legs: [{ shape: SHAPE }],
  },
}

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

/**
 * Serve the fastest payload unless the request avoids tolls.
 *
 * @param _input - Request URL, unused by the mock.
 * @param init - Request options containing the JSON body.
 * @returns The matching Valhalla response.
 */
function mockValhalla(
  _input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const body = JSON.parse(String(init?.body)) as {
    costing_options?: unknown
  }
  return Promise.resolve(
    jsonResponse(
      body.costing_options === undefined ? FASTEST_PAYLOAD : TOLL_FREE_PAYLOAD,
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRoadRoutes', () => {
  it('returns the fastest route and a toll-free alternative', async () => {
    // Initializations
    const fetchMock = vi.fn(mockValhalla)
    vi.stubGlobal('fetch', fetchMock)

    // Fetch both routes
    const routes = await fetchRoadRoutes(ROME, MILAN)

    // Check the two options and their decoded geometry
    expect(routes).toHaveLength(2)
    expect(routes[0]).toMatchObject({
      preference: 'fastest',
      distanceKm: 580.6,
      hasToll: true,
    })
    expect(routes[1]).toMatchObject({
      preference: 'no-tolls',
      distanceKm: 687.3,
      hasToll: false,
    })
    expect(routes[0]?.points).toEqual([
      { lat: 41.9028, lng: 12.4964 },
      { lat: 43, lng: 11.5 },
      { lat: 45.4642, lng: 9.19 },
    ])
  })

  it('asks Valhalla to avoid tolls in the second request', async () => {
    // Initializations
    const fetchMock = vi.fn(mockValhalla)
    vi.stubGlobal('fetch', fetchMock)

    // Fetch both routes
    await fetchRoadRoutes(ROME, MILAN)

    // Check the request bodies and method
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const bodies = fetchMock.mock.calls.map(
      (call) => JSON.parse(String(call[1]?.body)) as Record<string, unknown>,
    )
    expect(bodies[0]?.costing_options).toBeUndefined()
    expect(bodies[1]?.costing_options).toEqual({ auto: { use_tolls: 0 } })
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
  })

  it('does not duplicate the option when the fastest route has no tolls', async () => {
    // Initializations
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(TOLL_FREE_PAYLOAD)),
    )

    // Fetch both routes
    const routes = await fetchRoadRoutes(ROME, MILAN)

    // Check that only one option is offered
    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({
      preference: 'fastest',
      hasToll: false,
    })
  })

  it('keeps the fastest route when the toll-free request fails', async () => {
    // Initializations
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          costing_options?: unknown
        }
        return body.costing_options === undefined
          ? Promise.resolve(jsonResponse(FASTEST_PAYLOAD))
          : Promise.reject(new Error('routing down'))
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    // Fetch both routes
    const routes = await fetchRoadRoutes(ROME, MILAN)

    // Check that the usable route survives
    expect(routes).toHaveLength(1)
    expect(routes[0]?.preference).toBe('fastest')
  })

  it('rejects when neither request produces a route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(fetchRoadRoutes(ROME, MILAN)).rejects.toThrow(
      /No road route found/,
    )
  })
})
