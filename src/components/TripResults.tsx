import { CircleAlert } from 'lucide-react'
import type { TripResult } from '@/backseat'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/i18n'

interface TripResultsProps {
  /** Number of legs in the editor, used to distinguish empty from invalid trips. */
  legsCount: number
  /** Calculation result, or null when the trip is invalid. */
  result: TripResult | null
  /** Validation message, or null when the trip is valid. */
  error: string | null
}

/**
 * Card showing the trip total, each passenger's share, and the leg breakdown.
 *
 * @param legsCount - Number of legs in the editor.
 * @param result - Calculation result, or null when the trip is invalid.
 * @param error - Validation message, or null when the trip is valid.
 * @returns The results card.
 */
export function TripResults({ legsCount, result, error }: TripResultsProps) {
  // Initializations
  const { t, formatDistanceKm, formatEuros, formatLiters } = useI18n()
  const namesById = new Map(
    (result?.passengers ?? []).map((passenger) => [
      passenger.id,
      passenger.name,
    ]),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {t('results.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {legsCount === 0 && (
          <p className="text-sm text-muted-foreground">
            {t('results.empty')}
          </p>
        )}

        {legsCount > 0 && error !== null && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {legsCount > 0 && error === null && result !== null && (
          <>
            <div className="flex items-baseline justify-between gap-3 border-b pb-3">
              <span className="text-sm font-medium">
                {t('results.total')}
              </span>
              <span
                key={result.totalCents}
                className="animate-in text-2xl font-semibold tracking-tight text-primary duration-200 tabular-nums fade-in-0 motion-reduce:animate-none"
              >
                {formatEuros(result.totalCents)}
              </span>
            </div>

            <div className="flex flex-col">
              {result.passengers.map((passenger, index) => (
                <div key={passenger.id} className="flex flex-col gap-2">
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between text-sm">
                    <span>{passenger.name}</span>
                    <span className="font-medium tabular-nums">
                      {formatEuros(passenger.totalCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t('results.perLeg')}</h3>
              {result.legs.map((leg, index) => (
                <div
                  key={leg.index}
                  className={
                    index === 0
                      ? 'flex flex-col gap-1 text-xs text-muted-foreground'
                      : 'flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground'
                  }
                >
                  <div className="text-sm font-medium text-foreground">
                    {t('results.leg', { n: leg.index + 1 })}
                    {leg.roundTrip ? ` · ${t('results.roundTrip')}` : ''}
                  </div>
                  <div>
                    {t('results.legSummary', {
                      distance: formatDistanceKm(leg.distanceKm),
                      liters: formatLiters(leg.liters),
                      fuel: formatEuros(leg.fuelCostCents),
                      tolls: formatEuros(leg.tollCents),
                    })}
                  </div>
                  <div>
                    {t('results.legTotal', {
                      total: formatEuros(leg.totalCents),
                      shares: leg.shares
                        .map(
                          (share) =>
                            `${namesById.get(share.passengerId) ?? share.passengerId} ${formatEuros(share.amountCents)}`,
                        )
                        .join(' · '),
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
