import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const recitArtitstiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.recit_artistique.type,
  templateId: 103,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:date', type: 'date', zone: 'details' },
    description: { property: 'dcterms:abstract', type: 'textarea', label: 'Synopsis', zone: 'details' },
    genre: { property: 'schema:genre', type: 'textarea', label: 'Genre du récit', zone: 'details' },
    domaine: { property: 'dcterms:subject', type: 'textarea', label: 'Domaines du récit', zone: 'details' },
    theme: { property: 'storyline:hasTheme', type: 'textarea', label: 'Récits artistiques', zone: 'details' },
    contributors: {
      property: 'schema:agent',
      type: 'resource',
      label: 'Artistes principaux',
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
      resourceTemplateIds: [114, 129],
    },
    {
      key: 'Credits',
      title: 'Crédits complets',
      property: 'theatre:credit',
      renderType: 'text',
    },
    {
      key: 'Entrevue',
      title: 'Entrevue Arcanes',
      property: 'schema:holdingArchive',
      renderType: 'references',
      resourceTemplateIds: [81, 99, 98, 83],
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
  ],

  showKeywords: true,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Récits Artistiques similaires',
  recommendationType: 'recit_artistique',
  defaultView: 'AnalyseCritique',
  formEnabled: true,
};

export const recitArtitstiqueConfig = convertToGenericConfig(recitArtitstiqueConfigSimplified);
