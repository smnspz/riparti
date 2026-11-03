import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { LoaderCircle, Minus, Plus, RotateCcw, TriangleAlert } from 'lucide-react'
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { formatLegName } from '@/lib/format'
import { haversineKm, type LatLng } from '@/lib/geo'
import {
  routeCasingColor,
  routeColor,
  routeEstimateColor,
  routeLineColor,
} from '@/lib/routeColors'
import { useTripStore } from '@/store/tripStore'
import { useTheme, type ResolvedTheme } from '@/theme'
import type { LegDraft } from '@/types'
import { AnimatedPolyline } from '@/components/AnimatedPolyline'

/** Centre used before the first route is selected. */
const DEFAULT_CENTER: [number, number] = [42.5, 12.5]

/** Zoom used before the first route is selected. */
const DEFAULT_ZOOM = 6

interface MapViewProps {
  /** Legs currently declared in the editor. */
  legs: LegDraft[]
}

/** Zoom level of the map and the limits it can reach. */
interface ZoomState {
  /** Current zoom level. */
  zoom: number
  /** Lowest zoom level allowed. */
  min: number
  /** Highest zoom level allowed. */
  max: number
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
  /** Identity colour used by the markers. */
  color: string
  /** Colour of the line for the current theme. */
  lineColor: string
  /** Whether the drawn line is a straight-line estimate, not a road route. */
  isFallback: boolean
}

/** Positions already converted for a route geometry, keyed by its array. */
const positionsCache = new WeakMap<LatLng[], Array<[number, number]>>()

/**
 * Convert route geometry to Leaflet positions.
 *
 * The converted array is reused for the same geometry, so an unrelated edit
 * does not make react-leaflet redraw an unchanged line.
 *
 * @param points - Route geometry in latitude/longitude pairs.
 * @returns Positions ready for a Leaflet polyline.
 */
function toPositions(points: LatLng[]): Array<[number, number]> {
  const cached = positionsCache.get(points)
  if (cached !== undefined) {
    return cached
  }

  const positions = points.map(
    (point) => [point.lat, point.lng] as [number, number],
  )
  positionsCache.set(points, positions)
  return positions
}

/** Positions already built for an estimate, keyed by its endpoint objects. */
const fallbackPositionsCache = new WeakMap<
  LatLng,
  WeakMap<LatLng, Array<[number, number]>>
>()

/**
 * Build the two points of a straight-line estimate.
 *
 * Cached by the endpoint objects so an unrelated edit does not redraw the
 * estimate with identical coordinates.
 *
 * @param start - Start point of the leg.
 * @param end - End point of the leg.
 * @returns Positions ready for a Leaflet polyline.
 */
function fallbackPositions(
  start: LatLng,
  end: LatLng,
): Array<[number, number]> {
  let byEnd = fallbackPositionsCache.get(start)
  if (byEnd === undefined) {
    byEnd = new WeakMap()
    fallbackPositionsCache.set(start, byEnd)
  }

  const cached = byEnd.get(end)
  if (cached !== undefined) {
    return cached
  }

  const positions: Array<[number, number]> = [
    [start.lat, start.lng],
    [end.lat, end.lng],
  ]
  byEnd.set(end, positions)
  return positions
}

/**
 * Build the drawable route layers from legs that have both points.
 *
 * @param legs - Legs currently declared in the editor.
 * @param theme - Colour scheme applied to the document.
 * @returns One layer per leg with a complete route.
 */
