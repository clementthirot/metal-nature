/**
 * Chemins compatibles avec un déploiement dans un sous-dossier.
 * En production (www.metal-nature.fr) la base est « / » ; pour la démo GitHub Pages
 * elle vaut « /metal-nature/ » (voir BASE_PATH dans astro.config.mjs et le workflow).
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Préfixe un chemin absolu (« /realisations/ ») avec la base du site. */
export function withBase(path: string): string {
    if (!path.startsWith('/') || path.startsWith('//')) return path;
    return `${BASE}${path}`;
}

/** Retire la base d'un pathname pour raisonner sur les routes du site. */
export function stripBase(pathname: string): string {
    return BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname;
}
