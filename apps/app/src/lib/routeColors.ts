import type { ResolvedTheme } from '@/theme'

/**
 * Identity colours for markers and card badges.
 *
 * These sit behind white text, so they stay in the 600–700 range where white
 * keeps at least 4.5:1 in both themes.
 */
const ROUTE_COLORS = [
  '#0f766e',
  '#92400e',
  '#1d4ed8',
  '#be185d',
  '#3f6212',
  '#7c3aed',
]

/**
 * Line colours for light map tiles.
 *
 * Dark enough to separate from pale land, roads, and water.
 */
const LIGHT_LINE_COLORS = ROUTE_COLORS

/**
 * Line colours for the inverted dark tiles.
 *
 * 300–400 level hues, so the line stays brighter than the tile underneath.
 */
const DARK_LINE_COLORS = [
  '#5eead4',
  '#fbbf24',
  '#93c5fd',
  '#f9a8d4',
  '#bef264',
  '#c4b5fd',
]

/** Fallback colour when the palette lookup unexpectedly fails. */
const FALLBACK_COLOR = '#0f766e'

/**
 * Colour assigned to a leg for markers and card badges.
 *
 * The same colour paints the markers and the leg card badge, so the map and
 * the editor stay recognisably linked.
 *
 * @param index - Zero-based position of the leg.
 * @returns A CSS colour for the leg identity.
 */
export function routeColor(index: number): string {
  return ROUTE_COLORS[index % ROUTE_COLORS.length] ?? FALLBACK_COLOR
}

/**
 * Colour of a route line for the current theme.
 *
 * @param index - Zero-based position of the leg.
 * @param theme - Colour scheme applied to the document.
 * @returns A CSS colour for the line.
 */
export function routeLineColor(index: number, theme: ResolvedTheme): string {
  const palette = theme === 'dark' ? DARK_LINE_COLORS : LIGHT_LINE_COLORS
  return palette[index % palette.length] ?? FALLBACK_COLOR
}

/**
 * Halo drawn under a route line so it stays readable over any tile.
 *
 * White separates the line from dark terrain in light mode; near-black does
 * the same against the inverted dark tiles.
 *
 * @param theme - Colour scheme applied to the document.
 * @returns A CSS colour for the casing.
 */
export function routeCasingColor(theme: ResolvedTheme): string {
  return theme === 'dark' ? '#0a0a0a' : '#ffffff'
}

/**
 * Neutral colour of a straight-line estimate.
 *
 * Kept distinct from the leg palette so an estimate never reads as a route.
 *
 * @param theme - Colour scheme applied to the document.
 * @returns A CSS colour for the estimate line.
 */
export function routeEstimateColor(theme: ResolvedTheme): string {
  return theme === 'dark' ? '#a1a1aa' : '#52525b'
}
