import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const organisationConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.organisation.type,
  templateId: 104,
  editSingleColumn: true,
  mediaUploadMode: 'photo',

  fields: {
    title: { property: 'dcterms:title', type: 'title', label: "Nom de l'organisation", zone: 'header' },
    description: {
      property: 'dcterms:description',
      type: 'textarea',
      label: 'Nature des activités',
      placeholder: 'Entreprise, collectif artistique, ONG, laboratoire de recherche...',
      zone: 'details',
    },
    creationDate: { property: 'ma:creationDate', type: 'date', label: 'Date de fondation', zone: 'details' },
    website: { property: 'foaf:page', type: 'url', label: 'Site web', placeholder: 'https://...', zone: 'details' },
  },

  views: [],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
};

export const organisationConfig = convertToGenericConfig(organisationConfigSimplified);
