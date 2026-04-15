import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { getRecitsCitoyensCards } from '@/services/Items';

export const recitCitoyenConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.recit_citoyen.type,
  templateId: 119,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:issued', type: 'date', zone: 'details' },
    description: { property: 'dcterms:abstract', type: 'textarea', label: 'Description', zone: 'details' },
    purpose: { property: 'oa:hasPurpose', type: 'textarea', label: 'Objectif', zone: 'details' },
    application: { property: 'schema:application', type: 'textarea', label: 'Résumé', zone: 'details' },
    contributors: {
      property: 'dcterms:creator',
      type: 'resource',
      label: 'Auteurs',
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
    externalLink: { property: 'schema:url', type: 'url', label: 'Lien vidéo', placeholder: 'https://...', zone: 'details' },
  },

  views: [
    {
      key: 'AnalyseCritique',
      title: 'Analyses critiques',
      property: 'dcterms:description',
      renderType: 'items',
      resourceTemplateId: 101,
      urlPattern: '/corpus/analyse-critique/:id',
    },
    {
      key: 'figureNarrative',
      title: 'Figure narrative',
      property: 'genstory:hasConditionInitial',
      renderType: 'text',
    },
    {
      key: 'ContentScient',
      title: 'Contenus scientifiques',
      property: 'dcterms:source',
      renderType: 'references',
      resourceTemplateIds: [81, 99, 98, 83],
    },
    {
      key: 'ContentCultu',
      title: 'Contenus culturels',
      property: 'schema:review',
      renderType: 'references',
      resourceTemplateIds: [81, 99, 98, 83],
    },
    {
      key: 'Domaine',
      title: 'Domaines du récit',
      property: 'dcterms:subject',
      renderType: 'items',
      itemSetIds: [21318],
    },
  ],

  showKeywords: true,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Récits citoyens similaires',
  recommendationType: 'recit_citoyen',
  defaultView: 'AnalyseCritique',
  formEnabled: true,

  smartRecommendations: {
    getRelatedItems: async (itemDetails: any) => {
      const recits = await getRecitsCitoyensCards();
      return recits.filter((recit: any) => String(recit.id) !== String(itemDetails.id));
    },
    maxRecommendations: 5,
  },
};

export const recitCitoyenConfig = convertToGenericConfig(recitCitoyenConfigSimplified);
