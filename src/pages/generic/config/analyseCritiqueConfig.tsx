import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const analyseCritiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.annotation.type,
  templateId: 101,

  fields: {
    title: { property: 'dcterms:title', type: 'title', label: 'Titre de la relation / annotation', zone: 'header' },
    argument: {
      property: 'dcterms:description',
      type: 'textarea',
      label: 'Analyse critique',
      zone: 'details',
    },
    keywords: {
      property: 'jdc:hasConcept',
      type: 'resource',
      label: 'Mot clé(s) associé(s)',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'header',
    },
    contributors: {
      property: 'schema:contributor',
      type: 'resource',
      label: 'Contributeur(s)',
      multiSelect: true,
      zone: 'overview',
    },
    collection: {
      property: 'schema:collection',
      type: 'resource',
      label: 'Collection ARCANES',
      multiSelect: true,
      zone: 'details',
      editable: false,
    },
  },

  views: [
    {
      key: 'target',
      title: 'Ressource analysée',
      property: 'oa:hasTarget',
      renderType: 'items',
      hiddenInForm: true,
    },
  ],

  showKeywords: true,
  showRecommendations: false,
  showComments: true,
  recommendationsTitle: 'Autres analyses critiques',
  formEnabled: true,

  contributorButtons: [
    { label: 'Ajouter Intervenant', templateId: 72, property: 'schema:contributor' },
    { label: 'Ajouter Étudiant', templateId: 96, property: 'schema:contributor' },
  ],
};

export const analyseCritiqueConfig = convertToGenericConfig(analyseCritiqueConfigSimplified);
