/**
 * Assemble the single static deploy.
 *
 * The Astro site owns the root path and the editor is served under `/app/`.
 * Astro clears its output directory on every build, so the editor has to be
 * copied in afterwards, never into `apps/site/public`.
 */

import { cp, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** Directory the editor build writes to. */
const APP_DIST = fileURLToPath(new URL('../apps/app/dist', import.meta.url))

/** Directory the site build writes to. */
const SITE_DIST = fileURLToPath(new URL('../apps/site/dist', import.meta.url))

/** Directory the editor is served from, relative to the site root. */
const EDITOR_TARGET = fileURLToPath(
  new URL('../apps/site/dist/app', import.meta.url),
)

/**
 * Report whether a path exists and is a directory.
 *
 * @param path - Absolute path to inspect.
 * @returns True when the path is a directory.
 */
async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory()
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false
    }
    throw error
  }
}

// Check both builds ran before assembling them
if (!(await isDirectory(APP_DIST))) {
  throw new Error('The editor build is missing. Run `pnpm build:app` first.')
}
if (!(await isDirectory(SITE_DIST))) {
  throw new Error('The site build is missing. Run `pnpm build:site` first.')
}

// Copy the editor under the site's /app/ path
await cp(APP_DIST, EDITOR_TARGET, { recursive: true })

console.log(`Editor copied to ${EDITOR_TARGET}`)
