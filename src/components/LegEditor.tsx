import { TriangleAlert, Trash2 } from 'lucide-react'
import { PlaceSearch } from '@/components/PlaceSearch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useI18n } from '@/i18n'
import { formatLegName } from '@/lib/format'
import type { LatLng } from '@/lib/geo'
import type { RoutePreference } from '@/lib/routing'
import { cn } from '@/lib/utils'
import type { LegDraft, PassengerDraft } from '@/types'

interface LegEditorProps {
  /** Leg being edited. */
  leg: LegDraft
  /** Zero-based position of the leg in the trip. */
  index: number
  /** Passengers that can be selected for the leg. */
  passengers: PassengerDraft[]
  /** Apply a partial update to the leg. */
  onChange: (legId: string, patch: Partial<LegDraft>) => void
  /** Remove the leg from the trip. */
  onRemove: (legId: string) => void
  /** Set an endpoint from a place chosen in the search field. */
  onSelectPlace: (
    legId: string,
    field: 'start' | 'end',
    point: LatLng,
    label: string,
  ) => void
  /** Show one of the computed route options. */
  onSelectRoute: (legId: string, preference: RoutePreference) => void
  /** Replace the passengers present on the leg. */
  onChangePassengers: (legId: string, passengerIds: string[]) => void
}

/**
 * Card for a single leg, including its endpoints, route choice, and passengers.
 *
 * @param leg - Leg being edited.
 * @param index - Zero-based position of the leg in the trip.
 * @param passengers - Passengers that can be selected for the leg.
 * @param onChange - Applies a partial update to the leg.
 * @param onRemove - Removes the leg from the trip.
 * @param onSelectPlace - Sets an endpoint from a chosen place.
 * @param onSelectRoute - Shows one of the computed route options.
 * @param onChangePassengers - Replaces the passengers present on the leg.
 * @returns The leg editor card.
 */
