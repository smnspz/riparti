import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { searchPlaces, type Place } from '@/lib/geocoding'
import type { LatLng } from '@/lib/geo'
import { cn } from '@/lib/utils'

interface PlaceSearchProps {
  /** Identifier of the trigger button, for the associated label. */
  id?: string
  /** Accessible label for the search control. */
  label: string
  /** Text shown when no place is selected. */
  placeholder: string
  /** Display name of the selected place, or an empty string. */
  value: string
  /** Called with the chosen point and its selection label. */
  onSelect: (point: LatLng, name: string) => void
}

/** Minimum characters before the geocoder is queried. */
const MIN_QUERY_LENGTH = 2

/** Pause before querying, so typing does not hit the service per keystroke. */
const SEARCH_DELAY_MS = 300

type SearchStatus = 'idle' | 'loading' | 'error'

/**
 * Place search control with a Google Maps-style command popover.
 *
 * The popover opens with an empty, focused search field. Results are debounced
 * and superseded requests are aborted.
 *
 * @param id - Identifier of the trigger button, for the associated label.
 * @param label - Accessible label for the search control.
 * @param placeholder - Text shown when no place is selected.
 * @param value - Display name of the selected place, or an empty string.
 * @param onSelect - Called with the chosen point and its selection label.
 * @returns The place search combobox.
 */
export function PlaceSearch({
  id,
  label,
  placeholder,
  value,
  onSelect,
}: PlaceSearchProps) {
  // Initializations
  const { language, t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')

  // Start every search from a clean query
  useEffect(() => {
    if (open) {
      setQuery('')
    }
  }, [open])

  // Query the geocoder after a short pause
  useEffect(() => {
    if (!open) {
      return
    }

    const trimmedQuery = query.trim()
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([])
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setStatus('loading')
      searchPlaces(trimmedQuery, {
        signal: controller.signal,
        language,
      })
        .then((places) => {
          setResults(places)
          setStatus('idle')
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }
          setResults([])
          setStatus('error')
        })
    }, SEARCH_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query, language])

  /**
   * Store the chosen place and close the popover.
   *
   * @param place - Suggestion chosen in the command list.
   * @returns Nothing. Updates the field and notifies the parent.
   */
  function selectPlace(place: Place): void {
    setOpen(false)
    onSelect(place.point, place.selectionLabel)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          className="w-full justify-start overflow-hidden font-normal"
        >
          <Search className="shrink-0 text-muted-foreground" />
          <span
            className={cn(
              'truncate',
              value === '' && 'text-muted-foreground',
            )}
          >
            {value === '' ? placeholder : value}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[1100] w-(--radix-popover-trigger-width) p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder={t('place.searchPlaceholder')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {status === 'loading' && results.length === 0 && (
              <div
                className="flex flex-col gap-1 p-2"
                role="status"
                aria-label={t('place.searching')}
              >
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex flex-col gap-1 px-2 py-1.5">
                    <Skeleton className="h-3.5 w-24 motion-reduce:animate-none" />
                    <Skeleton className="h-3 w-40 motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            )}
            {status === 'error' && (
              <CommandEmpty>{t('place.unavailable')}</CommandEmpty>
            )}
            {status === 'idle' && results.length === 0 && (
              <CommandEmpty>
                {query.trim().length < MIN_QUERY_LENGTH
                  ? t('place.typeMore')
                  : t('place.noResults')}
              </CommandEmpty>
            )}
            <CommandGroup>
              {results.map((place) => (
                <CommandItem
                  key={place.id}
                  value={place.id}
                  onSelect={() => selectPlace(place)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{place.name}</span>
                    {place.detail !== '' && (
                      <span className="text-xs text-muted-foreground">
                        {place.detail}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
