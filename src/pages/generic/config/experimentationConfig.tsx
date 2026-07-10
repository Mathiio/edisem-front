import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { RELATED_RESOURCES_FIELD, createRelatedResourcesSmartRecommendations } from '@/config/relatedResourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les expérimentations (actants)
 * Template 108 - Edisem (Expérimentations)
 */
export const experimentationConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.experimentation.type,
  templateId: 108,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:date', type: 'date', zone: 'details' },
    description: { property: 'dcterms:description', type: 'textarea', label: 'Intentions artistiques/théoriques', zone: 'details' },
    abstract: { property: 'bibo:abstract', type: 'textarea', label: "Résumé de l'expérimentation", zone: 'details' },
    percentage: { property: 'schema:ratingValue', type: 'slider', label: "État d'avancement", min: 0, max: 100, step: 5, zone: 'overview' },
    status: { property: 'schema:status', type: 'status', label: 'Statut', zone: 'overview' },
    material: { property: 'schema:artMedium', type: 'textarea', label: 'Type(s) de média / médium', zone: 'details' },
    contributors: {
      property: 'schema:agent',
      type: 'resource',
      label: 'Artiste(s)',
      resourceTemplateId: 72,
      multiSelect: true,
      zone: 'overview',
      sourceProperties: ['schema:agent', 'cito:credits'],
    },
    keywords: {
      property: 'jdc:hasConcept',
      type: 'resource',
      label: 'Mots-clés',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'header',
    },
    externalLink: { property: 'schema:url', type: 'url', label: 'Lien externe', placeholder: 'https://...', zone: 'details' },
    relatedResources: RELATED_RESOURCES_FIELD,
  },

  views: [
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
      property: 'theatre:credit',
      renderType: 'items',
      urlPattern: '/corpus/outil/:id',
      resourceTemplateId: 114,
    },
    {
      key: 'Feedbacks',
      title: "Retours d'expérience",
      property: 'schema:description',
      renderType: 'items',
      urlPattern: '/corpus/retour-experience/:id',
      resourceTemplateId: 110,
    },
    {
      key: 'Inspirations',
      title: 'Inspirations / Généalogies artistiques',
      property: 'dcterms:source',
      renderType: 'text',
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
  recommendationsTitle: 'Contenus associés',
  recommendationType: 'experimentation',
  defaultView: 'ElementsNarratifs',
  formEnabled: true,
  useItemPageEngine: true,

  contributorButtons: [
    { label: 'Ajouter Intervenant', templateId: 72, property: 'schema:agent' },
  ],

  smartRecommendations: createRelatedResourcesSmartRecommendations(),
};

export const experimentationConfig = convertToGenericConfig(experimentationConfigSimplified);
