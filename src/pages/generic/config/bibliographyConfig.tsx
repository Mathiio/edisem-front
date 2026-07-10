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
  editSingleColumn: true,

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
    creator: {
      property: 'dcterms:creator',
      type: 'text',
      label: 'Auteur(s)',
      placeholder: 'Auteur(s)...',
      zone: 'details',
    },
    editor: {
      property: 'bibo:editor',
      type: 'text',
      label: 'Directeur(s)',
      placeholder: 'Directeur(s)...',
      zone: 'details',
    },
    publisher: {
      property: 'dcterms:publisher',
      type: 'text',
      label: 'Éditeur / Revue',
      placeholder: 'Maison d’édition, revue, site web ou institution...',
      zone: 'details',
    },
    volume: {
      property: 'bibo:volume',
      type: 'text',
      label: 'Volume',
      placeholder: 'Volume...',
      zone: 'details',
    },
    issue: {
      property: 'bibo:issue',
      type: 'text',
      label: 'Numéro',
      placeholder: 'Numéro...',
      zone: 'details',
    },
    pages: {
      property: 'bibo:pages',
      type: 'text',
      label: 'Pages',
      placeholder: 'Ex. 12-34',
      zone: 'details',
    },
    numPages: {
      property: 'bibo:numPages',
      type: 'text',
      label: 'Nombre de pages',
      placeholder: 'Nombre de pages...',
      zone: 'details',
    },
    collection: {
      property: 'schema:collection',
      type: 'text',
      label: 'Collection',
      placeholder: 'Collection...',
      zone: 'details',
    },
    isbn: {
      property: 'jdc:hasConcept',
      type: 'text',
      label: 'ISBN',
      placeholder: 'ISBN...',
      zone: 'details',
    },
    format: {
      property: 'dcterms:format',
      type: 'text',
      label: 'Format',
      placeholder: 'Format...',
      zone: 'details',
    },
    type: {
      property: 'dcterms:type',
      type: 'text',
      label: 'Type',
      placeholder: 'Type de document...',
      zone: 'details',
    },
    bookTitle: {
      property: 'dcterms:isPartOf',
      type: 'text',
      label: 'Titre du livre ',
      placeholder: 'Titre du livre sur lequel la note est faite...',
      zone: 'details',
    },
    event: {
      property: 'bibo:presentedAt',
      type: 'text',
      label: 'Événement',
      placeholder: 'Événement...',
      zone: 'details',
    },
  },

  views: [],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
  useItemPageEngine: true,
};

export const bibliographyConfig = convertToGenericConfig(bibliographyConfigSimplified);