function collectRoutes(
  legs: LegDraft[],
  theme: ResolvedTheme,
): RouteLayer[] {
  // Initializations
  const routes: RouteLayer[] = []

  // Keep only legs with both endpoints
  legs.forEach((leg, index) => {
    if (leg.start === null || leg.end === null) {
      return
    }

    // Draw a straight line only as the error fallback; while the road route
    // is loading the map shows the markers and a loading hint instead
    const isRouting = leg.routeStatus === 'loading'
    const road =
      leg.route !== null && leg.route.length > 1 ? leg.route : null
    const geometry = road ?? [leg.start, leg.end]

    routes.push({
      leg,
      index,
      start: leg.start,
      end: leg.end,
      positions: isRouting
        ? null
        : road !== null
          ? toPositions(road)
          : fallbackPositions(leg.start, leg.end),
      geometryKey: isRouting ? '' : buildGeometryKey(geometry),
      color: routeColor(index),
      lineColor: routeLineColor(index, theme),
      isFallback: road === null,
    })
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
 * Escape text before it becomes part of a Leaflet div icon.
 *
 * Place names come from search results, so they can contain quotes,
 * apostrophes, or angle brackets.
 *
 * @param value - Text from a place name or a translation.
 * @returns The text with HTML-significant characters escaped.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Create a numbered marker icon for a route endpoint.
 *
 * The icon is larger than the visible badge so the tap target reaches the
 * 44px touch minimum without changing the marker's look. The badge carries the
 * endpoint's accessible name, because Leaflet markers are focusable buttons.
 *
 * @param label - Text shown inside the marker.
 * @param color - Route colour used by the marker.
 * @param variant - Filled start marker or outlined end marker.
 * @param accessibleName - Name announced for the marker button.
 * @returns A Leaflet div icon.
 */
function buildMarkerIcon(
  label: string,
  color: string,
  variant: 'start' | 'end',
  accessibleName: string,
): L.DivIcon {
  return L.divIcon({
    className: 'route-marker',
    html: `<span class="route-marker__badge route-marker__badge--${variant}" style="--marker-color: ${color}" aria-label="${escapeHtml(accessibleName)}">${label}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

/** Path options already built, so Leaflet is not restyled for the same look. */
const pathOptionsCache = new Map<string, L.PathOptions>()

/** Casing options already built, for the same reason. */
const casingOptionsCache = new Map<string, L.PathOptions>()

/**
 * Build the polyline style for a route layer.
 *
 * A straight-line estimate is dashed and neutral, so it can never be mistaken
 * for a road route.
 *
 * @param route - Route layer to style.
 * @param theme - Colour scheme applied to the document.
 * @returns Leaflet path options for the line.
 */
function buildPathOptions(
  route: RouteLayer,
  theme: ResolvedTheme,
): L.PathOptions {
  const dash = route.leg.roundTrip ? '10 8' : 'none'
  const key = route.isFallback
    ? `estimate|${theme}`
    : `line|${route.lineColor}|${dash}`
  const cached = pathOptionsCache.get(key)
  if (cached !== undefined) {
    return cached
  }

  const options: L.PathOptions = route.isFallback
    ? {
        color: routeEstimateColor(theme),
        weight: 3,
        opacity: 0.9,
        dashArray: '6 6',
      }
    : {
        color: route.lineColor,
        weight: 5,
        opacity: 0.85,
        dashArray: route.leg.roundTrip ? '10 8' : undefined,
      }

  pathOptionsCache.set(key, options)
  return options
}

/**
 * Build the halo style drawn under a road route.
 *
 * The casing is 1.5px wider on each side, so the line keeps a clear edge over
 * dark terrain in light mode and over the inverted tiles in dark mode.
 *
 * @param route - Route layer to outline.
 * @param theme - Colour scheme applied to the document.
 * @returns Leaflet path options for the halo.
 */
function buildCasingOptions(
  route: RouteLayer,
  theme: ResolvedTheme,
): L.PathOptions {
  const key = `${theme}|${route.leg.roundTrip ? 'round' : 'one-way'}`
  const cached = casingOptionsCache.get(key)
  if (cached !== undefined) {
    return cached
  }

  const options: L.PathOptions = {
    color: routeCasingColor(theme),
    weight: 8,
    opacity: 0.9,
    dashArray: route.leg.roundTrip ? '10 8' : undefined,
  }
  casingOptionsCache.set(key, options)
  return options
}

/**
 * Create the label pinned to a straight-line estimate.
 *
 * The icon is a zero-size anchor: the chip centres itself on the midpoint of
 * the line without adding another tap target over the map.
 *
 * @param label - Text shown in the label.
 * @returns A Leaflet div icon anchored on the line.
 */
function buildFallbackIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: 'route-fallback',
    html: `<span class="route-fallback__chip">${escapeHtml(label)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

/**
 * Fit the map to the route whenever its points change, and keep it fitted when
 * the pane changes size.
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

    // Refit when the pane changes size, so rotation or a layout switch keeps
    // the endpoints on screen without overriding a deliberate zoom
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        map.invalidateSize()
        if (!map.getBounds().contains(bounds)) {
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
        }
      })
    })
    observer.observe(map.getContainer())

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [map, pointsKey])

  return null
}

/**
 * Report the map zoom level whenever it changes.
 *
 * @param onChange - Called with the current zoom level and its limits.
 * @returns Nothing. Renders no DOM.
 */
function ZoomTracker({ onChange }: { onChange: (state: ZoomState) => void }) {
  const map = useMap()

  useEffect(() => {
    /**
     * Read the current zoom level and publish it.
     *
     * @returns Nothing. Calls `onChange`.
     */
    function report(): void {
      onChange({
        zoom: map.getZoom(),
        min: map.getMinZoom(),
        max: map.getMaxZoom(),
      })
    }

    report()
    map.on('zoomend', report)
    return () => {
      map.off('zoomend', report)
    }
  }, [map, onChange])

  return null
}

/**
 * Move focus to the editor card of a leg.
 *
 * Markers are real buttons: activating one reveals the card that owns it, so
 * the map and the editor stay connected for keyboard and pointer users.
 *
 * @param legId - Identifier of the leg to reveal.
 * @returns Nothing. Scrolls the card into view and focuses it.
 */
function focusLeg(legId: string): void {
  const card = document.getElementById(`leg-card-${legId}`)
  if (card === null) {
    return
  }

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  card.scrollIntoView({
    block: 'center',
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
  card.focus({ preventScroll: true })
}

interface RouteMarkerProps {
  /** Latitude of the endpoint. */
  lat: number
  /** Longitude of the endpoint. */
  lng: number
  /** Number shown inside the badge. */
  label: string
  /** Route colour used by the badge. */
  color: string
  /** Filled start marker or outlined end marker. */
  variant: 'start' | 'end'
  /** Name announced for the marker button. */
  accessibleName: string
  /** Text shown while hovering the marker. */
  tooltip: string
  /** Leg revealed when the marker is activated. */
  legId: string
}

/**
 * Endpoint marker that reveals its leg card when activated.
 *
 * Leaflet makes markers focusable buttons but never wires Enter or Space to
 * them, so the keyboard activation is added here.
 *
 * @param lat - Latitude of the endpoint.
 * @param lng - Longitude of the endpoint.
 * @param label - Number shown inside the badge.
 * @param color - Route colour used by the badge.
 * @param variant - Filled start marker or outlined end marker.
 * @param accessibleName - Name announced for the marker button.
 * @param tooltip - Text shown while hovering the marker.
 * @param legId - Leg revealed when the marker is activated.
 * @returns The endpoint marker with its tooltip.
 */
const RouteMarker = memo(function RouteMarker({
  lat,
  lng,
  label,
  color,
  variant,
  accessibleName,
  tooltip,
  legId,
}: RouteMarkerProps) {
  const markerRef = useRef<L.Marker>(null)
  const position = useMemo<[number, number]>(
    () => [lat, lng],
    [lat, lng],
  )
  const icon = useMemo(
    () => buildMarkerIcon(label, color, variant, accessibleName),
    [label, color, variant, accessibleName],
  )

  useEffect(() => {
    const icon = markerRef.current?.getElement()
    if (icon === undefined) {
      return
    }

    /**
     * Activate the marker from the keyboard.
     *
     * @param event - Key event from the marker button.
     * @returns Nothing. Prevents scrolling on Space.
     */
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }
      event.preventDefault()
      focusLeg(legId)
    }

    icon.addEventListener('keydown', handleKeyDown)
    return () => icon.removeEventListener('keydown', handleKeyDown)
  }, [legId])

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={{ click: () => focusLeg(legId) }}
    >
      <Tooltip>{tooltip}</Tooltip>
    </Marker>
  )
})

/**
 * Label pinned to a straight-line estimate.
 *
 * Memoised so an unrelated edit does not rebuild the chip icon or reposition
 * it with the same coordinates.
 *
 * @param lat - Latitude of the line midpoint.
 * @param lng - Longitude of the line midpoint.
 * @param label - Text shown in the label.
 * @returns The label marker.
 */
const FallbackMarker = memo(function FallbackMarker({
  lat,
  lng,
  label,
}: {
  lat: number
  lng: number
  label: string
}) {
  const position = useMemo<[number, number]>(
    () => [lat, lng],
    [lat, lng],
  )
  const icon = useMemo(() => buildFallbackIcon(label), [label])

  return (
    <Marker
      position={position}
      icon={icon}
      interactive={false}
      keyboard={false}
    />
  )
})

/**
 * Interactive OpenStreetMap view of the trip legs.
 *
 * Map navigation lives in the bottom row beside the attribution, and the trip
 * history and settings sit in the top corners, so no control can cover another.
 *
 * @param legs - Legs currently declared in the editor.
 * @returns The map pane with its overlays.
 */
export function MapView({ legs }: MapViewProps) {
  // Initializations
  const { t, formatDistanceKm } = useI18n()
  const { resolvedTheme } = useTheme()
  const retryFallbackRoutes = useTripStore((state) => state.retryFallbackRoutes)
  const [map, setMap] = useState<L.Map | null>(null)
  const [zoomState, setZoomState] = useState<ZoomState>({
    zoom: DEFAULT_ZOOM,
    min: 0,
    max: 19,
  })
  const routes = collectRoutes(legs, resolvedTheme)
  const points = routes.flatMap((route) => [route.start, route.end])
  const pointsKey = routes
    .map(
      (route) =>
        `${route.start.lat.toFixed(5)},${route.start.lng.toFixed(5)};${route.end.lat.toFixed(5)},${route.end.lng.toFixed(5)}`,
    )
    .join('|')
  const showEmptyHint = routes.length === 0
  const isRouting = legs.some((leg) => leg.routeStatus === 'loading')
  const fallbackRoutes = routes.filter((route) => route.isFallback)

  return (
    <div className="absolute inset-0">
      <h2 id="map-title" className="sr-only">
        {t('map.title')}
      </h2>

      <MapContainer
        ref={setMap}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {routes.map((route) => {
          const legName = formatLegName(
            route.leg,
            t('leg.title', { n: route.index + 1 }),
          )
          const distance =
            route.leg.distanceKm.trim() === ''
              ? formatDistanceKm(haversineKm(route.start, route.end))
              : route.leg.distanceKm
          const tooltip = t(
            route.leg.roundTrip
              ? 'map.legTooltipRoundTrip'
              : 'map.legTooltip',
            { name: legName, distance },
          )
          const startName = t('map.markerStart', {
            n: route.index + 1,
            place: route.leg.startLabel,
          })
          const endName = t('map.markerEnd', {
            n: route.index + 1,
            place: route.leg.endLabel,
          })

          return (
            <Fragment key={route.leg.id}>
              {route.positions !== null && (
                <>
                  {!route.isFallback && (
                    <AnimatedPolyline
                      positions={route.positions}
                      geometryKey={route.geometryKey}
                      animate={route.leg.route !== null}
                      pathOptions={buildCasingOptions(route, resolvedTheme)}
                    />
                  )}
                  <AnimatedPolyline
                    positions={route.positions}
                    geometryKey={route.geometryKey}
                    animate={route.leg.route !== null}
                    pathOptions={buildPathOptions(route, resolvedTheme)}
                  />
                </>
              )}
              <RouteMarker
                lat={route.start.lat}
                lng={route.start.lng}
                label={String(route.index + 1)}
                color={route.color}
                variant="start"
                accessibleName={startName}
                tooltip={tooltip}
                legId={route.leg.id}
              />
              <RouteMarker
                lat={route.end.lat}
                lng={route.end.lng}
                label={String(route.index + 1)}
                color={route.color}
                variant="end"
                accessibleName={endName}
                tooltip={tooltip}
                legId={route.leg.id}
              />
              {route.isFallback && (
                <FallbackMarker
                  lat={(route.start.lat + route.end.lat) / 2}
                  lng={(route.start.lng + route.end.lng) / 2}
                  label={t('map.fallbackLabel')}
                />
              )}
            </Fragment>
          )
        })}

        <FitRoute points={points} pointsKey={pointsKey} />
        <ZoomTracker onChange={setZoomState} />
      </MapContainer>

      {isRouting && (
        <div
          role="status"
          className="absolute map-status top-[calc(env(safe-area-inset-top)+3.5rem)] z-[1000] mx-auto flex max-w-[24rem] items-center gap-2 rounded-lg border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm max-lg:top-[calc(env(safe-area-inset-top)+4.5rem)]"
        >
          <LoaderCircle
            aria-hidden
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
          {t('map.findingRoute')}
        </div>
      )}

      {!isRouting && fallbackRoutes.length > 0 && (
        <div
          role="status"
          className="absolute map-status top-[calc(env(safe-area-inset-top)+3.5rem)] z-[1000] mx-auto flex max-w-[24rem] flex-wrap items-center gap-2 rounded-lg border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm max-lg:top-[calc(env(safe-area-inset-top)+4.5rem)]"
        >
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          <span className="flex-1">{t('map.routeUnavailable')}</span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => retryFallbackRoutes(formatDistanceKm)}
          >
            <RotateCcw />
            {t('map.retry')}
          </Button>
        </div>
      )}

      {showEmptyHint && (
        <div
          role="status"
          className="absolute map-status top-[calc(env(safe-area-inset-top)+3.5rem)] z-[1000] mx-auto max-w-[24rem] rounded-lg border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm max-lg:top-[calc(env(safe-area-inset-top)+4.5rem)]"
        >
          {t('map.emptyHint')}
        </div>
      )}

      <div className="map-bottom-bar pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end justify-between gap-2">
        <p className="pointer-events-auto max-w-[calc(100%-3.5rem)] rounded-md border bg-background px-2 py-1 text-xs leading-snug text-muted-foreground shadow-sm">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            © OpenStreetMap contributors
          </a>
          <span aria-hidden> · </span>
          <a
            href="https://valhalla.github.io/valhalla/"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            {t('map.attribution')}
          </a>
        </p>

        <div className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-lg border bg-background/95 p-0.5 shadow-sm pointer-coarse:gap-1 pointer-coarse:p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="pointer-coarse:size-11"
            onClick={() => map?.zoomIn()}
            disabled={map === null || zoomState.zoom >= zoomState.max}
            aria-label={t('map.zoomIn')}
            title={t('map.zoomIn')}
          >
            <Plus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="pointer-coarse:size-11"
            onClick={() => map?.zoomOut()}
            disabled={map === null || zoomState.zoom <= zoomState.min}
            aria-label={t('map.zoomOut')}
            title={t('map.zoomOut')}
          >
            <Minus />
          </Button>
        </div>
      </div>
    </div>
  )
}
