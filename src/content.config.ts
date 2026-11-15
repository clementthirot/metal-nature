import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * Une réalisation = un fichier Markdown dans src/content/realisations/.
 * Le nom du fichier devient l'URL : bibliotheque-pont.md -> /realisations/bibliotheque-pont/
 * Le texte sous l'en-tête --- est la description.
 */
const realisations = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/realisations' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            year: z.number().int(),
            order: z.number().int().default(100),
            image: image(),
            imageAlt: z.string(),
            splineToken: z.string().optional(),
            draft: z.boolean().default(false),
        }),
});

export const collections = { realisations };
