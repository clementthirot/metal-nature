// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site 100 % statique (dossier dist/), déployé sur Cloudflare Pages.
export default defineConfig({
    site: 'https://www.metal-nature.fr',
    trailingSlash: 'ignore',
    integrations: [
        sitemap({
            filter: (page) => !page.includes('/mentions-legales'),
        }),
    ],
});
