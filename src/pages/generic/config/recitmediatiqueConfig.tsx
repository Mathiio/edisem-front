import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { getRecitsMediatiquesCards } from '@/services/Items';
import { IMAGINAIRE_IA_VOCAB_FIELDS } from './imagiaireIAConfig';

export const recitMediatiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.recit_mediatique.type,
  templateId: 120,

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
    slogan: { property: 'storyline:hasQuote', type: 'textarea', label: 'Citation', zone: 'details' },
    contributors: {
      property: 'dcterms:creator',
      type: 'resource',
      label: 'Journaliste(s)',
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
    domain: {
      property: 'dcterms:subject',
      type: 'itemset',
      label: 'Domaine du récit',
      itemSetId: 21318,
      multiSelect: true,
      zone: 'details',
    },
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
  recommendationsTitle: 'Récits médiatiques similaires',
  recommendationType: 'recit_mediatique',
  defaultView: 'AnalyseCritique',
  formEnabled: true,

  contributorButtons: [
    { label: 'Ajouter Personne', templateId: 33, property: 'schema:agent' },
    { label: 'Ajouter Organisation', templateId: 104, property: 'schema:agent' },
  ],

  smartRecommendations: {
    getRelatedItems: async (itemDetails: any) => {
      const recits = await getRecitsMediatiquesCards();
      return recits.filter((recit: any) => String(recit.id) !== String(itemDetails.id));
    },
    maxRecommendations: 5,
  },
};

export const recitMediatiqueConfig = convertToGenericConfig(recitMediatiqueConfigSimplified);
