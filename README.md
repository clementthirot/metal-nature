# Metal Nature

Site vitrine de Metal Nature, meubles artisanaux sur mesure en bois et métal (Sannois, Val d'Oise).

Site statique généré avec [Astro](https://astro.build), hébergé sur Cloudflare Pages.

## Développement

Prérequis : Node.js 22.23 ou plus récent (24 recommandé) (voir `.node-version`).

```bash
npm install
npm run dev       # http://localhost:4321, rechargement à chaud
npm run build     # génère le site dans dist/
npm run preview   # sert dist/ en local pour vérifier le build
```

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/content/realisations/` | Une réalisation = un fichier Markdown (nom du fichier = URL) |
| `src/assets/` | Images sources, optimisées automatiquement au build (WebP, tailles multiples) |
| `src/pages/` | Pages : accueil, `/realisations/<slug>/`, mentions légales, 404 |
| `src/components/`, `src/layouts/` | Navigation, pied de page, gabarit commun (SEO, Open Graph) |
| `src/scripts/` | Animations GSAP, carrousel, fenêtre de détail, chargement des scènes Spline |
| `src/styles/` | CSS globaux |
| `src/site.ts` | Coordonnées, zone d'intervention, délai de réponse, adresse d'envoi du formulaire, types de meubles |
| `public/` | Fichiers copiés tels quels : favicons, `robots.txt`, `_headers` Cloudflare, image de partage |

## Ajouter une réalisation

**Option 1 – à la main** : déposer la photo dans `src/assets/realisations/`, puis créer
`src/content/realisations/mon-meuble.md` :

```markdown
---
title: "Mon meuble"
year: 2026
order: 1
image: ../../assets/realisations/mon-meuble.jpg
imageAlt: "Description précise de la photo"
splineToken: "XXXXXXXX"   # facultatif : identifiant de la scène Spline
---

Description du meuble.
```

Le build échoue avec un message clair si un champ obligatoire manque.

**Option 2 – interface en ligne (Pages CMS)** : se connecter sur [app.pagescms.org](https://app.pagescms.org)
avec un compte GitHub ayant accès au dépôt. La configuration est dans `.pages.yml`.
Chaque enregistrement crée un commit, et Cloudflare redéploie le site.

## Déploiement Cloudflare Pages

Connecter le dépôt GitHub dans Cloudflare (Workers & Pages → Créer → Pages → Connecter à Git) :

- Framework : Astro
- Commande de build : `npm run build`
- Dossier de sortie : `dist`
- Version de Node : lue depuis `.node-version`

Les en-têtes de sécurité et de cache sont définis dans `public/_headers`.
Chaque branche poussée obtient une URL de prévisualisation.

## Formulaire de devis

Sans configuration, le formulaire prépare un e-mail prérempli dans la messagerie du visiteur.
Pour un envoi direct (avec photo jointe), créer un formulaire sur Formspree, Web3Forms ou équivalent,
puis renseigner son adresse dans `formEndpoint` (`src/site.ts`). Le champ photo apparaît alors.

## Scènes 3D (Spline)

Les scènes sont chargées avec `@splinetool/runtime` (npm), un seul canvas par emplacement,
résolution plafonnée et rendu stoppé hors écran. Sur mobile, appareil modeste, économie de données
ou « réduire les animations », une image s'affiche avec un bouton « Voir en 3D ».

La scène de « Notre démarche » a été animée dans Spline pour l'ancienne section de 12 000 px :
`ABOUT_SCENE_SCROLL_LENGTH` (`src/scripts/home.ts`) étire la section épinglée sur cette plage.
Si la scène est retravaillée dans Spline, ajuster cette valeur.

## À compléter

- Mentions légales : statut juridique, SIRET, adresse (`src/pages/mentions-legales.astro`)
- Photos des réalisations en meilleure résolution (sources actuelles en 360 × 480 px) et galeries
- Fiche technique : dimensions, finition, durée de fabrication (champs facultatifs des fichiers Markdown)
- Délai de réponse affiché (`responseTime` dans `src/site.ts`) à confirmer
- Avis clients
