import { useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
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
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { formatLegName } from '@/lib/format'
import {
  buildPayPalMeUrl,
  isValidPayPalHandle,
  normalizePayPalHandle,
} from '@/lib/payment'
import { buildShareUrl, type SharedTrip } from '@/lib/shareLink'
import { useTripStore } from '@/store/tripStore'

interface TripResultsProps {
  /** Calculation result, or null when the trip is invalid. */
  result: TripResult | null
  /** Validation message, or null when the trip is valid. */
  error: string | null
}

/**
 * Card showing the trip total, each passenger's share, and the leg breakdown.
 *
 * Each share can be requested through PayPal.Me once the payer and their
 * handle are known, and the whole summary can be shared as a link with a
 * read-only map and visual breakdown.
 *
 * @param result - Calculation result, or null when the trip is invalid.
 * @param error - Validation message, or null when the trip is valid.
 * @returns The results card.
 */
export function TripResults({ result, error }: TripResultsProps) {
  // Initializations
  const { t, language, formatDistanceKm, formatEuros, formatLiters } =
    useI18n()
  const passengers = useTripStore((state) => state.passengers)
  const legs = useTripStore((state) => state.legs)
  const paidById = useTripStore((state) => state.paidById)
  const paypalHandle = useTripStore((state) => state.paypalHandle)
  const setSettingsOpen = useTripStore((state) => state.setSettingsOpen)
  const [linkCopied, setLinkCopied] = useState(false)
  const [linkCopyFailed, setLinkCopyFailed] = useState(false)
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

  const shareTrip = useMemo<SharedTrip>(
    () => ({
      language,
      passengers,
      legs,
      paidById,
      paypalHandle: canRequest ? requestHandle : '',
    }),
    [language, passengers, legs, paidById, canRequest, requestHandle],
  )
  const shareUrl = useMemo(
    () => (shareOpen ? buildShareUrl(shareTrip, window.location.href) : ''),
    [shareOpen, shareTrip],
  )

  /**
   * Copy the summary link to the clipboard.
   *
   * @returns Nothing. Writes the link and reports the outcome.
   */
  async function handleCopyLink(): Promise<void> {
    if (shareUrl === '') {
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setLinkCopyFailed(false)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      setLinkCopyFailed(true)
    }
  }

  /**
   * Open the system share sheet with the summary link.
   *
   * @returns Nothing. Falls back to copying when sharing fails.
   */
  async function handleNativeShare(): Promise<void> {
    if (shareUrl === '') {
      return
    }

    try {
      await navigator.share({
        title: t('results.share'),
        text: t('results.shareDescription'),
        url: shareUrl,
      })
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === 'AbortError'
      ) {
        return
      }
      await handleCopyLink()
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
   * @returns Nothing. Opens the settings dialog.
   */
  function handleOpenSettings(): void {
    setShareOpen(false)
    setSettingsOpen(true)
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
            <div className="flex items-baseline justify-between gap-3 border-b pb-4">
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

            <div className="flex flex-col divide-y">
              {result.passengers.map((passenger) => {
                const isPayer = passenger.id === payer?.id
                const requestUrl =
                  canRequest && !isPayer
                    ? buildPayPalMeUrl(
                        requestHandle,
                        passenger.totalCents,
                      )
                    : null
                return (
                  <div
                    key={passenger.id}
                    className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
                  >
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

            <Dialog
              open={shareOpen}
              onOpenChange={(open) => {
                setShareOpen(open)
                if (!open) {
                  setLinkCopied(false)
                  setLinkCopyFailed(false)
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
                  <Share2 />
                  {t('results.share')}
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto sm:max-w-lg"
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

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('results.shareLinkLabel')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      aria-label={t('results.shareLinkLabel')}
                      onFocus={(event) => {
                        event.currentTarget.select()
                      }}
                      className="min-w-0 flex-1 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => void handleCopyLink()}
                      aria-label={t('results.copyLink')}
                      title={t('results.copyLink')}
                    >
                      {linkCopied ? <Check /> : <Copy />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('results.shareLinkHint')}
                  </p>
                </div>

                {linkCopyFailed && (
                  <p className="text-xs text-destructive" role="alert">
                    {t('results.linkCopyFailed')}
                  </p>
                )}
                <span role="status" className="sr-only">
                  {linkCopied ? t('results.linkCopied') : ''}
                </span>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      {t('results.close')}
                    </Button>
                  </DialogClose>
                  <Button asChild variant="outline">
                    <a href={shareUrl} target="_blank" rel="noreferrer">
                      <ExternalLink />
                      {t('results.openPreview')}
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant={canNativeShare ? 'outline' : 'default'}
                    onClick={() => void handleCopyLink()}
                  >
                    {linkCopied ? <Check /> : <Copy />}
                    {linkCopied
                      ? t('results.linkCopied')
                      : t('results.copyLink')}
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
