import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const laboratoireConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.laboratoire.type,
  templateId: 91,
  editSingleColumn: true,
  mediaUploadMode: 'photo',

  fields: {
    title: { property: 'dcterms:title', type: 'title', label: 'Nom du laboratoire', zone: 'header' },
    website: { property: 'schema:url', type: 'url', label: 'Site web', placeholder: 'https://...', zone: 'details' },
  },

  views: [],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
};

export const laboratoireConfig = convertToGenericConfig(laboratoireConfigSimplified);
