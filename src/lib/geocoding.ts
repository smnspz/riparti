import type { LatLng } from './geo'

/**
 * A city returned by the geocoding search.
 */
export interface Place {
  /** Stable identifier built from the OSM object. */
  id: string
  /** City name shown as the main suggestion. */
  name: string
  /** Region and country shown under the city name. */
  detail: string
  /** Full label with region and country, available for disambiguation. */
  label: string
  /** Coordinates of the city centre. */
  point: LatLng
}

/** Photon geocoding endpoint used for city search. */
const GEOCODING_ENDPOINT = 'https://photon.komoot.io/api'

/** Maximum number of suggestions requested. */
const SEARCH_LIMIT = 6

/** Subset of the Photon response used by the app. */
interface PhotonResponse {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number]
    }
    properties: {
      osm_type?: string
      osm_id?: number
      name?: string
      state?: string
      country?: string
    }
  }>
}

/**
 * Options accepted by the city search.
 */
export interface SearchCitiesOptions {
  /** Optional abort signal for a superseded request. */
  signal?: AbortSignal
  /** Language used for city and region names. */
  language?: string
}

/**
 * Search cities by name using the Photon geocoder.
 *
 * Results are limited to city-level places, so county, state, and country
 * duplicates of the same name do not clutter the suggestions.
 *
 * @param query - Text typed by the user.
 * @param options - Abort signal and language for the request.
 * @returns Matching cities, best match first.
 * @throws {Error} If the request fails.
 */
export async function searchCities(
  query: string,
  options: SearchCitiesOptions = {},
): Promise<Place[]> {
  // Initializations
  const { signal, language = 'en' } = options

  // Ignore blank queries without calling the service
  const trimmedQuery = query.trim()
  if (trimmedQuery === '') {
    return []
  }

  // Build the Photon request
  const params = new URLSearchParams({
    q: trimmedQuery,
    limit: String(SEARCH_LIMIT),
    lang: language,
    layer: 'city',
  })
  const response = await fetch(`${GEOCODING_ENDPOINT}?${params}`, { signal })

  // Reject HTTP failures before parsing the payload
  if (!response.ok) {
    throw new Error(`City search failed with HTTP ${response.status}`)
  }

  // Convert the features into places, skipping incomplete entries
  const payload = (await response.json()) as PhotonResponse
  return (payload.features ?? []).flatMap((feature, index) => {
    const coordinates = feature.geometry?.coordinates
    const name = feature.properties.name
    if (coordinates === undefined || name === undefined) {
      return []
    }

    // Build a label such as "Florence, Tuscany, Italy"
    const detailParts = [
      feature.properties.state,
      feature.properties.country,
    ].filter(
      (part): part is string => part !== undefined && part !== name,
    )
    const details = [...new Set(detailParts)]

    const [lng, lat] = coordinates
    return [
      {
        id: `${feature.properties.osm_type ?? 'place'}-${feature.properties.osm_id ?? index}`,
        name,
        detail: details.join(', '),
        label: [name, ...details].join(', '),
        point: { lat, lng },
      },
    ]
  })
}
