import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const personneConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.personne.type,
  templateId: 33,
  editSingleColumn: true,
  mediaUploadMode: 'photo',

  fields: {
    title: { property: 'foaf:name', type: 'title', label: 'Nom complet', zone: 'header' },
    firstName: { property: 'foaf:firstName', type: 'text', label: 'Prénom', zone: 'details' },
    lastName: { property: 'foaf:lastName', type: 'text', label: 'Nom', zone: 'details' },
    jobTitle: {
      property: 'schema:jobTitle',
      type: 'text',
      label: 'Métier / Titre',
      placeholder: 'Chercheur, Artiste, Réalisateur...',
      zone: 'details',
    },
    description: {
      property: 'dcterms:description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Biographie, parcours, domaines de prédilection...',
      zone: 'details',
    },
    birthday: {
      property: 'foaf:birthday',
      type: 'date',
      label: 'Date de naissance',
      zone: 'details',
    },
    website: {
      property: 'dcterms:source',
      type: 'url',
      label: 'Site web / lien externe',
      placeholder: 'https://...',
      zone: 'details',
    },
  },

  views: [],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
};

export const personneConfig = convertToGenericConfig(personneConfigSimplified);
