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

/**
 * Squared distance from a point to a line segment.
 *
 * @param point - Point to measure.
 * @param start - Start of the segment.
 * @param end - End of the segment.
 * @returns The squared distance in degrees, or 0 for a zero-length segment.
 */
function squaredSegmentDistance(
  point: LatLng,
  start: LatLng,
  end: LatLng,
): number {
  // Initializations
  const deltaLat = end.lat - start.lat
  const deltaLng = end.lng - start.lng
  let nearestLat = start.lat
  let nearestLng = start.lng

  // Project the point onto the segment when the segment has a direction
  if (deltaLat !== 0 || deltaLng !== 0) {
    const projection =
      ((point.lat - start.lat) * deltaLat +
        (point.lng - start.lng) * deltaLng) /
      (deltaLat * deltaLat + deltaLng * deltaLng)
    const clamped = Math.max(0, Math.min(1, projection))
    nearestLat += deltaLat * clamped
    nearestLng += deltaLng * clamped
  }

  // Return the squared distance to the nearest point
  const distanceLat = point.lat - nearestLat
  const distanceLng = point.lng - nearestLng
  return distanceLat * distanceLat + distanceLng * distanceLng
}

/**
 * Simplify a path with the Ramer-Douglas-Peucker algorithm.
 *
 * The tolerance is expressed in degrees so the function stays independent of
 * the map projection; one degree is roughly 111 km.
 *
 * @param points - Points in travel order.
 * @param tolerance - Maximum distance a removed point may sit from the line.
 * @returns The simplified points, always keeping the first and last.
 */
export function simplifyPath(points: LatLng[], tolerance: number): LatLng[] {
  // Keep short paths untouched
  if (points.length <= 2 || tolerance <= 0) {
    return points
  }

  // Find the point farthest from the chord between the endpoints
  const first = points[0]
  const last = points.at(-1)
  if (first === undefined || last === undefined) {
    return points
  }

  let farthestIndex = 0
  let farthestDistance = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    if (point === undefined) {
      continue
    }

    const distance = squaredSegmentDistance(point, first, last)
    if (distance > farthestDistance) {
      farthestDistance = distance
      farthestIndex = index
    }
  }

  // Keep the whole path when every point sits on the chord
  if (farthestDistance <= tolerance * tolerance) {
    return [first, last]
  }

  // Recurse on both halves and join them without duplicating the split point
  const left = simplifyPath(points.slice(0, farthestIndex + 1), tolerance)
  const right = simplifyPath(points.slice(farthestIndex), tolerance)
  return [...left.slice(0, -1), ...right]
}
