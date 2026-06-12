import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const universiteConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.universite.type,
  templateId: 73,
  editSingleColumn: true,
  mediaUploadMode: 'photo',

  fields: {
    title: { property: 'dcterms:title', type: 'title', label: "Nom de l'université", zone: 'header' },
    shortName: { property: 'dcterms:alternative', type: 'text', label: 'Nom abrégé', placeholder: 'UL', zone: 'details' },
    website: { property: 'schema:url', type: 'url', label: 'Site web', placeholder: 'https://...', zone: 'details' },
    country: {
      property: 'schema:addressCountry',
      type: 'resource',
      label: 'Pays',
      resourceTemplateId: 94,
      zone: 'details',
    },
  },

  views: [],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
};

export const universiteConfig = convertToGenericConfig(universiteConfigSimplified);
