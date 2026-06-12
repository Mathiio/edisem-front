import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const intervenantConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.intervenant.type,
  templateId: 72,
  editSingleColumn: true,
  mediaUploadMode: 'photo',

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    firstName: { property: 'foaf:firstName', type: 'text', label: 'Prénom', zone: 'details' },
    lastName: { property: 'foaf:lastName', type: 'text', label: 'Nom', zone: 'details' },
    email: { property: 'schema:email', type: 'text', label: 'Email', placeholder: 'prenom.nom@example.com', zone: 'details' },
    cvUrl: { property: 'schema:url', type: 'url', label: 'URL CV / site web', placeholder: 'https://...', zone: 'details' },
    university: {
      property: 'jdc:hasUniversity',
      type: 'resource',
      label: 'Université',
      resourceTemplateId: 73,
      multiSelect: true,
      zone: 'details',
    },
    ecoleDoctorale: {
      property: 'jdc:hasEcoleDoctorale',
      type: 'resource',
      label: 'École doctorale / Département',
      resourceTemplateId: 74,
      multiSelect: true,
      zone: 'details',
    },
    laboratoire: {
      property: 'jdc:hasLaboratoire',
      type: 'resource',
      label: 'Laboratoire',
      resourceTemplateId: 91,
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

export const intervenantConfig = convertToGenericConfig(intervenantConfigSimplified);
