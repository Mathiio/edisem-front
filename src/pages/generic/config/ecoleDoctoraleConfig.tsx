import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const ecoleDoctoraleConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.ecole_doctorale.type,
  templateId: 74,
  editSingleColumn: true,
  mediaUploadMode: 'none',

  fields: {
    title: { property: 'dcterms:title', type: 'title', label: 'Nom', zone: 'header' },
    website: { property: 'schema:url', type: 'url', label: 'Site web', placeholder: 'https://...', zone: 'details' },
  },

  views: [],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
};

export const ecoleDoctoraleConfig = convertToGenericConfig(ecoleDoctoraleConfigSimplified);
