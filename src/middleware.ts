/**
 * B21 — Typographie française : espaces insécables automatiques.
 * Appliqué à chaque page générée (au build pour le site statique, et en dev) : une espace fine insécable
 * (U+202F) remplace l'espace avant « ; ? ! » et à l'intérieur des guillemets « », une espace insécable
 * (U+00A0) remplace celle avant « : ». Seul le texte entre les balises est modifié, jamais les attributs,
 * les scripts, les styles ni les données structurées.
 */
import { defineMiddleware } from 'astro:middleware';

const SKIP = /(<(script|style|pre|code|textarea)\b[\s\S]*?<\/\2>)/gi;

export function frenchSpacing(text: string): string {
    return text
        .replace(/[  ](?=[;?!])/g, ' ')
        .replace(/ (?=:(?:\s|$))/g, ' ')
        .replace(/« /g, '« ')
        .replace(/ »/g, ' »');
}

function transform(html: string): string {
    return html
        .split(SKIP)
        .map((chunk, index) => {
            // split() avec groupes capturants : [texte, bloc ignoré, nom de balise, texte, …]
            if (index % 3 === 1) return chunk;
            if (index % 3 === 2) return '';
            return chunk.replace(/>([^<]+)</g, (_, text: string) => `>${frenchSpacing(text)}<`);
        })
        .join('');
}

export const onRequest = defineMiddleware(async (_context, next) => {
    const response = await next();
    if (!response.headers.get('content-type')?.includes('text/html')) return response;
    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(transform(html), { status: response.status, headers });
});
