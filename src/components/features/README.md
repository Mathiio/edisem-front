# `components/features`

Organisation par **rôle** des composants métier (hors `ui/` et `layout/`).

## Structure

```
features/
  shared/              Composants réutilisés par plusieurs domaines
    CommentSection.tsx Commentaires sur une ressource (GenericViewPage)
    corpus/            ResourceCard, CorpusNavCard, CorpusCarousel, KeywordsBarChart
    my-space/          MySpaceResourceRow, MySpaceResourceCard, CreateResourceAction
    search/            SearchModal, WideResourceCard
  resource-links/      Vues de ressources liées (biblio, médiagraphie, citations, mots-clés…)
  forms/
    fields/            Primitives métier (SelectionInput, TimecodeInput…)
    modals/            EditModal, ResourcePicker, QuickCreateModal
    edit/              FormFields, MediaDropzone, StudentFormWrapper, AddResourceCard…
  pages/               Composants propres à une page ou un domaine
    home/
    visualisation/
    intervenants/
    user-management/   Toolbar/listes pour /users (≠ /administration)
```

## Conventions

- **Dossiers** : kebab-case anglais (`my-space`, `resource-links`, `user-management`).
- **Fichiers** : PascalCase pour les composants React.
- Composant importé par **3+ domaines** → `shared/`.
- Composant lié à **une seule page** → `pages/<page>/`.
- Formulaires : champs atomiques dans `forms/fields/`, modales dans `forms/modals/`, édition ressource dans `forms/edit/`.
