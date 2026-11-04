import type { LatLng } from './geo'

/**
 * Decode an encoded polyline into geographic points.
 *
 * Valhalla returns polylines with six decimal places; the default precision
 * matches that format.
 *
 * @param encoded - Encoded polyline string.
 * @param precision - Number of decimal places encoded per coordinate.
 * @returns The decoded points in travel order.
 */
export function decodePolyline(encoded: string, precision = 6): LatLng[] {
  // Initializations
  const factor = 10 ** precision
  const points: LatLng[] = []
  let index = 0
  let latitude = 0
  let longitude = 0

  /**
   * Read one signed value from the encoded string.
   *
   * @returns The decoded delta, already sign-adjusted.
   */
  function decodeValue(): number {
    let result = 0
    let shift = 0
    let byte = 0x20

    // Read five-bit chunks until the continuation bit clears
    while (byte >= 0x20) {
      byte = encoded.charCodeAt(index) - 63
      index += 1
      result |= (byte & 0x1f) << shift
      shift += 5
    }

    // Invert the zig-zag encoding
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  // Decode latitude/longitude deltas until the string ends
  while (index < encoded.length) {
    latitude += decodeValue()
    longitude += decodeValue()
    points.push({ lat: latitude / factor, lng: longitude / factor })
  }

  return points
}

/**
 * Encode geographic points into the Google polyline format.
 *
 * @param points - Points in travel order.
 * @param precision - Number of decimal places encoded per coordinate.
 * @returns The encoded polyline.
 */
export function encodePolyline(points: LatLng[], precision = 6): string {
  // Initializations
  const factor = 10 ** precision
  let encoded = ''
  let previousLatitude = 0
  let previousLongitude = 0

  /**
   * Encode one signed delta as five-bit chunks.
   *
   * @param value - Delta to encode.
   * @returns The encoded chunk sequence.
   */
  function encodeValue(value: number): string {
    let result = value < 0 ? ~(value << 1) : value << 1
    let chunk = ''

    // Write five-bit chunks until the remaining value fits
    while (result >= 0x20) {
      chunk += String.fromCharCode((0x20 | (result & 0x1f)) + 63)
      result >>= 5
    }

    return chunk + String.fromCharCode(result + 63)
  }

  // Encode each rounded point as a delta from the previous one
  for (const point of points) {
    const latitude = Math.round(point.lat * factor)
    const longitude = Math.round(point.lng * factor)
    encoded += encodeValue(latitude - previousLatitude)
    encoded += encodeValue(longitude - previousLongitude)
    previousLatitude = latitude
    previousLongitude = longitude
  }

  return encoded
}
