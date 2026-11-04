// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

/**
 * Site configuration.
 *
 * `site` is intentionally unset: fill in the production origin before adding
 * canonical URLs, a sitemap, or an RSS feed.
 *
 * Italian is served without a prefix and English under `/en/`, which mirrors
 * the language switch in the editor.
 */
export default defineConfig({
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
