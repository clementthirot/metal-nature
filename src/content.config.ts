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
            // Vue 3D : nom du fichier public/3d/models/<model>.glb (facultatif).
            model: z.string().optional(),
            // Fiche technique (facultative)
            materials: z.string().optional(),
            dimensions: z.string().optional(),
            finish: z.string().optional(),
            duration: z.string().optional(),
            // Histoire du projet (facultatif, audit SEO P2.12) : affichée dans « Le projet »
            need: z.string().optional(),        // le besoin du client
            constraints: z.string().optional(), // contraintes et solution retenue
            priceFrom: z.string().optional(),   // ex. « à partir de 1 500 € » (laisser vide si non affiché)
            // Photos supplémentaires (facultatives)
            gallery: z.array(z.object({ image: image(), alt: z.string() })).default([]),
            draft: z.boolean().default(false),
        }),
});

/**
 * Pages service (audit SEO, P2.13) : une page par famille de meubles, /meubles-sur-mesure/<fichier>/.
 * Le texte sous l'en-tête --- est le contenu de la page (Markdown, titres en ##).
 */
const services = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
    schema: z.object({
        // Titre principal (H1) et titre court pour les liens et le menu
        title: z.string(),
        shortTitle: z.string(),
        // Balise <title> (60 caractères environ) et meta description (155 caractères environ)
        metaTitle: z.string().max(65),
        description: z.string().max(170),
        // Phrase d'accroche affichée en grand sous le titre
        intro: z.string(),
        order: z.number().int().default(100),
        // Réalisations liées (nom du fichier dans src/content/realisations/, sans .md)
        realisations: z.array(z.string()).default([]),
    }),
});

export const collections = { realisations, services };
