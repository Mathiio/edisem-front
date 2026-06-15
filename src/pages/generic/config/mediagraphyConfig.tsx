import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les médiagraphies
 * Template Omeka S: 83 (EdiSem médiagraphie)
 */
export const mediagraphyConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.mediagraphie.type,
  templateId: 83,
  editSingleColumn: true,

  fields: {
    title: {
      property: 'dcterms:title',
      type: 'title',
      zone: 'header',
      label: 'Titre du média',
      placeholder: 'Titre de la médiagraphie...',
    },
    description: {
      property: 'dcterms:abstract',
      type: 'textarea',
      label: 'Résumé',
      placeholder: 'Résumé du média...',
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
    director: {
      property: 'bibo:director',
      type: 'text',
      label: 'Directeur(s)',
      placeholder: 'Directeur(s)...',
      zone: 'details',
    },
    accountName: {
      property: 'foaf:accountName',
      type: 'text',
      label: 'Pseudonyme (ex. compte YouTube)',
      placeholder: 'Pseudonyme...',
      zone: 'details',
    },
    publisher: {
      property: 'dcterms:publisher',
      type: 'text',
      label: 'Éditeur / Plateforme',
      placeholder: 'Éditeur ou plateforme...',
      zone: 'details',
    },
    format: {
      property: 'dcterms:format',
      type: 'text',
      label: 'Format',
      placeholder: 'Format...',
      zone: 'details',
    },
    medium: {
      property: 'dcterms:medium',
      type: 'text',
      label: 'Support',
      placeholder: 'Support...',
      zone: 'details',
    },
    version: {
      property: 'schema:version',
      type: 'text',
      label: 'Version',
      placeholder: 'Version...',
      zone: 'details',
    },
    collection: {
      property: 'schema:collection',
      type: 'text',
      label: 'Collection',
      placeholder: 'Collection...',
      zone: 'details',
    },
    season: {
      property: 'schema:season',
      type: 'text',
      label: 'Saison',
      placeholder: 'Saison...',
      zone: 'details',
    },
    episodeNumber: {
      property: 'schema:episodeNumber',
      type: 'text',
      label: "Numéro d'épisode",
      placeholder: "Numéro d'épisode...",
      zone: 'details',
    },
    isPartOf: {
      property: 'dcterms:isPartOf',
      type: 'text',
      label: 'Titre du livre / série / émission',
      placeholder: 'Titre du livre, de la série ou de l\'émission...',
      zone: 'details',
    },
    presentedAt: {
      property: 'bibo:presentedAt',
      type: 'text',
      label: 'Événement',
      placeholder: 'Événement...',
      zone: 'details',
    },
    venue: {
      property: 'theatre:venue',
      type: 'text',
      label: 'Ville',
      placeholder: 'Ville...',
      zone: 'details',
    },
  },

  views: [],

  showKeywords: false,
  showRecommendations: false,
  showComments: false,
  formEnabled: true,
};

export const mediagraphyConfig = convertToGenericConfig(mediagraphyConfigSimplified);
