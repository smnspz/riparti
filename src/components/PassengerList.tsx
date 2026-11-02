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
import type { PassengerDraft } from '@/types'

interface PassengerListProps {
  /** Passengers currently declared on the trip. */
  passengers: PassengerDraft[]
  /** Add a passenger with an already trimmed, unique name. */
  onAdd: (name: string) => void
  /** Remove a passenger and their membership from every leg. */
  onRemove: (passengerId: string) => void
}

/**
 * Card listing the trip passengers with an inline add form.
 *
 * @param passengers - Passengers currently declared on the trip.
 * @param onAdd - Called with a valid, unique passenger name.
 * @param onRemove - Called with the id of the passenger to remove.
 * @returns The passenger management card.
 */
export function PassengerList({
  passengers,
  onAdd,
  onRemove,
}: PassengerListProps) {
  // Initializations
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

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
      setError('Enter a passenger name.')
      return
    }
    if (
      passengers.some(
        (passenger) => passenger.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setError('That passenger already exists.')
      return
    }

    // Add the passenger and reset the form
    onAdd(trimmedName)
    setName('')
    setError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Passengers</CardTitle>
        <CardAction>
          <Badge variant="secondary">{passengers.length}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {passengers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add at least one passenger to start a trip.
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
                  className="size-4 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => onRemove(passenger.id)}
                  aria-label={`Remove ${passenger.name}`}
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <Input
            aria-label="Passenger name"
            placeholder="Add a passenger"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
          />
          <Button type="submit" variant="outline">
            <Plus />
            Add
          </Button>
        </form>

        {error !== null && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
