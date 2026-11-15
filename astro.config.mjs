// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Lot E.1 : le runtime Spline charge le décodeur Draco depuis gstatic.com (URL en dur).
 * On la remplace par la copie servie depuis public/draco/.
 */
const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.2/';
const localDraco = {
    name: 'metal-nature-local-draco',
    enforce: 'pre',
    transform(code, id) {
        if (!id.includes('@splinetool') || !code.includes(DRACO_CDN)) return null;
        return { code: code.replaceAll(DRACO_CDN, '/draco/'), map: null };
    },
};

// Site 100 % statique (dossier dist/), déployé sur Cloudflare Pages.
export default defineConfig({
    site: 'https://www.metal-nature.fr',
    trailingSlash: 'ignore',
    vite: {
        // Le runtime Spline (~2 Mo) est chargé à la demande dans un fichier séparé : avertissement attendu.
        build: { chunkSizeWarningLimit: 2500 },
        plugins: [localDraco],
        // En dev, Vite pré-bundle les dépendances sans passer par les plugins : on exclut le runtime.
        optimizeDeps: { exclude: ['@splinetool/runtime'] },
    },
    integrations: [
        sitemap({
            filter: (page) => !page.includes('/mentions-legales'),
        }),
    ],
});
