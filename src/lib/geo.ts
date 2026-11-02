/**
 * A geographic point in decimal degrees.
 */
export interface LatLng {
  /** Latitude in degrees. */
  lat: number
  /** Longitude in degrees. */
  lng: number
}

/** Mean Earth radius in kilometres, used by the haversine formula. */
const EARTH_RADIUS_KM = 6371.0088

/** Conversion factor from degrees to radians. */
const DEGREES_TO_RADIANS = Math.PI / 180

/**
 * Measure the great-circle distance between two points.
 *
 * Map picks give a straight-line distance, so real road distances are usually
 * longer; the UI keeps the kilometre field editable for that reason.
 *
 * @param from - Starting point.
 * @param to - Ending point.
 * @returns Distance in kilometres.
 */
export function haversineKm(from: LatLng, to: LatLng): number {
  // Convert the coordinates to radians
  const fromLatitude = from.lat * DEGREES_TO_RADIANS
  const toLatitude = to.lat * DEGREES_TO_RADIANS
  const latitudeDelta = (to.lat - from.lat) * DEGREES_TO_RADIANS
  const longitudeDelta = (to.lng - from.lng) * DEGREES_TO_RADIANS

  // Apply the haversine formula
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  // Return the central-angle distance on the sphere
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)))
}
