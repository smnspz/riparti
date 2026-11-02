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
