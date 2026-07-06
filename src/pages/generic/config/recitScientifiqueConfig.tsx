import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { RELATED_RESOURCES_FIELD, createRelatedResourcesSmartRecommendations } from '@/config/relatedResourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { IMAGINAIRE_IA_VOCAB_FIELDS } from './imagiaireIAConfig';

export const recitScientifiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.recit_scientifique.type,
  templateId: 124,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:issued', type: 'date', zone: 'details' },
    application: { property: 'schema:application', type: 'textarea', label: 'Résumé', zone: 'details' },
    purpose: { property: 'oa:hasPurpose', type: 'textarea', label: 'Objectif', zone: 'details' },
    figureNarrative: {
      property: 'genstory:hasConditionInitial',
      type: 'textarea',
      label: 'Figures narratives',
      zone: 'details',
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
    domain: {
      property: 'dcterms:subject',
      type: 'itemset',
      label: 'Domaine du récit',
      itemSetId: 21318,
      multiSelect: true,
      zone: 'details',
    },
    relatedResources: RELATED_RESOURCES_FIELD,
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
      key: 'Outils',
      title: 'Outils',
      property: 'schema:tool',
      renderType: 'items',
      urlPattern: '/corpus/outil/:id',
      resourceTemplateId: 114,
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
    {
      key: 'ImagiaireIA',
      title: "Imaginaire de l'IA",
      property: 'schema:characterAttribute',
      renderType: 'vocabGroup',
      editable: true,
      vocabFields: IMAGINAIRE_IA_VOCAB_FIELDS,
    },
  ],

  showKeywords: true,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Contenus associés',
  recommendationType: 'recit_scientifique',
  defaultView: 'AnalyseCritique',
  formEnabled: true,

  contributorButtons: [
    { label: 'Ajouter Personne', templateId: 33, property: 'dcterms:creator' },
    { label: 'Ajouter Organisation', templateId: 104, property: 'dcterms:creator' },
  ],

  smartRecommendations: createRelatedResourcesSmartRecommendations(),
};

export const recitScientifiqueConfig = convertToGenericConfig(recitScientifiqueConfigSimplified);
