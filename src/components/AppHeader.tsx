import type { ReactNode } from 'react'
import { CarFront } from 'lucide-react'

interface AppHeaderProps {
  /** Page title shown beside the brand. */
  title: string
  /** Actions shown at the end of the header. */
  children?: ReactNode
}

/**
 * Build the URL of the editor without any share hash.
 *
 * @returns The current app path with its query string.
 */
function homeHref(): string {
  return `${window.location.pathname}${window.location.search}`
}

/**
 * Top bar shared by the editor and the read-only summary.
 *
 * @param title - Page title shown beside the brand.
 * @param children - Actions shown at the end of the header.
 * @returns The brand, the page title, and the header actions.
 */
export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header className="app-header flex shrink-0 items-center justify-between gap-3 border-b bg-background">
      <div className="flex min-w-0 items-center gap-3">
        <a
          href={homeHref()}
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <CarFront aria-hidden className="size-4" />
          </span>
          <span className="font-heading text-base font-semibold tracking-tight">
            Backseat
          </span>
        </a>
        <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
        <h1 className="sr-only font-heading text-sm font-medium text-muted-foreground sm:not-sr-only sm:truncate">
          {title}
        </h1>
      </div>

      {children !== undefined && (
        <div className="flex shrink-0 items-center gap-1.5">{children}</div>
      )}
    </header>
  )
}
