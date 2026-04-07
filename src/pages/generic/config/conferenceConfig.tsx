import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const conferenceConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.seminaire.type,
  templateId: 71,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:date', type: 'date', zone: 'details' },
    description: { property: 'dcterms:abstract', type: 'textarea', label: 'Résumé', zone: 'details' },
    contributors: {
      property: 'schema:agent',
      type: 'resource',
      label: 'Conférencier',
      resourceTemplateId: 72,
      multiSelect: true,
      zone: 'overview',
    },
    keywords: {
      property: 'jdc:hasConcept',
      type: 'resource',
      label: 'Mots-clés',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'header',
    },
  },

  views: [
    {
      key: 'MicroResumes',
      title: 'Micro-résumés',
      renderType: 'microresumes',
      resourceTemplateId: 125,
      editable: true,
    },
    {
      key: 'Citations',
      title: 'Citations',
      renderType: 'citations',
      resourceTemplateId: 80,
      editable: true,
    },
    {
      key: 'Bibliographie',
      title: 'Bibliographie',
      property: 'dcterms:references',
      renderType: 'references',
      resourceTemplateIds: [81, 83],
    },
    {
      key: 'Medias',
      title: 'Médias',
      property: 'schema:associatedMedia',
      renderType: 'references',
      resourceTemplateIds: [99, 98],
    },
  ],

  showKeywords: true,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Conférences associées',
  defaultView: 'MicroResumes',
  formEnabled: true,
};

export const conferenceConfig = convertToGenericConfig(conferenceConfigSimplified);
