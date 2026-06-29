# Edisem — Frontend

Interface React de la plateforme d'éditorialisation de la recherche Edisem (Arcanes / CRILCQ), dédiée à l'exploration des corpus scientifiques sur l'IA générative, les pratiques narratives et l'auctorialité.

Production : [edisem.arcanes.ca](https://edisem.arcanes.ca)  
Environnement de test : [tests.arcanes.ca](https://tests.arcanes.ca)

---

## Stack technique

| Couche | Choix |
|--------|-------|
| Framework | React 18 + TypeScript |
| Build | Vite + SWC |
| UI | HeroUI (anciennement NextUI) + Tailwind CSS |
| Dataviz | D3.js + MUI X Charts |
| Animations | Framer Motion |
| Routing | React Router v6 |
| Tests E2E | Playwright |
| CI/CD | GitHub Actions → SFTP vers serveur de production |

---

## Prérequis

- Node.js 20+
- npm

---

## Installation et lancement

```bash
npm install --legacy-peer-deps
npm run dev
```

L'application démarre sur `http://localhost:5173`.

En développement, Vite proxifie les appels API pour éviter les erreurs CORS :

- `/omk/api` → `https://edisem.arcanes.ca`
- `/tests-api` → `https://tests.arcanes.ca/omk/api`

---

## Scripts disponibles

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (`dist/`) |
| `npm run preview` | Prévisualisation du build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test:e2e` | Tests Playwright (contre `localhost:5173`) |
| `npm run test:e2e:ui` | Tests Playwright en mode UI interactif |

---

## Architecture du projet

```
src/
  App.tsx               Routeur principal React Router
  main.tsx              Point d'entrée
  config/               Configuration transverse
    resourceConfig.ts   Types de ressources, template IDs, URLs
    permissions.ts      Matrice rôles → permissions
    conferenceTypeConfig.ts
  hooks/                Hooks React et utilitaires d'auth
    withAuth.tsx        HOC de protection de route
    useAuth.ts
    useWatchlist.tsx
    ...
  lib/                  Logique pure (sans React)
    resourceEditHelpers.ts  Permissions d'édition des ressources liées
    resourceOwner.ts
    resourceUtils.ts
  services/             Appels API
    Items.ts            Requêtes helper=Query (QuerySqlViewHelper)
    UserSpace.ts        Espace personnel (créations, suppression)
    Analytics.ts        Endpoints statistiques
    Auth.ts
    ApiProxy.ts
    globalAdminApi.ts
  pages/                Composants de route (1 dossier = 1 domaine)
    HomePage.tsx
    auth/               /login
    user-space/         /mon-espace, /mon-espace-4, /espace-etudiant, /liste-de-lecture
    admin/              /users, /administration, /mots-cles
    people/             /intervenants, /intervenant/:id, /personne/:id
    research/           /recherche
    corpus/             /corpus/... (listings par type)
    generic/            Pages détail config-driven (voir generic/README.md)
    visualisation.tsx   /visualisation (dataviz D3)
  components/
    ui/                 Widgets réutilisables (pas de logique métier)
    layout/             Navbar, Footer, Layouts, AppSidebar, breadcrumbs
    features/           Composants métier Edisem
      shared/           Corpus cards, recherche, espace personnel, commentaires
      resource-links/   Bibliographies, médiagraphies, citations, mots-clés
      forms/            Champs, modales d'édition, sélecteurs de ressources
      pages/            Sous-composants propres à une page (home, dataviz, intervenants...)
  theme/                Surcouches HeroUI (design system interne)
  types/                Types TypeScript globaux
  utils/                Helpers génériques (formatage, API Omeka)
  assets/               SVG et ressources statiques
```

---

## Système de pages génériques

La majorité des pages de détail de ressource (conférence, récit, expérimentation, outil…) ne sont pas des fichiers de pages distincts. Elles utilisent un système config-driven :

```
ConfigurableDetailPage  (wrapper route)
  → GenericDetailPage   (routeur view / edit)
    → GenericViewPage   (lecture)
    → GenericEditPage   (édition / création)
```

Chaque type de ressource correspond à un fichier dans `src/pages/generic/config/` (ex. `conferenceConfig.tsx`) exportant une `SimplifiedDetailConfig` convertie en `GenericDetailPageConfig`.

Voir `src/pages/generic/README.md` pour le détail.

---

## Rôles et permissions

| Rôle Omeka | Accès |
|------------|-------|
| `global_admin` | Tout + `/administration` |
| `site_admin`, `admin`, `editor`, `reviewer`, `author`, `researcher` | Création, édition de ses ressources |
| `student` | Consultation uniquement |

Les actants (type `actant`) accèdent à `/mon-espace-4` ; les étudiants à `/mon-espace`.

---

## Backend

Le backend est une instance **Omeka S** hébergée séparément (`edisem-back`).

Le module custom `CartoAffect` expose les endpoints via une page AJAX Omeka (`/s/edisem/page/ajax`) avec un paramètre `helper` :

| helper | Classe PHP | Rôle |
|--------|-----------|------|
| `Query` | `QuerySqlViewHelper` | Requêtes SQL optimisées (listes, cards) |
| `UserSpace` | `UserSpaceViewHelper` | CRUD espace personnel |
| `Analytics` | `AnalyticsViewHelper` | Statistiques (heatmaps, trends, coverage) |
| `ActantAuth` | `AuthViewHelper` | Authentification JWT |
| `ApiProxy` | `ApiProxyViewHelper` | Proxy write vers l'API Omeka S |
| `MotsCles` | `MotsClesViewHelper` | Gestion des mots-clés |
| `ResourcePicker` | `ResourcePickerViewHelper` | Sélection de ressources liées |
| `GlobalAdmin` | `GlobalAdminViewHelper` | Catalogue global (`global_admin`) |

---

## CI/CD

Chaque push sur `main` déclenche le pipeline GitHub Actions :

1. `npm ci` + `npm run build` (TypeScript + Vite)
2. Déploiement SFTP vers le serveur de production
3. Tests Playwright E2E contre `https://tests.arcanes.ca`

Les secrets requis : `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `VITE_API_KEY`.

---

## Documentation interne

| Fichier | Contenu |
|---------|---------|
| `src/components/README.md` | Organisation `ui/`, `layout/`, `features/` |
| `src/components/features/README.md` | Détail du dossier `features/` |
| `src/pages/README.md` | Conventions de routage et arborescence `pages/` |
| `src/pages/generic/README.md` | Système config-driven et helpers de vues |
| `docs/DynamicBreadcrumbs.md` | Utilisation du composant breadcrumbs |
