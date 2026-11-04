import { ArrowDown } from 'lucide-react'
import type { TripResult } from '@/core'
import { useI18n } from '@/i18n'

interface TripTotalBarProps {
  /** Calculation result, or null when the trip is invalid. */
  result: TripResult | null
  /** Whether the bar is shown. Hidden once the result card is on screen. */
  visible: boolean
  /** Identifier of the result card the bar scrolls to. */
  targetId: string
}

/**
 * Sticky trip total for phones, where the result card sits below a long form.
 *
 * The bar keeps the amount in reach while the trip is edited and jumps to the
 * full result card when tapped. It is hidden from tablets and desktops, where
 * the result already lives beside the editor.
 *
 * @param result - Calculation result, or null when the trip is invalid.
 * @param visible - Whether the bar is shown.
 * @param targetId - Identifier of the result card the bar scrolls to.
 * @returns The sticky total bar, or null when it should not render.
 */
export function TripTotalBar({
  result,
  visible,
  targetId,
}: TripTotalBarProps) {
  // Initializations
  const { t, formatEuros } = useI18n()

  if (result === null || !visible) {
    return null
  }

  /**
   * Scroll the result card into view, honouring reduced-motion preferences.
   *
   * @returns Nothing. Scrolls the page.
   */
  function handleClick(): void {
    const target = document.getElementById(targetId)
    if (target === null) {
      return
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="trip-total-bar fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <button
        type="button"
        onClick={handleClick}
        aria-controls={targetId}
        className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <span className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {t('results.total')}
          </span>
          <span className="text-lg font-semibold tracking-tight text-primary tabular-nums">
            {formatEuros(result.totalCents)}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-primary">
          {t('results.title')}
          <ArrowDown aria-hidden className="size-4" />
        </span>
      </button>
    </div>
  )
}