export function LegEditor({
  leg,
  index,
  passengers,
  onChange,
  onRemove,
  onSelectPlace,
  onSelectRoute,
  onChangePassengers,
}: LegEditorProps) {
  // Initializations
  const { t, formatDistanceKm, formatEuros } = useI18n()
  const hasTollFreeOption = leg.routeOptions.some(
    (option) => option.preference === 'no-tolls',
  )
  const legName = formatLegName(leg, t('leg.title', { n: index + 1 }))

  return (
    <Card
      size="sm"
      className="animate-in duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
    >
      <CardHeader>
        <CardTitle className="truncate text-sm font-semibold" title={legName}>
          {legName}
        </CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(leg.id)}
            aria-label={t('leg.remove', { n: index + 1 })}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`leg-${leg.id}-start`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t('leg.from')}
            </Label>
            <PlaceSearch
              id={`leg-${leg.id}-start`}
              label={t('leg.startLabel', { n: index + 1 })}
              placeholder={t('leg.searchStart')}
              value={leg.startLabel}
              onSelect={(point, label) =>
                onSelectPlace(leg.id, 'start', point, label)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`leg-${leg.id}-end`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t('leg.to')}
            </Label>
            <PlaceSearch
              id={`leg-${leg.id}-end`}
              label={t('leg.endLabel', { n: index + 1 })}
              placeholder={t('leg.searchEnd')}
              value={leg.endLabel}
              onSelect={(point, label) =>
                onSelectPlace(leg.id, 'end', point, label)
              }
            />
          </div>
        </div>

        {leg.routeOptions.length > 1 && (
          <fieldset className="flex animate-in flex-col duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
              {t('leg.route')}
            </legend>
            <RadioGroup
              value={leg.routePreference ?? ''}
              onValueChange={(value) => {
                if (value === 'fastest' || value === 'no-tolls') {
                  onSelectRoute(leg.id, value)
                }
              }}
              className="gap-2"
            >
              {leg.routeOptions.map((option) => (
                <Label
                  key={option.preference}
                  htmlFor={`leg-${leg.id}-route-${option.preference}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 font-normal transition-colors',
                    leg.routePreference === option.preference
                      ? 'border-primary/50 bg-primary/5'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <RadioGroupItem
                    id={`leg-${leg.id}-route-${option.preference}`}
                    value={option.preference}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {option.preference === 'no-tolls'
                        ? t('leg.avoidTolls')
                        : t('leg.fastest')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceKm(option.distanceKm)} km ·{' '}
                      {option.hasToll ? t('leg.usesTolls') : t('leg.noTolls')}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
        )}

        {hasTollFreeOption && (
          <p className="text-xs text-muted-foreground">
            {t('leg.tollFreeHint', { amount: formatEuros(0) })}
          </p>
        )}

        {leg.routeStatus === 'loading' && (
          <div
            className="flex flex-col gap-2"
            role="status"
            aria-label={t('leg.findingRoute')}
          >
            {[0, 1].map((row) => (
              <div
                key={row}
                className="flex items-center gap-2.5 rounded-lg border p-2.5"
              >
                <Skeleton className="size-4 shrink-0 rounded-full motion-reduce:animate-none" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24 motion-reduce:animate-none" />
                  <Skeleton className="h-3 w-36 motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        )}

        {leg.routeStatus === 'error' && (
          <Alert variant="destructive" className="py-2">
            <TriangleAlert />
            <AlertDescription className="text-xs">
              {t('leg.routeError')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`leg-${leg.id}-distance`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t('leg.distance')}
            </Label>
            <Input
              id={`leg-${leg.id}-distance`}
              inputMode="decimal"
              placeholder="0.0"
              value={leg.distanceKm}
              onChange={(event) =>
                onChange(leg.id, { distanceKm: event.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`leg-${leg.id}-consumption`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t('leg.consumption')}
            </Label>
            <Input
              id={`leg-${leg.id}-consumption`}
              inputMode="decimal"
              placeholder="6.5"
              value={leg.fuelConsumption}
              onChange={(event) =>
                onChange(leg.id, { fuelConsumption: event.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`leg-${leg.id}-fuel-price`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t('leg.fuelPrice')}
            </Label>
            <Input
              id={`leg-${leg.id}-fuel-price`}
              inputMode="decimal"
              placeholder="1.89"
              value={leg.fuelPriceEuros}
              onChange={(event) =>
                onChange(leg.id, { fuelPriceEuros: event.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`leg-${leg.id}-tolls`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t('leg.tolls')}
            </Label>
            <Input
              id={`leg-${leg.id}-tolls`}
              inputMode="decimal"
              placeholder="0.00"
              value={leg.tollsEuros}
              onChange={(event) =>
                onChange(leg.id, { tollsEuros: event.target.value })
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id={`leg-${leg.id}-round-trip`}
            checked={leg.roundTrip}
            onCheckedChange={(checked) =>
              onChange(leg.id, { roundTrip: checked === true })
            }
          />
          <Label
            htmlFor={`leg-${leg.id}-round-trip`}
            className="font-normal"
          >
            {t('leg.roundTrip')}{' '}
            <span className="text-muted-foreground">
              {t('leg.roundTripHint')}
            </span>
          </Label>
        </div>

        <fieldset className="flex flex-col">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t('leg.passengers')}
          </legend>
          {passengers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('leg.addPassengerFirst')}
            </p>
          ) : (
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={leg.passengerIds}
              onValueChange={(value) =>
                onChangePassengers(leg.id, value)
              }
              className="w-full flex-wrap justify-start"
              aria-label={t('leg.passengersOnLeg', { n: index + 1 })}
            >
              {passengers.map((passenger) => (
                <ToggleGroupItem
                  key={passenger.id}
                  value={passenger.id}
                  aria-label={passenger.name}
                  className="rounded-lg px-3 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:hover:bg-primary/15"
                >
                  {passenger.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </fieldset>
      </CardContent>
    </Card>
  )
}
