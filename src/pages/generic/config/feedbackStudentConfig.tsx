import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les retours d'expérience (étudiants)
 * Utilise le système SimplifiedDetailConfig pour générer automatiquement
 * les formulaires en mode édition/création.
 */
export const feedbackStudentConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.retour_experience_etudiant.type,
  templateId: 128,

  // Mapping des propriétés principales avec types explicites
  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    description: { property: 'dcterms:description', type: 'textarea', label: 'Description', placeholder: "Description du retour d'expérience...", zone: 'details' },
    contributors: {
      property: 'schema:contributor',
      type: 'resource',
      label: 'Contributeurs',
      resourceTemplateId: 96,
      multiSelect: true,
      zone: 'overview',
      editable: false,
    },
  },

  // Vues avec génération automatique des formulaires
  views: [
    {
      key: 'experimentation',
      title: 'Expérimentation',
      renderType: 'categories',
      categories: [
        {
          key: 'experimentation',
          title: 'Expérimentation',
          subcategories: [
            { key: 'achievements', label: 'Succès / Avancées notables', property: 'drama:achieves' },
            { key: 'issues', label: 'Problèmes rencontrés', property: 'bibo:issue' },
            { key: 'methodsUsed', label: 'Solutions apportées', property: 'cito:usesMethodIn' },
          ],
        },
      ],
    },
    {
      key: 'reactions',
      title: 'Réactions',
      renderType: 'categories',
      categories: [
        {
          key: 'reactions',
          title: 'Réactions',
          subcategories: [
            { key: 'reviews', label: 'Réactions du public ou des pairs', property: 'cito:reviews' },
            { key: 'instructionalMethod', label: "Suggestions pour d'autres expérimentateur·ices", property: 'dcterms:instructionalMethod' },
          ],
        },
      ],
    },
    {
      key: 'perspectives',
      title: 'Perspectives',
      renderType: 'categories',
      categories: [
        {
          key: 'perspectives',
          title: 'Perspectives',
          subcategories: [
            { key: 'potentialActions', label: 'Prolongements possibles', property: 'schema:potentialAction' },
            { key: 'coverage', label: "Autres contextes d'application", property: 'dcterms:coverage' },
            { key: 'workExamples', label: 'Modifications envisagées', property: 'schema:workExample' },
          ],
        },
      ],
    },
    {
      key: 'outils',
      title: 'Outils',
      property: 'schema:tool',
      renderType: 'items',
      urlPattern: '/corpus/outil/:id',
      resourceTemplateIds: [114, 129],
    },
  ],

  // Options d'affichage
  showKeywords: false,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: "Autres retours d'expérience",
  defaultView: 'experimentation',
  formEnabled: true,

  // Smart recommendations
  smartRecommendations: {
    // getAllResourcesOfType: async () => {
    //   const experimentations = await getExperimentations();
    //   const allFeedbacks: any[] = [];
    //   experimentations.forEach((exp: any) => {
    //     if (exp.feedbacks && Array.isArray(exp.feedbacks)) {
    //       allFeedbacks.push(...exp.feedbacks);
    //     }
    //   });
    //   return allFeedbacks;
    // },
    // getRelatedItems: () => [],
    maxRecommendations: 5,
  },
};

// Export de la config convertie pour utilisation avec ConfigurableDetailPage/GenericDetailPage
export const feedbackStudentConfig = convertToGenericConfig(feedbackStudentConfigSimplified);
