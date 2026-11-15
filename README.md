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

## Contact

Michel préfère le téléphone : le bloc contact met en avant un bouton « Appeler Michel » (`tel:`),
avec les créneaux `callHours` de `src/site.ts`. L'e-mail reste en solution secondaire : le bouton
« Écrire un e-mail » ouvre la messagerie du visiteur avec un message prérempli. Il n'y a pas de
formulaire ni de service tiers.

## Scènes 3D (Spline)

Les vues 3D des réalisations (fenêtre de détail et fiches) restent en Spline. Elles sont chargées avec `@splinetool/runtime` (npm), un seul canvas par emplacement,
résolution plafonnée et rendu stoppé hors écran. Sur mobile, appareil modeste, économie de données
ou « réduire les animations », une image s'affiche avec un bouton « Voir en 3D ».

Tout est servi par le site, sans appel tiers :
- scènes exportées dans `public/spline/<token>.splinecode` (à recopier si une scène est modifiée dans Spline :
  `https://prod.spline.design/<token>/scene.splinecode`) ;
- décodeur Draco dans `public/draco/` (l'URL gstatic du runtime est réécrite par un plugin Vite, `astro.config.mjs`) ;
- police des cotes dans `public/spline/fonts/` (requête redirigée dans `src/scripts/spline.ts`).

Sur la fiche d'une réalisation, `viewZoom` (Markdown) règle le cadrage de la vue 3D (défaut 1.6).

### « Notre démarche » : scène Three.js native

La section `#about` n'utilise plus Spline. La scène est en Three.js (`src/scripts/about-scene.ts`), chargée à
l'approche de la section (`src/scripts/about-stage.ts`) :
- modèles GLB dans `public/3d/models/` (étagère, tables emboîtées, commode), normalisés au chargement ;
- textures extraites de l'ancienne scène Spline dans `public/3d/textures/` : le métal est un matcap
  (`MeshMatcapMaterial`, aucun éclairage), le bois un `MeshStandardMaterial` éclairé ;
- cadrage automatique (boîte englobante, marge de 15 %, zone à droite de la carte de texte sur desktop) ;
- rendu à la demande uniquement, pixel ratio plafonné à 1,5.

La séquence (tunnel, étagère de trois quarts, tables qui se déboîtent, commode qui tourne) est réglée dans
`PHASES` (`about-scene.ts`). Les messages utilisent les mêmes plages via `data-progress-start` /
`data-progress-end` (`src/pages/index.astro`) ; une seule timeline GSAP épinglée pilote les deux
(`src/scripts/home.ts`, piste de `ABOUT_TRACK_SCREENS` hauteurs d'écran). Avec « réduire les animations »,
chaque étape affiche une photo fixe du meuble.

## À compléter

- Mentions légales : statut juridique, SIRET, adresse (`src/pages/mentions-legales.astro`)
- Photos des réalisations en meilleure résolution (sources actuelles en 360 × 480 px) et galeries
- Fiche technique : dimensions, finition, durée de fabrication (champs facultatifs des fichiers Markdown)
- Créneaux d'appel affichés (`callHours` dans `src/site.ts`) à confirmer avec Michel
- Avis clients
