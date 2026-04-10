import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les bibliographies étudiantes
 * Template Omeka S: 81 (EdiSem bibliographie)
 */
export const bibliographyStudentConfigSimplified: SimplifiedDetailConfig = {
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
      key: 'details',
      title: 'Informations',
      renderType: 'categories',
      categories: [
        {
          key: 'authors',
          title: 'Auteurs',
          subcategories: [
            { key: 'creator', label: 'Auteur(s)', property: 'dcterms:creator' },
            { key: 'editor', label: 'Directeur(s)', property: 'bibo:editor' },
            { key: 'account', label: 'Compte Twitter/X', property: 'foaf:accountName' },
          ],
        },
        {
          key: 'publication',
          title: 'Publication',
          subcategories: [
            { key: 'publisher', label: 'Éditeur / Revue', property: 'dcterms:publisher' },
            { key: 'volume', label: 'Volume', property: 'bibo:volume' },
            { key: 'issue', label: 'Numéro', property: 'bibo:issue' },
            { key: 'pages', label: 'Pages', property: 'bibo:pages' },
            { key: 'numPages', label: 'Nombre de pages', property: 'bibo:numPages' },
            { key: 'collection', label: 'Collection', property: 'schema:collection' },
          ],
        },
        {
          key: 'identification',
          title: 'Identification',
          subcategories: [
            { key: 'isbn', label: 'ISBN', property: 'jdc:hasConcept' },
            { key: 'format', label: 'Format', property: 'dcterms:format' },
            { key: 'type', label: 'Type', property: 'dcterms:type' },
          ],
        },
        {
          key: 'source',
          title: 'Source',
          subcategories: [
            { key: 'bookTitle', label: 'Titre du livre', property: 'dcterms:isPartOf' },
            { key: 'event', label: 'Événement', property: 'bibo:presentedAt' },
          ],
        },
      ],
    },
  ],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  defaultView: 'details',
  formEnabled: true,
};

// Export de la config convertie pour utilisation avec ConfigurableDetailPage/GenericDetailPage
export const bibliographyStudentConfig = convertToGenericConfig(bibliographyStudentConfigSimplified);
