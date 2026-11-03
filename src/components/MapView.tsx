import { Fragment, useEffect } from 'react'
import L from 'leaflet'
import { LoaderCircle } from 'lucide-react'
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '@/i18n'
import { formatLegName } from '@/lib/format'
import { haversineKm, type LatLng } from '@/lib/geo'
import type { LegDraft } from '@/types'
import { AnimatedPolyline } from '@/components/AnimatedPolyline'

/** Centre used before the first route is selected. */
const DEFAULT_CENTER: [number, number] = [42.5, 12.5]

/** Zoom used before the first route is selected. */
const DEFAULT_ZOOM = 6

/** Colours cycled across legs so adjacent routes stay distinguishable. */
const ROUTE_COLORS = [
  '#0f766e',
  '#b45309',
  '#1d4ed8',
  '#be185d',
  '#4d7c0f',
  '#7c3aed',
]

/** Fallback colour when the palette lookup unexpectedly fails. */
const FALLBACK_COLOR = '#0f766e'

interface MapViewProps {
  /** Legs currently declared in the editor. */
  legs: LegDraft[]
}

interface RouteLayer {
  /** Leg shown by this layer. */
  leg: LegDraft
  /** Zero-based position of the leg in the trip. */
  index: number
  /** Start point of the route. */
  start: LatLng
  /** End point of the route. */
  end: LatLng
  /** Polyline positions, or null while the road route is loading. */
  positions: Array<[number, number]> | null
  /** Stable key of the drawn geometry, used to restart the draw-in. */
  geometryKey: string
  /** Colour assigned to the leg. */
  color: string
}

/**
 * Build the drawable route layers from legs that have both points.
 *
 * @param legs - Legs currently declared in the editor.
 * @returns One layer per leg with a complete route.
 */
function collectRoutes(legs: LegDraft[]): RouteLayer[] {
  // Initializations
  const routes: RouteLayer[] = []

  // Keep only legs with both endpoints
  legs.forEach((leg, index) => {
    if (leg.start !== null && leg.end !== null) {
      // Draw a straight line only as the error fallback; while the road route
      // is loading the map shows the markers and a loading hint instead
      const isRouting = leg.routeStatus === 'loading'
      const geometry =
        leg.route !== null && leg.route.length > 1
          ? leg.route
          : isRouting
            ? null
            : [leg.start, leg.end]

      routes.push({
        leg,
        index,
        start: leg.start,
        end: leg.end,
        positions:
          geometry === null
            ? null
            : geometry.map(
                (point) => [point.lat, point.lng] as [number, number],
              ),
        geometryKey: geometry === null ? '' : buildGeometryKey(geometry),
        color: ROUTE_COLORS[index % ROUTE_COLORS.length] ?? FALLBACK_COLOR,
      })
    }
  })

  return routes
}

/**
 * Build a stable key for a geometry, so its draw-in restarts only when the
 * drawn line actually changes.
 *
 * @param points - Points of the drawn geometry.
 * @returns A key describing the point count and both endpoints.
 */
function buildGeometryKey(points: LatLng[]): string {
  const first = points[0]
  const last = points.at(-1)
  return `${points.length}:${first?.lat},${first?.lng}:${last?.lat},${last?.lng}`
}

/**
 * Create a numbered marker icon for a route endpoint.
 *
 * @param label - Text shown inside the marker.
 * @param color - Route colour used by the marker.
 * @param variant - Filled start marker or outlined end marker.
 * @returns A Leaflet div icon.
 */
function buildMarkerIcon(
  label: string,
  color: string,
  variant: 'start' | 'end',
): L.DivIcon {
  return L.divIcon({
    className: 'route-marker',
    html: `<span class="route-marker__badge route-marker__badge--${variant}" style="--marker-color: ${color}">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

/**
 * Fit the map to the route whenever its points change.
 *
 * The effect is keyed by a coordinates string rather than by the leg objects,
 * so editing fuel or passenger fields does not move the map.
 *
 * @param points - Endpoints of every routed leg.
 * @param pointsKey - Stable representation of the points used as effect key.
 * @returns Nothing. Renders no DOM.
 */
function FitRoute({
  points,
  pointsKey,
}: {
  points: LatLng[]
  pointsKey: string
}) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) {
      return
    }

    // Fit the viewport to every selected point
    const bounds = L.latLngBounds(
      points.map((point) => [point.lat, point.lng] as [number, number]),
    )
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
  }, [map, pointsKey])

  return null
}

/**
 * Interactive OpenStreetMap view of the trip legs.
 *
 * @param legs - Legs currently declared in the editor.
 * @returns The map pane with its overlays.
 */
export function MapView({ legs }: MapViewProps) {
  // Initializations
  const { t, formatDistanceKm } = useI18n()
  const routes = collectRoutes(legs)
  const points = routes.flatMap((route) => [route.start, route.end])
  const pointsKey = routes
    .map(
      (route) =>
        `${route.start.lat.toFixed(5)},${route.start.lng.toFixed(5)};${route.end.lat.toFixed(5)},${route.end.lng.toFixed(5)}`,
    )
    .join('|')
  const showEmptyHint = routes.length === 0
  const isRouting = legs.some((leg) => leg.routeStatus === 'loading')

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {routes.map((route) => (
          <Fragment key={route.leg.id}>
            {route.positions !== null && (
              <AnimatedPolyline
                positions={route.positions}
                geometryKey={route.geometryKey}
                animate={route.leg.route !== null}
                pathOptions={{
                  color: route.color,
                  weight: 5,
                  opacity: 0.85,
                  dashArray: route.leg.roundTrip ? '10 8' : undefined,
                }}
              >
                <Tooltip sticky>
                  {t('map.legTooltip', {
                    name: formatLegName(
                      route.leg,
                      t('leg.title', { n: route.index + 1 }),
                    ),
                    distance:
                      route.leg.distanceKm.trim() === ''
                        ? formatDistanceKm(
                            haversineKm(route.start, route.end),
                          )
                        : route.leg.distanceKm,
                  })}
                </Tooltip>
              </AnimatedPolyline>
            )}
            <Marker
              position={[route.start.lat, route.start.lng]}
              icon={buildMarkerIcon(String(route.index + 1), route.color, 'start')}
            />
            <Marker
              position={[route.end.lat, route.end.lng]}
              icon={buildMarkerIcon(String(route.index + 1), route.color, 'end')}
            />
          </Fragment>
        ))}

        <FitRoute points={points} pointsKey={pointsKey} />
      </MapContainer>

      {isRouting && (
        <div
          role="status"
          className="absolute top-3 left-1/2 z-[1000] flex max-w-[calc(100%-10rem)] -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
        >
          <LoaderCircle
            aria-hidden
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
          {t('map.findingRoute')}
        </div>
      )}

      {showEmptyHint && (
        <div
          role="status"
          className="absolute top-3 left-1/2 z-[1000] max-w-[calc(100%-10rem)] -translate-x-1/2 rounded-lg border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
        >
          {t('map.emptyHint')}
        </div>
      )}

      <p className="absolute bottom-3 left-3 z-[1000] rounded-md border bg-background/90 px-2 py-1 text-[0.7rem] text-muted-foreground">
        {t('map.attribution')}
      </p>
    </div>
  )
}
