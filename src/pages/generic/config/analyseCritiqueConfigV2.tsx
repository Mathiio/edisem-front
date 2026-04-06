import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const analyseCritiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.annotation.type,
  templateId: 101,

  fields: {
    title: { property: 'dcterms:title', type: 'title', label: 'Titre de la relation / annotation', zone: 'header' },
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
      key: 'argument',
      title: 'Analyse critique',
      property: 'dcterms:description',
      renderType: 'text',
    },
    {
      key: 'target',
      title: 'Ressource analysée',
      property: 'oa:hasTarget',
      renderType: 'items',
    },
    {
      key: 'related',
      title: 'Ressources associées',
      property: 'ma:hasRelatedResource',
      renderType: 'items',
    },
  ],

  showKeywords: true,
  showRecommendations: false,
  showComments: true,
  recommendationsTitle: 'Autres analyses critiques',
  defaultView: 'argument',
  formEnabled: true,
};

export const analyseCritiqueConfig = convertToGenericConfig(analyseCritiqueConfigSimplified);
