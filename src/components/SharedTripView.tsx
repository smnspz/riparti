import {
  useMemo,
  type ReactNode,
} from 'react'
import {
  ArrowUpRight,
  CircleAlert,
  Coins,
  Fuel,
  Route,
  Wallet,
} from 'lucide-react'
import { calculateTrip, type TripResult } from '@/core'
import { AppHeader } from '@/components/AppHeader'
import { MapView } from '@/components/MapView'
import {
  CostSplit,
  SharedLegCard,
  TripMetric,
} from '@/components/SharedTripSummary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { translateTripError } from '@/i18n/tripErrors'
import { formatLegName } from '@/lib/format'
import {
  buildPayPalMeUrl,
  isValidPayPalHandle,
  normalizePayPalHandle,
} from '@/lib/payment'
import { routeColor } from '@/lib/routeColors'
import { buildTrip } from '@/lib/trip'
import type { SharedTrip } from '@/lib/shareLink'
import type { LegDraft } from '@/types'
import '@/App.css'

interface SharedTripViewProps {
  /** Trip decoded from the share link. */
  trip: SharedTrip
}

/** Totals shown above the passenger shares. */
interface TripTotals {
  /** Effective distance of every leg, in kilometres. */
  distanceKm: number
  /** Fuel burned on every leg, in litres. */
  liters: number
  /** Fuel cost of the whole trip, in cents. */
  fuelCents: number
  /** Toll cost of the whole trip, in cents. */
  tollCents: number
}

/**
 * Sum the trip totals shown in the summary strip.
 *
 * @param result - Calculated trip result.
 * @returns The distance, fuel volume, fuel cost, and tolls.
 */
function sumTotals(result: TripResult): TripTotals {
  return result.legs.reduce<TripTotals>(
    (totals, leg) => ({
      distanceKm: totals.distanceKm + leg.distanceKm,
      liters: totals.liters + leg.liters,
      fuelCents: totals.fuelCents + leg.fuelCostCents,
      tollCents: totals.tollCents + leg.tollCents,
    }),
    { distanceKm: 0, liters: 0, fuelCents: 0, tollCents: 0 },
  )
}

/**
 * Build the URL of the editor without the share hash.
 *
 * @returns The current app path with its query string.
 */
function homeHref(): string {
  return `${window.location.pathname}${window.location.search}`
}

/**
 * Read-only summary of a trip shared through a link.
 *
 * The page pairs the trip map with a visual split: total cost, passenger
 * shares, and the fuel and tolls behind each leg.
 *
 * @param trip - Trip decoded from the share link.
 * @returns The shareable trip summary.
 */
