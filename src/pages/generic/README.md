# Pages génériques (`generic/`)

Système config-driven pour afficher et éditer les ressources Omeka (conférences, récits, outils, etc.) sans dupliquer le code.

## Chaîne de rendu

```
Route App.tsx
  → ConfigurableDetailPage (wrapper route + params)
    → mode view  → GenericDetailPage → GenericViewPage
    → mode edit/create → StudentFormWrapper → GenericDetailPage → GenericEditPage
```

## Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `ConfigurableDetailPage.tsx` | Wrapper pour les routes |
| `GenericDetailPage.tsx` | Routeur view / edit |
| `GenericViewPage.tsx` | Affichage lecture |
| `GenericEditPage.tsx` | Édition / création |
| `CreateResourcePage.tsx` | Création draft-first |
| `config.ts` | Types `GenericDetailPageConfig` |
| `simplifiedConfig.ts` | Types config déclarative |
| `simplifiedConfigAdapter.tsx` | Conversion simplified → generic + save |
| `helpers.tsx` | Factories `viewOptions` |
| `components.tsx` | Blocs réutilisables (ToolItem, ItemsList…) |
| `SimpleComponents.tsx` | Rendu simplified overview/details |
| `createTabRegistry.ts` | Résolution config par template / viewKey |

## Configurations (`config/`)

Chaque type de ressource a un fichier `*Config.tsx` exportant :

- `*ConfigSimplified` — config déclarative
- `*Config` — via `convertToGenericConfig()`

## Helpers d’édition

La logique permissions / ownership / liens éditables est dans `@/lib/resourceEditHelpers` (anciennement `resourceHelpers.ts`).

## Ajouter un type de ressource

1. Créer `config/monTypeConfig.tsx` avec `SimplifiedDetailConfig`
2. Exporter `monTypeConfig = convertToGenericConfig(monTypeConfigSimplified)`
3. Ajouter la route dans `App.tsx` avec `<ConfigurableDetailPage config={monTypeConfig} />`
4. Enregistrer dans `createTabRegistry.ts` si création via onglets

Workflow détaillé : [`plans/WORKFLOW_COMPLET.md`](../../../plans/WORKFLOW_COMPLET.md).
