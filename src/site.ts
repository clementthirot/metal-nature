/** Informations de l'entreprise, utilisées dans les pages, le JSON-LD et les mentions légales. */
export const SITE = {
    name: 'Metal Nature',
    url: 'https://metal-nature.com',
    owner: 'Michel Valade',
    phone: '+33686238471',
    phoneDisplay: '06 86 23 84 71',
    emailUser: 'michel.valade',
    emailDomain: 'gmail.com',
    city: 'Sannois',
    postalCode: '95110',
    department: "Val d'Oise",
    region: 'Île-de-France',
    areaServed: "Sannois, le Val-d'Oise et toute l'Île-de-France",
    // À CONFIRMER avec Michel avant la mise en ligne : créneaux où il décroche.
    // Chaîne vide pour masquer la mention sur le site.
    callHours: 'en semaine, de 8 h à 18 h',
    // Horaires au format schema.org (données structurées), à garder cohérents avec callHours.
    openingHours: ['Mo-Fr 08:00-18:00'],
    // Adresse de l'atelier (déjà publique dans les mentions légales).
    streetAddress: '22 Rue Touzelin',
    /**
     * Afficher l'adresse de rue sur le site et dans les données structurées (cohérence « NAP »
     * avec la fiche Google). À décider avec Michel : false = seule la ville est affichée.
     */
    showStreetAddress: false,
    /**
     * Profils officiels (fiche Google Business Profile, annuaires) : ajoutés aux données structurées.
     * Fiche Google : URL stable par identifiant (kgmid), plutôt que le lien de partage share.google.
     */
    sameAs: [
        'https://www.google.com/search?kgmid=/g/11p2wmd5_j',
    ] as string[],
} as const;

/** Communes citées dans la page « Zone d'intervention » (proches de l'atelier). */
export const NEARBY_TOWNS = [
    'Sannois', 'Argenteuil', 'Ermont', 'Franconville', 'Cormeilles-en-Parisis', 'Saint-Gratien',
    'Eaubonne', 'Montigny-lès-Cormeilles', 'Herblay-sur-Seine', 'Taverny',
] as const;

/**
 * « Ce que nous fabriquons » : familles de meubles (titre H3 + phrase) et types de meubles.
 * `service` : page dédiée /meubles-sur-mesure/<service>/ (src/content/services/).
 */
export const FURNITURE_GROUPS = [
    {
        title: 'Rangements et dressings',
        service: 'dressing-rangement',
        text: "Dressings, placards et rangements dessinés au centimètre près pour exploiter chaque recoin, même sous un escalier ou sous les combles.",
        items: ['Dressings', 'Placards', 'Rangements sous escalier', 'Rangements sous combles', 'Rangements d’entrée'],
    },
    {
        title: 'Bibliothèques et étagères',
        service: 'bibliotheque',
        text: "Des structures en métal fines et solides, des plateaux en bois : des bibliothèques qui portent vos livres sans fléchir et structurent la pièce.",
        items: ['Bibliothèques', 'Étagères murales'],
    },
    {
        title: 'Tables et bureaux',
        service: 'table-bois-metal',
        text: "Tables, tables basses et bureaux aux dimensions de votre espace, avec un piètement en métal et un plateau en bois ou en acier.",
        items: ['Tables', 'Tables basses', 'Bureaux', 'Caissons de bureau'],
    },
    {
        title: 'Salle de bain',
        service: 'salle-de-bain',
        text: "Meubles vasque et armoires de salle de bain conçus pour l'humidité, aux lignes aussi soignées que dans le reste de la maison.",
        items: ['Meubles vasque', 'Armoires de salle de bain'],
    },
    {
        title: 'Et aussi',
        service: null,
        text: "Votre projet ne rentre dans aucune case ? Michel étudie toutes les demandes de mobilier en bois et métal.",
        items: ['Lits', 'Buffets', 'Bancs'],
    },
] as const;
