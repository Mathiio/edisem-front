import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les bibliographies étudiantes
 * Template Omeka S: 81 (EdiSem bibliographie)
 */
export const bibliographyConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.bibliographie.type,
  templateId: 81,

  fields: {
    title: {
      property: 'dcterms:title',
      type: 'title',
      zone: 'header',
      label: 'Titre',
      placeholder: 'Titre de la référence bibliographique...',
    },
    description: {
      property: 'bibo:abstract',
      type: 'textarea',
      label: 'Résumé',
      placeholder: 'Résumé de la référence...',
      zone: 'details',
    },
    date: {
      property: 'dcterms:date',
      type: 'date',
      label: 'Date de publication',
      zone: 'details',
    },
    externalLink: {
      property: 'bibo:uri',
      type: 'url',
      label: 'URL',
      placeholder: 'https://...',
      zone: 'details',
    },
  },

  views: [
    {
      key: 'authors',
      title: 'Auteurs',
      renderType: 'categories',
      categories: [
        {
          key: 'authors',
          title: 'Auteurs',
          subcategories: [
            { key: 'creator', label: 'Auteur(s)', property: 'dcterms:creator' },
            { key: 'editor', label: 'Directeur(s)', property: 'bibo:editor' },
          ],
        },
      ],
    },
    {
      key: 'publication',
      title: 'Publication',
      renderType: 'categories',
      categories: [
        {
          key: 'publication',
          title: 'Publication',
          subcategories: [
            { key: 'publisher', label: 'Éditeur / Revue', property: 'dcterms:publisher', allowMultipleInputs: false },
            { key: 'volume', label: 'Volume', property: 'bibo:volume', allowMultipleInputs: false },
            { key: 'issue', label: 'Numéro', property: 'bibo:issue', allowMultipleInputs: false },
            { key: 'pages', label: 'Pages', property: 'bibo:pages', allowMultipleInputs: false },
            { key: 'numPages', label: 'Nombre de pages', property: 'bibo:numPages', allowMultipleInputs: false },
            { key: 'collection', label: 'Collection', property: 'schema:collection', allowMultipleInputs: false },
          ],
        },
      ],
    },
    {
      key: 'identification',
      title: 'Identification',
      renderType: 'categories',
      categories: [
        {
          key: 'identification',
          title: 'Identification',
          subcategories: [
            { key: 'isbn', label: 'ISBN', property: 'jdc:hasConcept', allowMultipleInputs: false },
            { key: 'format', label: 'Format', property: 'dcterms:format', allowMultipleInputs: false },
            { key: 'type', label: 'Type', property: 'dcterms:type', allowMultipleInputs: false },
          ],
        },
      ],
    },
    {
      key: 'source',
      title: 'Source',
      renderType: 'categories',
      categories: [
        {
          key: 'source',
          title: 'Source',
          subcategories: [
            { key: 'bookTitle', label: 'Titre du livre', property: 'dcterms:isPartOf', allowMultipleInputs: false },
            { key: 'event', label: 'Événement', property: 'bibo:presentedAt', allowMultipleInputs: false },
          ],
        },
      ],
    },
  ],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  defaultView: 'authors',
  formEnabled: true,
};

// Export de la config convertie pour utilisation avec ConfigurableDetailPage/GenericDetailPage
export const bibliographyConfig = convertToGenericConfig(bibliographyConfigSimplified);