export function SharedTripView({ trip }: SharedTripViewProps) {
  // Initializations
  const { t, formatEuros, formatDistanceKm, formatLiters } = useI18n()
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateTrip(
          buildTrip(trip.passengers, trip.legs),
        ),
        failure: null as unknown,
      }
    } catch (error) {
      return { result: null, failure: error }
    }
  }, [trip.passengers, trip.legs])
  const result = calculation.result
  const error =
    calculation.failure === null
      ? null
      : translateTripError(calculation.failure, t)

  // Return a readable failure when the link cannot be calculated
  if (result === null) {
    return (
      <SharedTripShell legs={trip.legs}>
        <div className="flex flex-col items-start gap-4">
          <span className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
            <CircleAlert />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">
              {t('shared.invalidTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {error ?? t('shared.invalidDescription')}
            </p>
          </div>
          <Button asChild>
            <a href={homeHref()}>{t('shared.openApp')}</a>
          </Button>
        </div>
      </SharedTripShell>
    )
  }

  // Initializations
  const totals = sumTotals(result)
  const payer =
    result.passengers.find((passenger) => passenger.id === trip.paidById) ??
    null
  const requestHandle = normalizePayPalHandle(trip.paypalHandle)
  const canRequest = payer !== null && isValidPayPalHandle(requestHandle)
  const namesById = new Map(
    result.passengers.map((passenger) => [passenger.id, passenger.name]),
  )
  const legNames = trip.legs.map((leg, index) =>
    formatLegName(leg, t('leg.title', { n: index + 1 })),
  )

  return (
    <SharedTripShell legs={trip.legs}>
      <section aria-labelledby="shared-total-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2
              id="shared-total-title"
              className="text-sm font-medium text-muted-foreground"
            >
              {t('results.total')}
            </h2>
            <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
              {formatEuros(result.totalCents)}
            </p>
          </div>
          {payer !== null && (
            <Badge variant="secondary" className="gap-1">
              <Wallet aria-hidden className="size-3" />
              {t('shared.paidBy', { name: payer.name })}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t('shared.tripMeta', {
            legs: result.legs.length,
            passengers: result.passengers.length,
          })}
        </p>

        <div className="grid grid-cols-3 divide-x rounded-lg border bg-background">
          <TripMetric
            icon={<Route aria-hidden />}
            label={t('shared.distance')}
            value={`${formatDistanceKm(totals.distanceKm)} km`}
          />
          <TripMetric
            icon={<Fuel aria-hidden />}
            label={t('shared.fuel')}
            value={formatEuros(totals.fuelCents)}
            detail={`${formatLiters(totals.liters)} L`}
          />
          <TripMetric
            icon={<Coins aria-hidden />}
            label={t('shared.tolls')}
            value={formatEuros(totals.tollCents)}
          />
        </div>

        <CostSplit
          fuelCents={totals.fuelCents}
          tollCents={totals.tollCents}
        />
      </section>

      <section
        aria-labelledby="shared-shares-title"
        className="border-t pt-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="shared-shares-title"
            className="font-heading text-base font-semibold"
          >
            {t('results.summaryShares')}
          </h2>
          {canRequest && (
            <span className="text-xs text-muted-foreground">
              {t('shared.requestHint')}
            </span>
          )}
        </div>

        <ul className="mt-4 flex flex-col gap-4">
          {result.passengers.map((passenger) => {
            const isPayer = passenger.id === payer?.id
            const percent =
              result.totalCents === 0
                ? 0
                : (passenger.totalCents / result.totalCents) * 100
            const legIndexes = trip.legs.flatMap((leg, index) =>
              leg.passengerIds.includes(passenger.id) ? [index] : [],
            )
            const requestUrl =
              canRequest && !isPayer
                ? buildPayPalMeUrl(requestHandle, passenger.totalCents)
                : null

            return (
              <li key={passenger.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium">
                      {passenger.name}
                    </span>
                    {isPayer && (
                      <Badge variant="secondary">
                        {t('results.payerBadge')}
                      </Badge>
                    )}
                    <span
                      aria-label={t('shared.passengerLegs', {
                        legs:
                          legIndexes.length === 0
                            ? t('shared.noLegs')
                            : legIndexes
                                .map((index) => legNames[index])
                                .join(', '),
                      })}
                      className="flex items-center gap-1"
                    >
                      {legIndexes.map((index) => (
                        <span
                          key={index}
                          aria-hidden
                          className="grid size-4 place-items-center rounded-full text-[10px] leading-none font-bold text-white"
                          style={{ backgroundColor: routeColor(index) }}
                        >
                          {index + 1}
                        </span>
                      ))}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatEuros(passenger.totalCents)}
                  </span>
                </div>

                <div
                  role="img"
                  aria-label={t('shared.shareOfTotal', {
                    name: passenger.name,
                    percent: Math.round(percent),
                  })}
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="shared-bar h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {requestUrl !== null && (
                  <a
                    href={requestUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('results.requestLabel', {
                      name: passenger.name,
                      amount: formatEuros(passenger.totalCents),
                    })}
                    className="inline-flex w-fit items-center gap-1 rounded text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {t('results.request')}
                    <ArrowUpRight aria-hidden className="size-3" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="shared-legs-title" className="border-t pt-5">
        <h2
          id="shared-legs-title"
          className="font-heading text-base font-semibold"
        >
          {t('results.summaryLegs')}
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          {result.legs.map((leg, index) => (
            <SharedLegCard
              key={leg.index}
              leg={leg}
              index={index}
              title={legNames[index] ?? t('leg.title', { n: index + 1 })}
              namesById={namesById}
            />
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t pt-4 text-xs text-muted-foreground">
        <a
          href={homeHref()}
          className="inline-flex items-center gap-1 rounded font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t('shared.newTrip')}
          <ArrowUpRight aria-hidden className="size-3" />
        </a>
      </footer>
    </SharedTripShell>
  )
}

/**
 * Page frame shared by a valid summary and its error state.
 *
 * @param legs - Legs drawn on the map.
 * @param children - Summary content shown beside the map.
 * @returns The header, map, and summary column.
 */
function SharedTripShell({
  legs,
  children,
}: {
  legs: LegDraft[]
  children: ReactNode
}) {
  // Initializations
  const { t } = useI18n()

  return (
    <div className="flex min-h-svh flex-col bg-muted/40 lg:h-svh lg:overflow-hidden">
      <AppHeader title={t('shared.title')}>
        <Button asChild variant="ghost" size="sm">
          <a href={homeHref()}>
            {t('shared.newTrip')}
            <ArrowUpRight data-icon="inline-end" />
          </a>
        </Button>
      </AppHeader>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <section
          aria-label={t('map.title')}
          className="relative isolate h-[46svh] min-h-72 border-b max-lg:order-1 lg:h-auto lg:border-r lg:border-b-0"
        >
          <MapView legs={legs} readOnly />
        </section>

        <aside className="min-h-0 overflow-y-auto bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 max-lg:order-2 lg:p-7">
          <div className="flex flex-col gap-5">{children}</div>
        </aside>
      </main>
    </div>
  )
}

/**
 * Page shown when a share link cannot be read.
 *
 * @returns The invalid-link page.
 */
export function SharedTripError() {
  // Initializations
  const { t } = useI18n()

  return (
    <div className="grid min-h-svh place-items-center bg-muted/40 p-6">
      <div className="flex max-w-md flex-col items-start gap-4 rounded-xl border bg-background p-6">
        <span className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
          <CircleAlert />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold">
            {t('shared.invalidTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('shared.invalidDescription')}
          </p>
        </div>
        <Button asChild>
          <a href={homeHref()}>{t('shared.openApp')}</a>
        </Button>
      </div>
    </div>
  )
}
