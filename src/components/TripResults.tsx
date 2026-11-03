import { useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  Share2,
} from 'lucide-react'
import type { TripResult } from '@/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/i18n'
import { OPEN_SETTINGS_EVENT } from '@/lib/events'
import { formatLegName } from '@/lib/format'
import {
  buildPayPalMeUrl,
  isValidPayPalHandle,
  normalizePayPalHandle,
} from '@/lib/payment'
import type { LegDraft } from '@/types'

interface TripResultsProps {
  /** Legs currently declared in the editor. */
  legs: LegDraft[]
  /** Calculation result, or null when the trip is invalid. */
  result: TripResult | null
  /** Validation message, or null when the trip is valid. */
  error: string | null
  /** Id of the passenger who paid the trip, if chosen. */
  paidById: string | null
  /** PayPal.Me handle used for payment requests. */
  paypalHandle: string
}

/**
 * Card showing the trip total, each passenger's share, and the leg breakdown.
 *
 * Each share can be requested through PayPal.Me once the payer and their
 * handle are known, and the whole summary can be shared as plain text.
 *
 * @param legs - Legs currently declared in the editor.
 * @param result - Calculation result, or null when the trip is invalid.
 * @param error - Validation message, or null when the trip is valid.
 * @param paidById - Id of the passenger who paid the trip, if chosen.
 * @param paypalHandle - PayPal.Me handle used for payment requests.
 * @returns The results card.
 */
