/** Informations de l'entreprise, utilisées dans les pages, le JSON-LD et les mentions légales. */
export const SITE = {
    name: 'Metal Nature',
    url: 'https://www.metal-nature.fr',
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
    // À CONFIRMER avec Michel avant la mise en ligne : délai affiché près du formulaire.
    responseTime: 'sous 48 h ouvrées',
    /**
     * Adresse d'envoi du formulaire de devis (Formspree, Web3Forms…).
     * Vide : le formulaire prépare un e-mail dans la messagerie du visiteur (mailto).
     * Exemple : 'https://formspree.io/f/xxxxxxx'
     */
    formEndpoint: '',
} as const;

/** Types de meubles : liste « Ce que nous fabriquons » (label) et objet du mail / choix du formulaire (name). */
export const FURNITURE_TYPES = [
    { label: 'Dressings', name: 'dressing' },
    { label: 'Placards', name: 'placard' },
    { label: 'Rangements sous escalier', name: 'rangement sous escalier' },
    { label: 'Rangements sous combles', name: 'rangement sous combles' },
    { label: 'Rangements d’entrée', name: 'rangement d’entrée' },
    { label: 'Étagères murales', name: 'étagère murale' },
    { label: 'Bibliothèques', name: 'bibliothèque' },
    { label: 'Lits', name: 'lit' },
    { label: 'Bureaux', name: 'bureau' },
    { label: 'Tables', name: 'table' },
    { label: 'Tables basses', name: 'table basse' },
    { label: 'Caissons de bureau', name: 'caisson de bureau' },
    { label: 'Buffets', name: 'buffet' },
    { label: 'Bancs', name: 'banc' },
] as const;
