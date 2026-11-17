/** Données structurées partagées (schema.org). */
import { SITE } from '../site';

/** URL absolue sur le domaine de production. */
export const absolute = (path: string) => new URL(path, SITE.url).href;

/** Fil d'Ariane au format BreadcrumbList. */
export function breadcrumbLd(items: { label: string; href: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: absolute(item.href),
        })),
    };
}

/** L'entreprise, référencée par son identifiant depuis les autres données structurées. */
export const BUSINESS_ID = `${SITE.url}/#entreprise`;
