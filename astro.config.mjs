// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site 100 % statique (dossier dist/), déployé sur Cloudflare Pages.
export default defineConfig({
    site: 'https://www.metal-nature.fr',
    trailingSlash: 'ignore',
    vite: {
        // Le runtime Spline (~2 Mo) est chargé à la demande dans un fichier séparé : avertissement attendu.
        build: { chunkSizeWarningLimit: 2500 },
    },
    integrations: [
        sitemap({
            filter: (page) => !page.includes('/mentions-legales'),
        }),
    ],
});
