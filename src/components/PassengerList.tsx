import { useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/i18n'
import type { TranslationKey } from '@/i18n'
import { useTripStore } from '@/store/tripStore'

/**
 * Card listing the trip passengers with an inline add form.
 *
 * @returns The passenger management card.
 */
export function PassengerList() {
  // Initializations
  const { t } = useI18n()
  const passengers = useTripStore((state) => state.passengers)
  const paidById = useTripStore((state) => state.paidById)
  const addPassenger = useTripStore((state) => state.addPassenger)
  const removePassenger = useTripStore((state) => state.removePassenger)
  const setPaidBy = useTripStore((state) => state.setPaidBy)
  const [name, setName] = useState('')
  const [error, setError] = useState<TranslationKey | null>(null)

  /**
   * Validate the typed name and add the passenger when it is usable.
   *
   * @param event - Form submission event.
   * @returns Nothing. Adds the passenger and clears the field on success.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    // Validate the typed name
    const trimmedName = name.trim()
    if (trimmedName === '') {
      setError('passengers.errorEmpty')
      return
    }
    if (
      passengers.some(
        (passenger) => passenger.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setError('passengers.errorDuplicate')
      return
    }

    // Add the passenger and reset the form
    addPassenger(trimmedName)
    setName('')
    setError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {t('passengers.title')}
        </CardTitle>
        <CardAction>
          <Badge variant="secondary">{passengers.length}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {passengers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('passengers.empty')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {passengers.map((passenger) => (
              <Badge
                key={passenger.id}
                variant="secondary"
                className="gap-1 py-1 pr-1 pl-2.5"
              >
                {passenger.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-4 rounded-sm text-muted-foreground hover:text-foreground"
                  onClick={() => removePassenger(passenger.id)}
                  aria-label={t('passengers.remove', {
                    name: passenger.name,
                  })}
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <Input
            aria-label={t('passengers.nameLabel')}
            placeholder={t('passengers.addPlaceholder')}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
          />
          <Button type="submit" variant="outline">
            <Plus />
            {t('passengers.add')}
          </Button>
        </form>

        {error !== null && (
          <p className="text-sm text-destructive" role="alert">
            {t(error)}
          </p>
        )}

        {passengers.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="paid-by"
              className="text-xs font-medium text-muted-foreground"
            >
              {t('payment.paidBy')}
            </Label>
            <Select
              value={paidById ?? 'none'}
              onValueChange={(value) => {
                setPaidBy(value === 'none' ? null : value)
              }}
            >
              <SelectTrigger id="paid-by" className="w-36">
                {paidById === null ? (
                  <span
                    data-slot="select-value"
                    className="line-clamp-1 text-muted-foreground"
                  >
                    {t('payment.paidByPlaceholder')}
                  </span>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent position="popper" align="end" sideOffset={4}>
                <SelectItem value="none">
                  {t('payment.paidByNone')}
                </SelectItem>
                {passengers.map((passenger) => (
                  <SelectItem key={passenger.id} value={passenger.id}>
                    {passenger.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
