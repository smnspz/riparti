import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Polyline } from 'react-leaflet'

/** Duration of the route draw-in. */
const DRAW_DURATION_MS = 800

/** Deceleration curve of the route draw-in. */
const DRAW_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** Gentler fade used when the user prefers reduced motion. */
const FADE_DURATION_MS = 250

interface AnimatedPolylineProps {
  /** Polyline positions as latitude/longitude pairs. */
  positions: Array<[number, number]>
  /** Stable key of the geometry; a change restarts the draw-in. */
  geometryKey: string
  /** Whether the line is a real road route worth drawing in. */
  animate: boolean
  /** Leaflet path options for the line. */
  pathOptions: L.PathOptions
}

/**
 * Leaflet polyline that draws itself in when its geometry arrives.
 *
 * A short opacity fade replaces the sweep when the user prefers reduced motion
 * or the path cannot be measured. Inline styles are removed once the effect
 * finishes so Leaflet keeps full control of the line while zooming.
 *
 * @param positions - Polyline positions as latitude/longitude pairs.
 * @param geometryKey - Stable key of the geometry.
 * @param animate - Whether to draw the line in.
 * @param pathOptions - Leaflet path options for the line.
 * @returns The polyline, animated on geometry changes.
 */
export function AnimatedPolyline({
  positions,
  geometryKey,
  animate,
  pathOptions,
}: AnimatedPolylineProps) {
  // Initializations
  const polylineRef = useRef<L.Polyline>(null)
  const completedKey = useRef<string | null>(null)

  // Draw the line in whenever its geometry changes
  useEffect(() => {
    const path = polylineRef.current?.getElement()
    if (!(path instanceof SVGPathElement)) {
      return
    }

    // Check the animation preconditions
    if (!animate || completedKey.current === geometryKey) {
      return
    }

    // Fade the line in without moving it
    const fadeIn = (): (() => void) => {
      path.style.opacity = '0'
      path.getBoundingClientRect()
      path.style.transition = `opacity ${FADE_DURATION_MS}ms ease-out`
      path.style.opacity = '1'

      const timeout = window.setTimeout(() => {
        path.style.transition = ''
        path.style.opacity = ''
        completedKey.current = geometryKey
      }, FADE_DURATION_MS + 50)

      return () => {
        window.clearTimeout(timeout)
        path.style.transition = ''
        path.style.opacity = ''
      }
    }

    // Use the gentler fade when motion is reduced
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) {
      return fadeIn()
    }

    // Measure the path so a dash can sweep across it
    const length = path.getTotalLength()
    if (length === 0) {
      return fadeIn()
    }
    path.style.strokeDasharray = `${length} ${length}`
    path.style.strokeDashoffset = `${length}`

    // Flush the hidden dash before starting the transition
    path.getBoundingClientRect()
    path.style.transition = `stroke-dashoffset ${DRAW_DURATION_MS}ms ${DRAW_EASING}`
    path.style.strokeDashoffset = '0'

    // Restore Leaflet's own dash options after the sweep
    const timeout = window.setTimeout(() => {
      path.style.transition = ''
      path.style.strokeDasharray = ''
      path.style.strokeDashoffset = ''
      completedKey.current = geometryKey
    }, DRAW_DURATION_MS + 50)

    return () => {
      window.clearTimeout(timeout)
      path.style.transition = ''
      path.style.strokeDasharray = ''
      path.style.strokeDashoffset = ''
    }
  }, [animate, geometryKey])

  return (
    <Polyline
      ref={polylineRef}
      positions={positions}
      pathOptions={pathOptions}
      interactive={false}
    />
  )
}