export function TripResults({
  legs,
  result,
  error,
  paidById,
  paypalHandle,
}: TripResultsProps) {
  // Initializations
  const { t, formatDistanceKm, formatEuros, formatLiters } = useI18n()
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const focusPayerOnClose = useRef(false)
  const legsCount = legs.length
  const legNames = legs.map((leg, index) =>
    formatLegName(leg, t('leg.title', { n: index + 1 })),
  )
  const namesById = new Map(
    (result?.passengers ?? []).map((passenger) => [
      passenger.id,
      passenger.name,
    ]),
  )
  const payer =
    result?.passengers.find((passenger) => passenger.id === paidById) ?? null
  const requestHandle = normalizePayPalHandle(paypalHandle)
  const canRequest = payer !== null && isValidPayPalHandle(requestHandle)
  const canNativeShare = typeof navigator.share === 'function'
  const legSummaries = (result?.legs ?? []).map((leg) => {
    const name = legNames[leg.index] ?? t('leg.title', { n: leg.index + 1 })
    const title = `${name}${leg.roundTrip ? ` · ${t('results.roundTrip')}` : ''}`
    const summary = t('results.legSummary', {
      distance: formatDistanceKm(leg.distanceKm),
      liters: formatLiters(leg.liters),
      fuel: formatEuros(leg.fuelCostCents),
      tolls: formatEuros(leg.tollCents),
    })
    const shares = leg.shares
      .map(
        (share) =>
          `${namesById.get(share.passengerId) ?? share.passengerId} ${formatEuros(share.amountCents)}`,
      )
      .join(' · ')
    const totalAmount = formatEuros(leg.totalCents)
    return {
      key: leg.index,
      title,
      summary,
      totalAmount,
      shares,
      cardTotal: t('results.legTotal', {
        total: totalAmount,
        shares,
      }),
    }
  })

  const summaryText = result === null ? '' : buildSummaryText()

  /**
   * Build the plain-text summary shared with passengers.
   *
   * @returns The summary text, or an empty string without a result.
   */
  function buildSummaryText(): string {
    if (result === null) {
      return ''
    }

    // Write the total and who paid
    const lines = [
      t('results.summaryTitle'),
      '',
      `${t('results.total')}: ${formatEuros(result.totalCents)}`,
    ]
    if (payer !== null) {
      lines.push(`${t('payment.paidBy')}: ${payer.name}`)
    }

    // Write each passenger's share, with a payment link when available
    lines.push('', t('results.summaryShares'))
    for (const passenger of result.passengers) {
      const amount = formatEuros(passenger.totalCents)
      const isPayer = passenger.id === payer?.id
      const requestUrl =
        canRequest && !isPayer
          ? buildPayPalMeUrl(requestHandle, passenger.totalCents)
          : null
      if (isPayer) {
        lines.push(
          `- ${t('results.summaryPayer', { name: passenger.name, amount })}`,
        )
      } else {
        lines.push(
          `- ${t('results.summaryPassenger', { name: passenger.name, amount })}`,
        )
        if (requestUrl !== null) {
          lines.push(
            `  ${t('results.summaryPaypal', { url: requestUrl })}`,
          )
        }
      }
    }

    // Write each leg as its own readable block
    lines.push('', t('results.summaryLegs'))
    legSummaries.forEach((leg, index) => {
      if (index > 0) {
        lines.push('')
      }
      lines.push(leg.title)
      lines.push(`  ${leg.summary}`)
      lines.push(
        `  ${t('results.summaryLegTotal', { total: leg.totalAmount })}`,
      )
      lines.push(
        `  ${t('results.summaryLegShares', { shares: leg.shares })}`,
      )
    })

    return lines.join('\n')
  }

  /**
   * Copy the summary to the clipboard.
   *
   * @returns Nothing. Writes the text and reports the outcome.
   */
  async function handleCopy(): Promise<void> {
    if (summaryText === '') {
      return
    }

    try {
      await navigator.clipboard.writeText(summaryText)
      setCopyFailed(false)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyFailed(true)
    }
  }

  /**
   * Open the system share sheet with the summary.
   *
   * @returns Nothing. Falls back to copying when sharing fails.
   */
  async function handleNativeShare(): Promise<void> {
    if (summaryText === '') {
      return
    }

    try {
      await navigator.share({
        title: t('results.summaryTitle'),
        text: summaryText,
      })
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === 'AbortError'
      ) {
        return
      }
      await handleCopy()
    }
  }

  /**
   * Close the dialog and point at the payer selector.
   *
   * @returns Nothing. Scrolls to and focuses the payer control.
   */
  function handleChoosePayer(): void {
    focusPayerOnClose.current = true
    setShareOpen(false)
  }

  /**
   * Close the dialog and open the settings.
   *
   * @returns Nothing. Dispatches the settings event.
   */
  function handleOpenSettings(): void {
    setShareOpen(false)
    window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
  }

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

            {payer === null && result.passengers.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {t('results.choosePayer')}
              </p>
            )}

            {payer !== null && !canRequest && (
              <p className="text-xs text-muted-foreground">
                {t('results.paymentHint', { name: payer.name })}
              </p>
            )}

            <div className="flex flex-col">
              {result.passengers.map((passenger, index) => {
                const isPayer = passenger.id === payer?.id
                const requestUrl =
                  canRequest && !isPayer
                    ? buildPayPalMeUrl(
                        requestHandle,
                        passenger.totalCents,
                      )
                    : null
                return (
                  <div key={passenger.id} className="flex flex-col gap-2">
                    {index > 0 && <Separator />}
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{passenger.name}</span>
                        {isPayer && (
                          <Badge variant="secondary">
                            {t('results.payerBadge')}
                          </Badge>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="font-medium tabular-nums">
                          {formatEuros(passenger.totalCents)}
                        </span>
                        {requestUrl !== null && (
                          <Button
                            asChild
                            variant="ghost"
                            size="xs"
                            className="text-primary"
                          >
                            <a
                              href={requestUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={t('results.requestLabel', {
                                name: passenger.name,
                                amount: formatEuros(passenger.totalCents),
                              })}
                            >
                              {t('results.request')}
                              <ArrowUpRight data-icon="inline-end" />
                            </a>
                          </Button>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t('results.perLeg')}</h3>
              {legSummaries.map((leg, index) => (
                <div
                  key={leg.key}
                  className={
                    index === 0
                      ? 'flex flex-col gap-1 text-xs text-muted-foreground'
                      : 'flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground'
                  }
                >
                  <div className="text-sm font-medium text-foreground">
                    {leg.title}
                  </div>
                  <div>{leg.summary}</div>
                  <div>{leg.cardTotal}</div>
                </div>
              ))}
            </div>

            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
                  <Share2 />
                  {t('results.share')}
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
                showCloseButton={false}
                onCloseAutoFocus={(event) => {
                  if (!focusPayerOnClose.current) {
                    return
                  }
                  event.preventDefault()
                  focusPayerOnClose.current = false
                  const trigger = document.getElementById('paid-by')
                  trigger?.scrollIntoView({ block: 'center' })
                  trigger?.focus()
                }}
              >
                <DialogHeader>
                  <DialogTitle>{t('results.share')}</DialogTitle>
                  <DialogDescription>
                    {t('results.shareDescription')}
                  </DialogDescription>
                </DialogHeader>

                {canRequest && payer !== null ? (
                  <p className="text-xs text-muted-foreground">
                    {t('results.shareIncludesPaypal', { name: payer.name })}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p>
                      {payer === null
                        ? t('results.shareNeedPayer')
                        : t('results.paymentHint', { name: payer.name })}
                    </p>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={
                          payer === null
                            ? handleChoosePayer
                            : handleOpenSettings
                        }
                      >
                        {payer === null
                          ? t('results.choosePayerAction')
                          : t('results.openSettings')}
                      </Button>
                    </div>
                  </div>
                )}

                <pre
                  tabIndex={0}
                  aria-label={t('results.summaryTitle')}
                  className="max-h-[50dvh] overflow-auto rounded-lg border bg-muted/30 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap break-words outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {summaryText}
                </pre>

                {copyFailed && (
                  <p className="text-xs text-destructive" role="alert">
                    {t('results.copyFailed')}
                  </p>
                )}
                <span role="status" className="sr-only">
                  {copied ? t('results.copied') : ''}
                </span>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      {t('results.close')}
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant={canNativeShare ? 'outline' : 'default'}
                    onClick={() => void handleCopy()}
                  >
                    {copied ? <Check /> : <Copy />}
                    {copied ? t('results.copied') : t('results.copy')}
                  </Button>
                  {canNativeShare && (
                    <Button
                      type="button"
                      onClick={() => void handleNativeShare()}
                    >
                      <Share2 />
                      {t('results.shareAction')}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  )
}
