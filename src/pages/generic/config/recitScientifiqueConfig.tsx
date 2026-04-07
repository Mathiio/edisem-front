import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { getRecitsScientifiquesCards } from '@/services/Items';

export const recitScientifiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.recit_scientifique.type,
  templateId: 124,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:issued', type: 'date', zone: 'details' },
    application: { property: 'schema:application', type: 'textarea', label: 'Résumé', zone: 'details' },
    purpose: { property: 'oa:hasPurpose', type: 'textarea', label: 'Objectif', zone: 'details' },
    contributors: {
      property: 'dcterms:creator',
      type: 'resource',
      label: 'Chercheur.e(s) / Institution(s) porteuse(s)',
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
    externalLink: { property: 'schema:url', type: 'url', label: 'Site web associé', placeholder: 'https://...', zone: 'details' },
  },

  views: [
    {
      key: 'AnalyseCritique',
      title: 'Analyses critiques',
      property: 'dcterms:description',
      renderType: 'items',
      urlPattern: '/corpus/analyse-critique/:id',
      resourceTemplateId: 101,
    },
    {
      key: 'figureNarrative',
      title: 'Figures narratives',
      property: 'genstory:hasConditionInitial',
      renderType: 'text',
    },
    {
      key: 'Outils',
      title: 'Outils',
      property: 'schema:tool',
      renderType: 'items',
      urlPattern: '/corpus/outil/:id',
      resourceTemplateIds: [114, 129],
    },
    {
      key: 'Documentation',
      title: 'Documents additionnels',
      property: 'schema:documentation',
      renderType: 'references',
      resourceTemplateIds: [81, 99, 98, 83],
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
  ],

  showKeywords: true,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Documentations similaires',
  recommendationType: 'recit_scientifique',
  defaultView: 'AnalyseCritique',
  formEnabled: true,

  smartRecommendations: {
    getRelatedItems: async (itemDetails: any) => {
      const docs = await getRecitsScientifiquesCards();
      return docs.filter((doc: any) => String(doc.id) !== String(itemDetails.id));
    },
    maxRecommendations: 5,
  },
};

export const recitScientifiqueConfig = convertToGenericConfig(recitScientifiqueConfigSimplified);
