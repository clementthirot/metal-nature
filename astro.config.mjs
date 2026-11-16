// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site 100 % statique (dossier dist/).
// Production : www.metal-nature.fr à la racine (valeurs par défaut).
// Démo GitHub Pages : SITE_URL et BASE_PATH sont fournis par .github/workflows/deploy.yml.
const site = process.env.SITE_URL || 'https://www.metal-nature.fr';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
    site,
    base,
    trailingSlash: 'ignore',
    vite: {
        // Three.js (~580 Ko, 150 Ko gzip) est chargé à la demande dans un fichier séparé : avertissement attendu.
        build: { chunkSizeWarningLimit: 700 },
    },
    integrations: [
        sitemap({
            filter: (page) => !page.includes('/mentions-legales'),
        }),
    ],
});
