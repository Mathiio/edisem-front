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
            { key: 'director', label: 'Directeur(s)', property: 'bibo:director' },
            { key: 'accountName', label: 'Pseudonyme (ex. compte YouTube)', property: 'foaf:accountName', allowMultipleInputs: false },
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
            { key: 'publisher', label: 'Éditeur / Plateforme', property: 'dcterms:publisher', allowMultipleInputs: false },
            { key: 'format', label: 'Format', property: 'dcterms:format', allowMultipleInputs: false },
            { key: 'medium', label: 'Support', property: 'dcterms:medium', allowMultipleInputs: false },
            { key: 'version', label: 'Version', property: 'schema:version', allowMultipleInputs: false },
            { key: 'collection', label: 'Collection', property: 'schema:collection', allowMultipleInputs: false },
          ],
        },
      ],
    },
    {
      key: 'serie',
      title: 'Série',
      renderType: 'categories',
      categories: [
        {
          key: 'serie',
          title: 'Série',
          subcategories: [
            { key: 'season', label: 'Saison', property: 'schema:season', allowMultipleInputs: false },
            { key: 'episodeNumber', label: "Numéro d'épisode", property: 'schema:episodeNumber', allowMultipleInputs: false },
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
            { key: 'isPartOf', label: 'Titre du livre / série / émission', property: 'dcterms:isPartOf', allowMultipleInputs: false },
            { key: 'presentedAt', label: 'Événement', property: 'bibo:presentedAt', allowMultipleInputs: false },
            { key: 'venue', label: 'Ville', property: 'theatre:venue', allowMultipleInputs: false },
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

export const mediagraphyConfig = convertToGenericConfig(mediagraphyConfigSimplified);
