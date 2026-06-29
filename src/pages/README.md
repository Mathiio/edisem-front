# `pages/`

Composants de route React Router — une page = une URL (ou un groupe de routes).

## Structure

```
pages/
  HomePage.tsx              Accueil (/)
  visualisation.tsx         Dataviz (/visualisation) + dossier visualisation/
  auth/
    LoginPage.tsx           /login
  user-space/
    StudentMySpace.tsx      /mon-espace (étudiants)
    ActantMySpace.tsx       /mon-espace-4 (actants)
    EspaceEtudiantPage.tsx  /espace-etudiant (vue enseignant)
    WatchlistPage.tsx       /liste-de-lecture
  admin/
    AdminDashboard.tsx      /users (gestion actants, étudiants, cours)
    GlobalAdministration.tsx /administration (global_admin)
    MotsClesPage.tsx        /mots-cles
    …Management.tsx
  people/
    IntervenantsPage.tsx    /intervenants
    IntervenantPage.tsx     /intervenant/:id
    PersonnePage.tsx        /personne/:id
  research/
    CahierRecherchePage.tsx /recherche
  corpus/                   Listings corpus (/corpus/…)
  generic/                  Pages détail config-driven (voir generic/README.md)
```

## Conventions

- **Fichiers** : PascalCase + suffixe `Page` pour les routes (`StudentMySpace`, `IntervenantPage`).
- **Routes URL** : inchangées lors des refactors de fichiers (kebab-case français/anglais selon l’historique).
- **Composants UI** : dans `components/features/` ou `components/ui/`, pas dans `pages/` sauf sous-composants propres à une page (ex. `visualisation/components/`).
- **Logique réutilisable** : `lib/` (`resourceEditHelpers`), `hooks/` (`withAuth`), `services/`, `config/`.

## Distinction `generic/`

La majorité des pages de détail de ressource passent par `ConfigurableDetailPage` + un fichier dans `generic/config/`. Les pages manuelles (`IntervenantPage`, `PersonnePage`) restent des exceptions legacy.
