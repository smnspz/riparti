import type { CSSProperties, ReactNode } from 'react'
import type { LegResult } from '@/core'
import { useI18n } from '@/i18n'
import { routeColor } from '@/lib/routeColors'

/**
 * Metric cell in the trip totals strip.
 *
 * @param icon - Icon identifying the metric.
 * @param label - Metric name.
 * @param value - Primary value.
 * @param detail - Optional supporting value.
 * @returns One metric cell.
 */
export function TripMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="[&_svg]:size-3.5">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-sm font-semibold tabular-nums">
        {value}
      </span>
      {detail !== undefined && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {detail}
        </span>
      )}
    </div>
  )
}

/**
 * Horizontal split of a cost between fuel and tolls.
 *
 * @param fuelCents - Fuel cost in cents.
 * @param tollCents - Toll cost in cents.
 * @returns The cost split bar and its legend.
 */
export function CostSplit({
  fuelCents,
  tollCents,
}: {
  fuelCents: number
  tollCents: number
}) {
  // Initializations
  const { t, formatEuros } = useI18n()
  const totalCents = fuelCents + tollCents
  const fuelPercent = totalCents === 0 ? 0 : (fuelCents / totalCents) * 100
  const tollPercent = totalCents === 0 ? 0 : (tollCents / totalCents) * 100

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={t('shared.costSplitLabel', {
          fuel: formatEuros(fuelCents),
          tolls: formatEuros(tollCents),
        })}
        className="flex h-2 overflow-hidden rounded-full bg-muted"
      >
        <span
          aria-hidden
          className="shared-bar h-full bg-primary"
          style={{ width: `${fuelPercent}%` }}
        />
        <span
          aria-hidden
          className="shared-bar h-full bg-muted-foreground/60"
          style={{ width: `${tollPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-primary" />
          {t('shared.fuel')}
          <span className="font-medium text-foreground tabular-nums">
            {formatEuros(fuelCents)}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full bg-muted-foreground/60"
          />
          {t('shared.tolls')}
          <span className="font-medium text-foreground tabular-nums">
            {formatEuros(tollCents)}
          </span>
        </span>
      </div>
    </div>
  )
}

/**
 * One leg in the shared summary, linked to its map markers.
 *
 * @param leg - Calculated leg result.
 * @param index - Zero-based position of the leg.
 * @param title - Display name of the leg.
 * @param namesById - Passenger names indexed by id.
 * @returns The leg summary card.
 */
export function SharedLegCard({
  leg,
  index,
  title,
  namesById,
}: {
  leg: LegResult
  index: number
  title: string
  namesById: Map<string, string>
}) {
  // Initializations
  const { t, formatEuros, formatDistanceKm, formatLiters } = useI18n()
  const totalCents = leg.fuelCostCents + leg.tollCents
  const fuelPercent =
    totalCents === 0 ? 0 : (leg.fuelCostCents / totalCents) * 100
  const tollPercent = totalCents === 0 ? 0 : (leg.tollCents / totalCents) * 100

  return (
    <article
      id={`leg-card-leg-${index}`}
      tabIndex={-1}
      className="rounded-lg border bg-background p-3.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className="leg-index-badge mt-0.5"
            style={{ '--marker-color': routeColor(index) } as CSSProperties}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3
              className="truncate font-heading text-sm font-semibold"
              title={title}
            >
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('shared.legMeta', {
                distance: formatDistanceKm(leg.distanceKm),
                liters: formatLiters(leg.liters),
              })}
              {leg.roundTrip ? ` · ${t('results.roundTrip')}` : ''}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatEuros(leg.totalCents)}
        </span>
      </div>

      <div
        role="img"
        aria-label={t('shared.legCostSplitLabel', {
          fuel: formatEuros(leg.fuelCostCents),
          tolls: formatEuros(leg.tollCents),
        })}
        className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <span
          aria-hidden
          className="shared-bar h-full bg-primary"
          style={{ width: `${fuelPercent}%` }}
        />
        <span
          aria-hidden
          className="shared-bar h-full bg-muted-foreground/60"
          style={{ width: `${tollPercent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {t('shared.legCosts', {
          fuel: formatEuros(leg.fuelCostCents),
          tolls: formatEuros(leg.tollCents),
        })}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {leg.shares.map((share) => (
          <span
            key={share.passengerId}
            className="rounded-full bg-muted px-2 py-0.5 text-xs"
          >
            {namesById.get(share.passengerId) ?? share.passengerId}
            <span className="ml-1 font-medium tabular-nums">
              {formatEuros(share.amountCents)}
            </span>
          </span>
        ))}
      </div>
    </article>
  )
}
