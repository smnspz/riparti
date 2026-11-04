import type { ReactNode } from 'react'

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
    <header className="app-header flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-background">
      <div className="flex min-w-0 items-center gap-3">
        <a
          href={homeHref()}
          className="rounded-lg font-heading text-base font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Riparti
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
