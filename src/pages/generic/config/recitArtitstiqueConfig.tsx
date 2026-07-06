import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { RELATED_RESOURCES_FIELD, createRelatedResourcesSmartRecommendations } from '@/config/relatedResourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { IMAGINAIRE_IA_VOCAB_FIELDS } from './imagiaireIAConfig';

export const recitArtitstiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.recit_artistique.type,
  templateId: 103,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:date', type: 'date', zone: 'details' },
    description: { property: 'dcterms:abstract', type: 'textarea', label: 'Synopsis', zone: 'details' },
    credits: {
      property: 'theatre:credit',
      type: 'textarea',
      label: 'Crédits complets',
      zone: 'details',
    },
    centralQuestion: {
      property: 'schema:about',
      type: 'textarea',
      label: 'Question centrale',
      zone: 'details',
    },
    criticalReception: {
      property: 'schema:review',
      type: 'textarea',
      label: 'Réception critique',
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
    genre: {
      property: 'schema:genre',
      type: 'itemset',
      label: 'Genre du récit',
      itemSetId: 19326,
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
      key: 'ElementsNarratifs',
      title: 'Éléments narratifs',
      property: 'schema:backstory',
      renderType: 'items',
      urlPattern: '/corpus/element-narratif/:id',
      resourceTemplateIds: [115],
    },
    {
      key: 'ElementsEsthetiques',
      title: 'Éléments esthétiques',
      property: 'schema:artform',
      renderType: 'items',
      urlPattern: '/corpus/element-esthetique/:id',
      resourceTemplateIds: [118],
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
      key: 'ContentScient',
      title: 'Contenus scientifiques',
      property: 'dcterms:references',
      renderType: 'references',
      resourceTemplateIds: [81, 99, 98, 83],
    },
    {
      key: 'ContentCultu',
      title: 'Contenus culturels',
      property: 'dcterms:bibliographicCitation',
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
  recommendationType: 'recit_artistique',
  defaultView: 'AnalyseCritique',
  formEnabled: true,

  contributorButtons: [
    { label: 'Ajouter Personne', templateId: 33, property: 'schema:agent' },
    { label: 'Ajouter Organisation', templateId: 104, property: 'schema:agent' },
  ],

  smartRecommendations: createRelatedResourcesSmartRecommendations(),
};

export const recitArtitstiqueConfig = convertToGenericConfig(recitArtitstiqueConfigSimplified);
