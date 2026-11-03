import { useState } from 'react'
import { Monitor, Moon, Settings, Sun, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useI18n } from '@/i18n'
import type { TranslationKey } from '@/i18n'
import {
  isValidPayPalHandle,
  normalizePayPalHandle,
} from '@/lib/payment'
import { useTripStore } from '@/store/tripStore'
import { cn } from '@/lib/utils'
import { useTheme } from '@/theme'
import type { Theme } from '@/theme'

interface ThemeOption {
  /** Theme applied when this option is selected. */
  value: Theme
  /** Translation key with the option name. */
  labelKey: TranslationKey
  /** Translation key describing the option. */
  hintKey: TranslationKey
  /** Icon shown next to the option. */
  icon: LucideIcon
}

/** Theme options offered in the settings dialog. */
const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'system',
    labelKey: 'theme.system',
    hintKey: 'theme.systemHint',
    icon: Monitor,
  },
  {
    value: 'light',
    labelKey: 'theme.light',
    hintKey: 'theme.lightHint',
    icon: Sun,
  },
  {
    value: 'dark',
    labelKey: 'theme.dark',
    hintKey: 'theme.darkHint',
    icon: Moon,
  },
]

/**
 * Settings button opening the language, theme, and payment dialog.
 *
 * @returns The settings trigger and modal.
 */
export function SettingsDialog() {
  // Initializations
  const { language, setLanguage, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const paypalHandle = useTripStore((state) => state.paypalHandle)
  const setPaypalHandle = useTripStore((state) => state.setPaypalHandle)
  const open = useTripStore((state) => state.settingsOpen)
  const setOpen = useTripStore((state) => state.setSettingsOpen)
  const [handleError, setHandleError] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t('settings.open')}
          title={t('settings.open')}
        >
          <Settings />
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>

        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2"
            aria-label={t('settings.close')}
          >
            <X />
          </Button>
        </DialogClose>

        <fieldset className="flex flex-col">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t('settings.language')}
          </legend>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={language}
            onValueChange={(value) => {
              if (value === 'it' || value === 'en') {
                setLanguage(value)
              }
            }}
            aria-label={t('language.label')}
            className="w-fit"
          >
            <ToggleGroupItem value="it" aria-label={t('language.italian')}>
              IT
            </ToggleGroupItem>
            <ToggleGroupItem value="en" aria-label={t('language.english')}>
              EN
            </ToggleGroupItem>
          </ToggleGroup>
        </fieldset>

        <fieldset className="flex flex-col">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t('settings.theme')}
          </legend>
          <RadioGroup
            value={theme}
            onValueChange={(value) => {
              if (value === 'system' || value === 'light' || value === 'dark') {
                setTheme(value)
              }
            }}
            className="gap-2"
          >
            {THEME_OPTIONS.map((option) => (
              <Label
                key={option.value}
                htmlFor={`settings-theme-${option.value}`}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 font-normal transition-colors',
                  theme === option.value
                    ? 'border-primary/50 bg-primary/5'
                    : 'hover:bg-muted/50',
                )}
              >
                <RadioGroupItem
                  id={`settings-theme-${option.value}`}
                  value={option.value}
                />
                <option.icon
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {t(option.labelKey)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(option.hintKey)}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset className="flex flex-col">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t('settings.payments')}
          </legend>
          <Label
            htmlFor="settings-paypal-handle"
            className="mb-1.5 text-xs font-medium text-muted-foreground"
          >
            {t('settings.paypalHandle')}
          </Label>
          <Input
            id="settings-paypal-handle"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t('settings.paypalHandlePlaceholder')}
            value={paypalHandle}
            aria-invalid={handleError}
            aria-describedby="settings-paypal-handle-hint"
            onChange={(event) => {
              setPaypalHandle(event.target.value)
              setHandleError(false)
            }}
            onBlur={() => {
              const normalized = normalizePayPalHandle(paypalHandle)
              if (normalized !== paypalHandle) {
                setPaypalHandle(normalized)
              }
              setHandleError(
                normalized !== '' && !isValidPayPalHandle(normalized),
              )
            }}
          />
          {handleError ? (
            <p
              id="settings-paypal-handle-hint"
              className="mt-1.5 text-xs text-destructive"
              role="alert"
            >
              {t('settings.paypalHandleInvalid')}
            </p>
          ) : (
            <p
              id="settings-paypal-handle-hint"
              className="mt-1.5 text-xs text-muted-foreground"
            >
              {t('settings.paypalHandleHint')}
            </p>
          )}
        </fieldset>
      </DialogContent>
    </Dialog>
  )
}
