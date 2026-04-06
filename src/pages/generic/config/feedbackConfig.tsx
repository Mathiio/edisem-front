import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les retours d'expérience (actants)
 * Duplication du feedbackStudentConfig avec templateId 110 au lieu de 128.
 */
export const feedbackConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.retour_experience.type,
  templateId: 110,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    description: { property: 'dcterms:description', type: 'textarea', label: 'Description', placeholder: "Description du retour d'expérience...", zone: 'details' },
    contributors: { property: 'schema:contributor', type: 'resource', label: 'Contributeurs', resourceTemplateId: 72, multiSelect: true, zone: 'overview' },
  },

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

  showKeywords: false,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: "Autres retours d'expérience",
  defaultView: 'experimentation',
  formEnabled: true,

  smartRecommendations: {
    maxRecommendations: 5,
  },
};

export const feedbackConfig = convertToGenericConfig(feedbackConfigSimplified);
