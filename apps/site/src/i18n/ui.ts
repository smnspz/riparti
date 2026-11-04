/** Languages shared by the marketing site and the editor. */
export const languages = ['it', 'en'] as const

/** A language the site is translated into. */
export type Language = (typeof languages)[number]

/** Navigation and footer copy for one language. */
export interface SiteCopy {
  /** Label of the call to action that opens the editor. */
  readonly appCta: string
  /** Absolute path of the editor. */
  readonly appHref: string
  /** Label of the privacy notice link. */
  readonly privacy: string
  /** Absolute path of the privacy notice. */
  readonly privacyHref: string
  /** Absolute path of the landing page. */
  readonly homeHref: string
  /** Accessible name of the main navigation. */
  readonly navLabel: string
  /** Name of the other language, used as the switch label. */
  readonly languageName: string
  /** Short statement rendered in the footer. */
  readonly footerNote: string
}

/** Site chrome copy, keyed by language. */
export const ui = {
  it: {
    appCta: 'Apri l’app',
    appHref: '/app/',
    privacy: 'Informativa privacy',
    privacyHref: '/informativa/',
    homeHref: '/',
    navLabel: 'Navigazione principale',
    languageName: 'English',
    footerNote: 'Nessun cookie, nessun tracciamento, nessun account.',
  },
  en: {
    appCta: 'Open the app',
    appHref: '/app/',
    privacy: 'Privacy notice',
    privacyHref: '/en/privacy/',
    homeHref: '/en/',
    navLabel: 'Main navigation',
    languageName: 'Italiano',
    footerNote: 'No cookies, no tracking, no account.',
  },
} as const satisfies Record<Language, SiteCopy>

/**
 * Read the language a URL is served in.
 *
 * Italian is the default and has no prefix; every other locale lives under
 * `/<locale>/`.
 *
 * @param url - URL being rendered.
 * @returns The locale matching the path, or the default locale.
 */
export function getLangFromUrl(url: URL): Language {
  // Read the first path segment as a candidate locale
  const [, firstSegment] = url.pathname.split('/')

  // Fall back to the default locale for unprefixed paths
  return languages.find((language) => language === firstSegment) ?? 'it'
}
