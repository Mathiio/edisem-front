# `components/`

Organisation des composants React du frontend.

## Dossiers

| Dossier | Rôle |
|---------|------|
| **`ui/`** | Primitives et blocs UI génériques, sans logique métier (modales, bannières, icônes, cartes vides, champs formulaire génériques…). Sous-dossier `form/` pour les inputs réutilisables. |
| **`layout/`** | Structure de page : navbar, footer, sidebar dataviz, breadcrumbs, écrans de chargement. |
| **`features/`** | Composants métier par domaine. Voir [`features/README.md`](./features/README.md). |

## Distinction avec `@/theme/components`

- **`@/theme/components`** : surcouches HeroUI thématisées (Button, Input, Modal…). Ce sont les briques de base du design system.
- **`components/ui/`** : composants applicatifs réutilisables qui composent souvent des éléments HeroUI/thème, mais portent une intention produit (ex. `PageBanner`, `EditSaveBar`).
- **`components/features/`** : logique et affichage liés à Edisem (corpus, ressources, formulaires, pages spécifiques).

En bref : thème = design system ; `ui/` = widgets app ; `layout/` = coquille ; `features/` = métier.

Exemples dans `ui/` : `SearchInput`, `ChartTooltip`, `form/AutoResizingTextarea`.
