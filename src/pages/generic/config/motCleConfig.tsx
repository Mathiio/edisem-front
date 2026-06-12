import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const motCleConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.mot_cle.type,
  templateId: 34,
  editSingleColumn: true,
  mediaUploadMode: 'none',
  resourcePickerDisplay: 'alphabetic',

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    description: {
      property: 'dcterms:description',
      type: 'textarea',
      label: 'Description du mot-clé',
      placeholder: 'Définition ou description...',
      zone: 'details',
    },
    prefLabel: { property: 'skos:prefLabel', type: 'text', label: 'Titre préféré', zone: 'details' },
    altLabel: { property: 'skos:altLabel', type: 'text', label: 'Titre alternatif', zone: 'details' },
    hiddenLabel: { property: 'skos:hiddenLabel', type: 'text', label: 'Titre caché', zone: 'details' },
    exactMatch: {
      property: 'skos:exactMatch',
      type: 'resource',
      label: 'Concept synonyme',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'details',
    },
    broader: {
      property: 'skos:broader',
      type: 'resource',
      label: 'Concept parent',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'details',
    },
    narrower: {
      property: 'skos:narrower',
      type: 'resource',
      label: 'Concept enfant',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'details',
    },
    related: {
      property: 'skos:related',
      type: 'resource',
      label: 'Concept associatif',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'details',
    },
    broadMatch: {
      property: 'skos:broadMatch',
      type: 'resource',
      label: 'Concept ChatGPT',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'details',
    },
    genre: {
      property: 'schema:genre',
      type: 'resource',
      label: 'Genre',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'details',
    },
  },

  views: [],
  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
};

export const motCleConfig = convertToGenericConfig(motCleConfigSimplified);
