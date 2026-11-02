import type { LatLng } from './geo'

/**
 * A place or address returned by the geocoding search.
 */
export interface Place {
  /** Stable identifier built from the OSM object. */
  id: string
  /** Address or place name shown as the main suggestion. */
  name: string
  /** City, region, and country shown under the name. */
  detail: string
  /** Label kept in the field after selection, with its city when needed. */
  selectionLabel: string
  /** Coordinates of the place. */
  point: LatLng
}

/** Photon geocoding endpoint used for place search. */
const GEOCODING_ENDPOINT = 'https://photon.komoot.io/api'

/** Maximum number of suggestions requested. */
const SEARCH_LIMIT = 6

/**
 * Photon layers searched for results: addresses, streets, and cities.
 *
 * Photon accepts one `layer` parameter per value, so each layer is appended
 * separately to the request.
 */
const SEARCH_LAYERS = ['house', 'street', 'locality', 'district', 'city']

/**
 * Languages the Photon endpoint can translate place names into.
 *
 * Anything else requests `default`, which returns local names. Photon rejects
 * unknown `lang` values with HTTP 400, so unsupported languages must not be
 * forwarded as they are.
 */
const SUPPORTED_LANGUAGES = new Set(['de', 'en', 'fr'])

/** Subset of the Photon place properties used by the app. */
interface PhotonProperties {
  osm_type?: string
  osm_id?: number
  name?: string
  street?: string
  housenumber?: string
  city?: string
  locality?: string
  district?: string
  state?: string
  country?: string
}

/** Subset of the Photon response used by the app. */
interface PhotonResponse {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number]
    }
    properties: PhotonProperties
  }>
}

/**
 * Options accepted by the place search.
 */
export interface SearchPlacesOptions {
  /** Optional abort signal for a superseded request. */
  signal?: AbortSignal
  /** Language used for place and region names. */
  language?: string
}

/**
 * Build the display name of a geocoded place.
 *
 * Photon leaves the name empty for plain house numbers, so the street and
 * house number become the label in that case.
 *
 * @param properties - Photon properties of the place.
 * @returns The place name, or undefined when it has no usable label.
 */
function buildPlaceName(properties: PhotonProperties): string | undefined {
  // Prefer the named place, such as a station or a square
  if (properties.name !== undefined && properties.name !== '') {
    return properties.name
  }

  // Fall back to the street address of an unnamed building
  const streetAddress = [properties.street, properties.housenumber]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' ')
  return streetAddress === '' ? undefined : streetAddress
}

/**
 * Build the locality that best describes a place.
 *
 * @param properties - Photon properties of the place.
 * @returns The city, locality, or district, when present.
 */
function buildLocality(properties: PhotonProperties): string | undefined {
  return properties.city ?? properties.locality ?? properties.district
}

/**
 * Build the secondary line shown under a place name.
 *
 * The most specific locality wins, so address results read "Roma, Lazio,
 * Italia" instead of listing every administrative level.
 *
 * @param properties - Photon properties of the place.
 * @param locality - City or locality of the place.
 * @param name - Display name, excluded to avoid repeating it.
 * @returns Distinct region parts, country last.
 */
function buildPlaceDetail(
  properties: PhotonProperties,
  locality: string | undefined,
  name: string,
): string {
  const parts = [locality, properties.state, properties.country].filter(
    (part): part is string =>
      part !== undefined && part !== '' && part !== name,
  )
  return [...new Set(parts)].join(', ')
}

/**
 * Build the label kept in the field after selection.
 *
 * City results stay short, while an address such as "Via del Corso 12" gains
 * its city so the chosen endpoint stays unambiguous.
 *
 * @param name - Display name of the place.
 * @param locality - City or locality of the place.
 * @returns The name, with its locality when they differ.
 */
function buildSelectionLabel(
  name: string,
  locality: string | undefined,
): string {
  if (locality === undefined || locality === '' || locality === name) {
    return name
  }
  return `${name}, ${locality}`
}

/**
 * Search places and addresses by name using the Photon geocoder.
 *
 * Results include buildings, streets, localities, and cities, so a typed
 * address and a city name both resolve to a routable point.
 *
 * @param query - Text typed by the user.
 * @param options - Abort signal and language for the request.
 * @returns Matching places and addresses, best match first.
 * @throws {Error} If the request fails.
 */
export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<Place[]> {
  // Initializations
  const { signal, language = 'en' } = options

  // Ignore blank queries without calling the service
  const trimmedQuery = query.trim()
  if (trimmedQuery === '') {
    return []
  }

  // Build the Photon request, one layer parameter per result type
  const params = new URLSearchParams({
    q: trimmedQuery,
    limit: String(SEARCH_LIMIT),
    lang: SUPPORTED_LANGUAGES.has(language) ? language : 'default',
  })
  for (const layer of SEARCH_LAYERS) {
    params.append('layer', layer)
  }
  const response = await fetch(`${GEOCODING_ENDPOINT}?${params}`, { signal })

  // Reject HTTP failures before parsing the payload
  if (!response.ok) {
    throw new Error(`Place search failed with HTTP ${response.status}`)
  }

  // Convert the features into places, skipping incomplete entries
  const payload = (await response.json()) as PhotonResponse
  return (payload.features ?? []).flatMap((feature, index) => {
    const coordinates = feature.geometry?.coordinates
    const name = buildPlaceName(feature.properties)
    if (coordinates === undefined || name === undefined) {
      return []
    }

    // Build a label such as "Via del Corso 12, Roma, Lazio, Italia"
    const locality = buildLocality(feature.properties)
    const detail = buildPlaceDetail(feature.properties, locality, name)
    const selectionLabel = buildSelectionLabel(name, locality)
    const [lng, lat] = coordinates
    return [
      {
        id: `${feature.properties.osm_type ?? 'place'}-${feature.properties.osm_id ?? index}`,
        name,
        detail,
        selectionLabel,
        point: { lat, lng },
      },
    ]
  })
}
