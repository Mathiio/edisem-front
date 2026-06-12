import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { getSameCourseExperimentations } from '@/services/StudentSpace';

/**
 * Configuration simplifiée pour les expérimentations étudiantes
 * Utilisée pour le dropdown d'ajout et les formulaires
 */
export const experimentationStudentConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.experimentation_etudiant.type,
  templateId: RESOURCE_TYPES.experimentation_etudiant.templateIds[0],

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:date', type: 'date', zone: 'details' },
    description: { property: 'dcterms:description', type: 'textarea', label: 'Description', placeholder: 'Décrivez votre expérimentation...', zone: 'details' },
    percentage: { property: 'schema:ratingValue', type: 'slider', label: 'Avancement', min: 0, max: 100, step: 5, zone: 'overview' },
    contributors: {
      property: 'schema:agent',
      type: 'resource',
      label: 'Contributeurs',
      resourceTemplateId: 96,
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
  },

  views: [
    {
      key: 'bibo:abstract',
      title: 'Hypothèse',
      property: 'bibo:abstract',
      renderType: 'text',
    },
    {
      key: 'theatre:credit',
      title: 'Outils',
      property: 'theatre:credit',
      renderType: 'items',
      urlPattern: '/corpus/outil/:id',
      resourceTemplateIds: [114, 129],
    },
    {
      key: 'schema:description',
      title: "Retours d'expérience",
      property: 'schema:description',
      renderType: 'items',
      urlPattern: '/espace-etudiant/retour-experience/:id',
      resourceTemplateId: 128,
    },
    {
      key: 'dcterms:references',
      title: 'Références scientifiques',
      property: 'dcterms:references',
      renderType: 'references',
      referenceType: 'scientific',
      resourceTemplateIds: [81, 99, 98, 83],
    },
    {
      key: 'dcterms:bibliographicCitation',
      title: 'Références culturelles',
      property: 'dcterms:bibliographicCitation',
      renderType: 'references',
      referenceType: 'cultural',
      resourceTemplateIds: [81, 99, 98, 83],
    },
  ],

  showKeywords: true,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Expérimentations du même cours',
  recommendationType: 'experimentation_etudiant',
  defaultView: 'bibo:abstract',
  formEnabled: true,

  contributorButtons: [
    { label: 'Ajouter Étudiant', templateId: 96, property: 'schema:agent' },
  ],

  smartRecommendations: {
    // Pas de getAllResourcesOfType - on n'affiche que les expérimentations du même cours
    // Si aucune expérimentation du même cours, la section sera masquée
    getRelatedItems: async (itemDetails: any) => {
      // Récupérer les expérimentations du même cours uniquement
      // L'ID peut être dans 'id' ou 'o:id' selon le format Omeka S
      const itemId = itemDetails?.id || itemDetails?.['o:id'];
      if (itemId) {
        try {
          const sameCourseItems = await getSameCourseExperimentations(Number(itemId), 4);
          return sameCourseItems;
        } catch (error) {
          console.error('Error fetching same course experimentations:', error);
          return [];
        }
      }
      return [];
    },
    maxRecommendations: 4,
  },
};

// Export de la config convertie pour utilisation avec ConfigurableDetailPage/GenericDetailPage
export const experimentationStudentConfig = convertToGenericConfig(experimentationStudentConfigSimplified);
