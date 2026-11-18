# Metal Nature

Site vitrine de Metal Nature, meubles artisanaux sur mesure en bois et métal (Sannois, Val d'Oise).

Site statique généré avec [Astro](https://astro.build), en production sur **https://metal-nature.com**
(Cloudflare Pages). Une démo non indexée est publiée sur GitHub Pages à chaque push sur `main`.

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
| `src/scripts/` | Animations GSAP, carrousel, fenêtre de détail, visionneuse et scènes 3D (Three.js) |
| `src/styles/` | CSS globaux |
| `src/site.ts` | Coordonnées, créneaux d'appel, zone d'intervention, types de meubles |
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
model: "armoire"   # facultatif : modèle 3D public/3d/models/armoire.glb
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

Domaine : le site de production est `https://metal-nature.com` (sans www). C'est la valeur par
défaut de `site` (`astro.config.mjs`) et de `SITE.url` (`src/site.ts`) : canonical, sitemap,
Open Graph et données structurées en dépendent. Seul ce domaine est indexé (`index, follow`) ;
toute autre adresse, comme la démo GitHub Pages, est servie en `noindex`.
Pour éviter le contenu dupliqué, `www.metal-nature.com` doit rediriger vers `metal-nature.com`
(règle de redirection dans Cloudflare, côté DNS : elle ne se règle pas dans le code).

## Démo GitHub Pages

`.github/workflows/deploy.yml` construit le site avec `SITE_URL` et `BASE_PATH` fournis par GitHub
(sous-dossier `/metal-nature/`) ; tous les liens passent par `withBase()` (`src/utils/paths.ts`).

## Vérification du code

```bash
npm run check   # types TypeScript et Astro (0 erreur attendue)
```

## Contact

Michel préfère le téléphone : le bloc contact met en avant un bouton « Appeler Michel » (`tel:`),
avec les créneaux `callHours` de `src/site.ts`. L'e-mail reste en solution secondaire : le bouton
« Écrire un e-mail » ouvre la messagerie du visiteur avec un message prérempli. Il n'y a pas de
formulaire ni de service tiers.

## Scènes 3D (Three.js)

Tout le site est en Three.js natif (plus de Spline). Modèles, textures et code sont servis par le site, sans appel tiers.

### Vues 3D des réalisations

Fenêtre de détail de l'accueil et fiches `/realisations/<slug>/` : visionneuse `src/scripts/model-viewer.ts`,
chargée à la demande par `src/scripts/model-stage.ts` (un seul canvas par emplacement).
- Le champ `model` du Markdown désigne le fichier `public/3d/models/<model>.glb` (export GLB de Spline).
- Les GLB n'ont pas de matériaux : les finitions (chrome, métal foncé ou noir, bois clair ou foncé, laque
  blanche) sont attribuées par modèle dans `MODELS` (`model-viewer.ts`), d'après l'index des maillages.
  Un nouveau modèle doit y être ajouté (sinon il s'affiche entièrement en chrome).
- Angle de vue : celui de la caméra exportée dans le GLB ; distance calculée pour que le meuble tienne dans le cadre.
- Rotation à la souris ou au doigt, sans zoom (le défilement de la page reste libre) ; rendu à la demande,
  pixel ratio plafonné à 1,5.
- Fenêtre de détail et fiches : sur mobile, appareil modeste, économie de données ou « réduire les animations »,
  une image s'affiche avec un bouton « Voir en 3D » (la séquence de l'accueil, elle, se lance toujours seule).

### « Notre démarche »

La scène est en Three.js (`src/scripts/about-scene.ts`), chargée automatiquement à
l'approche de la section, sur mobile comme sur desktop, sans bouton (`src/scripts/about-stage.ts`) :
- canvas plein écran (100vw × 100svh) ; les meubles sont cadrés dans une zone utile hors de la colonne
  de texte (`setViewOffset`) : à droite en desktop, au-dessus des messages sur tablette et mobile ;
- messages en surimpression sans voile, en `mix-blend-mode: difference` (ils s'inversent au-dessus d'un meuble) ;
- la grille de la page devient un sol (`GridHelper`) qui s'estompe au loin ;
- passage trait → matière par un shader de dissolution (la matière pousse du pied vers le haut) ;
- lignes de cote animées (SVG, chiffres en mono) : valeurs lues dans le champ `dimensions` des réalisations
  (`bibliotheque`, `tables-basses-imbriquees`, `commode-arquee`), « sur mesure » si le champ est vide ;
- modèles GLB dans `public/3d/models/` (étagère, tables emboîtées, commode), normalisés au chargement ;
- textures extraites de l'ancienne scène Spline dans `public/3d/textures/` : le métal est un matcap
  (`MeshMatcapMaterial`, aucun éclairage), le bois un `MeshStandardMaterial` éclairé ;
- cadrage automatique (boîte englobante, marge de 15 %), meuble centré dans l'écran ;
- passage « du trait à la matière » : arêtes (`EdgesGeometry`) puis bois et chrome, coupé sur appareil modeste ;
- rendu à la demande uniquement, pixel ratio plafonné à 1,5.

La séquence (traversée des 3 cadres, pivot, étagère de trois quarts, tables qui se déboîtent, commode qui tourne) est réglée dans
`PHASES` (`about-scene.ts`). Les messages utilisent les mêmes plages via `data-progress-start` /
`data-progress-end` (`src/pages/index.astro`) ; une seule timeline GSAP épinglée pilote les deux
(`src/scripts/home.ts`, piste de `ABOUT_TRACK_SCREENS` hauteurs d'écran). Avec « réduire les animations »,
chaque étape affiche une photo fixe du meuble.

## Système visuel (review UI du 17/11/2026)

- **Typographie** : Archivo (variable, axe de largeur) pour les titres et le texte, JetBrains Mono pour les
  labels, numéros, années et cotes ; auto-hébergées (`@fontsource-variable/*`). Échelle fluide à 6 tailles
  dans `src/styles/base.css` (`--fs-display`, `--fs-h1`, `--fs-h2`, `--fs-h3`, `--fs-body`, `--fs-caption`).
- **Emphase** : plus d'italique. Un titre qui contient un `<span class="strong">` passe en gris, l'accent reste en
  pleine couleur. Un seul accent par titre.
- **Grille** : les blocs de texte prennent le fond de leur section, les lignes ne traversent jamais un texte.
- **Navigation** : toutes les pages en desktop ; menu plein écran sous 1024 px (`src/scripts/nav.ts`).
- **Pages intérieures** : en-tête commun avec image (`src/components/PageHeader.astro`), encart d'appel sombre.
- **Typographie française** : espaces insécables avant `: ; ? !` et dans « », ajoutées à chaque page
  (`src/middleware.ts`).
- **Interactions** : dessin technique au survol des cartes du carrousel, curseur loupe sur les photos
  (`src/scripts/cursor.ts`, souris uniquement), transition partagée grille → fiche (View Transitions).

## Référencement (SEO)

Mis en place d'après l'audit SEO du 16/11/2026 :
- **Indexation** : production en `index, follow`, sitemap (`@astrojs/sitemap`) déclaré dans `robots.txt` ;
  l'URL canonique pointe toujours vers `metal-nature.com`, y compris depuis la démo GitHub Pages.
- **Titles** d'environ 60 caractères et descriptions d'environ 155 caractères sur chaque page.
- **Pages service** : `src/content/services/*.md` → `/meubles-sur-mesure/<fichier>/` (bibliothèque,
  dressing et rangements, table bois et métal, salle de bain), reliées aux réalisations.
- **Zone d'intervention** (`/zone-intervention/`, communes dans `NEARBY_TOWNS`) et **FAQ**
  (`/questions-frequentes/`, contenu dans `src/data/faq.ts`, données structurées `FAQPage`).
- **Données structurées** : entreprise (`HomeAndConstructionBusiness`, accueil), `Service`, `CreativeWork`,
  `FAQPage`, `BreadcrumbList`. Réglages dans `src/site.ts` : `openingHours`, `showStreetAddress`
  (adresse de rue affichée et déclarée, à décider avec Michel), `sameAs` (lien de la fiche Google à ajouter).
- **Fiches réalisation** : champs facultatifs `need`, `constraints`, `priceFrom` (section « Le projet »),
  réalisations similaires et lien vers la page service de la même famille.

Hors code (à faire par Clément) : fiche Google Business Profile, Search Console et Bing Webmaster Tools,
annuaires (PagesJaunes, Obat, Houzz, CMA) avec des coordonnées identiques partout, avis clients,
relations locales (Trophée #Madein95, Val Parisis, Ville de Sannois).

## À compléter

- Mentions légales : statut juridique, SIRET, adresse (`src/pages/mentions-legales.astro`)
- Photos des réalisations en meilleure résolution (sources actuelles en 360 × 480 px) et galeries
- Fiche technique : dimensions, finition, durée de fabrication (champs facultatifs des fichiers Markdown)
- Créneaux d'appel affichés (`callHours` dans `src/site.ts`) à confirmer avec Michel
- Avis clients
