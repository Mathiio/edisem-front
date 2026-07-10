import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { RELATED_RESOURCES_FIELD, createRelatedResourcesSmartRecommendations } from '@/config/relatedResourceConfig';
import { IMAGINAIRE_IA_VOCAB_FIELDS } from './imagiaireIAConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const recitCitoyenConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.recit_citoyen.type,
  templateId: 119,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:issued', type: 'date', zone: 'details' },
    description: { property: 'dcterms:abstract', type: 'textarea', label: 'Description', zone: 'details' },
    purpose: { property: 'oa:hasPurpose', type: 'textarea', label: 'Public Cible', zone: 'details' },
    application: { property: 'schema:application', type: 'textarea', label: 'Résumé', zone: 'details' },
    figureNarrative: { property: 'genstory:hasConditionInitial', type: 'textarea', label: 'Figure narrative', zone: 'details'},
    slogan: { property: 'storyline:hasQuote', type: 'textarea', label: 'Slogan', zone: 'details' },
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
      resourceTemplateId: 101,
      urlPattern: '/corpus/analyse-critique/:id',
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
  recommendationType: 'recit_citoyen',
  defaultView: 'AnalyseCritique',
  formEnabled: true,
  useItemPageEngine: true,

  contributorButtons: [
    { label: 'Ajouter Personne', templateId: 33, property: 'dcterms:creator' },
    { label: 'Ajouter Organisation', templateId: 104, property: 'dcterms:creator' },
  ],

  smartRecommendations: createRelatedResourcesSmartRecommendations(),
};

export const recitCitoyenConfig = convertToGenericConfig(recitCitoyenConfigSimplified);
