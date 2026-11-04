import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

/** Legal pages published in one or more languages. */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(['it', 'en']),
    /** Absolute path without the leading slash, e.g. `informativa`. */
    slug: z.string(),
    /** Same page in the other language, as an absolute path. */
    alternate: z.string(),
    updated: z.coerce.date(),
  }),
})

export const collections = { legal }
