import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les éléments narratifs
 * Template 115 - Edisem (éléments narratifs)
 */
export const elementNarratifConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.element_narratif.type,
  templateId: 115,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    description: { property: 'dcterms:description', type: 'textarea', label: 'Description', zone: 'details' },
    date: { property: 'schema:eventDate', type: 'date', label: 'Date de production', zone: 'details' },
    contributors: {
      property: 'dcterms:creator',
      type: 'resource',
      label: 'Artiste',
      resourceTemplateId: 72,
      multiSelect: true,
      zone: 'overview',
      editable: false,
    },
  },

  views: [
    {
      key: 'Analyse',
      title: 'Analyse',
      renderType: 'categories',
      categories: [
        {
          key: 'narrative',
          title: 'Éléments narratifs',
          subcategories: [
            { key: 'genre', label: "Genre de l'œuvre", property: 'schema:genre', allowMultipleInputs: false },
            { key: 'duration', label: "Durée de l'œuvre", property: 'schema:duration', allowMultipleInputs: false },
            { key: 'plotSummary', label: 'Enjeux et/ou intrigues', property: 'eclap:plotSummary', allowMultipleInputs: false },
            { key: 'characters', label: 'Personnages', property: 'schema:character', allowMultipleInputs: false },
            { key: 'transcript', label: 'Scénario (url)', property: 'schema:transcript', allowMultipleInputs: false },
            { key: 'storyboard', label: 'Storyboard (url)', property: 'ma:fragmentName', allowMultipleInputs: false },
          ],
        },
      ],
    },
    {
      key: 'References',
      title: 'Contenus extérieurs',
      property: 'dcterms:references',
      renderType: 'references',
      resourceTemplateIds: [81, 99, 98, 83],
    },
    {
      key: 'Adaptations',
      title: 'Hypotextes et Adaptations',
      property: 'ma:isRelatedTo',
      renderType: 'text',
    },
  ],

  showKeywords: false,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Autres éléments narratifs',
  recommendationType: 'element_narratif',
  defaultView: 'Analyse',
  formEnabled: true,

  smartRecommendations: {
    maxRecommendations: 5,
  },
};

export const elementNarratifConfig = convertToGenericConfig(elementNarratifConfigSimplified);
