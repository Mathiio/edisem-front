import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

/**
 * Configuration simplifiée pour les éléments esthétiques
 * Template 118 - Edisem (éléments esthétiques)
 */
export const elementEsthetiqueConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.element_esthetique.type,
  templateId: 118,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'schema:eventDate', type: 'date', label: 'Date de production', zone: 'details' },
    contributors: {
      property: 'dcterms:creator',
      type: 'resource',
      label: 'Artiste',
      resourceTemplateId: 72,
      multiSelect: true,
      zone: 'overview',
    },
  },

  views: [
    {
      key: 'Analyse',
      title: 'Analyse',
      renderType: 'categories',
      categories: [
        {
          key: 'characteristics',
          title: 'Caractéristiques',
          subcategories: [
            { key: 'genre', label: "Genre de l'œuvre", property: 'schema:genre', allowMultipleInputs: false  },
            { key: 'duration', label: "Durée de l'œuvre", property: 'schema:duration', allowMultipleInputs: false },
            { key: 'imageCharacteristic', label: 'Style visuel', property: 'schema:imageCharacteristic', allowMultipleInputs: false },
            { key: 'colorCharacteristic', label: 'Esthétique chromatique dominante', property: 'schema:colorCharacteristic', allowMultipleInputs: false },
            { key: 'formCharacteristic', label: 'Textures dominantes', property: 'schema:formCharacteristic', allowMultipleInputs: false },
            { key: 'soundCharacteristic', label: 'Style sonore', property: 'schema:soundCharacteristic', allowMultipleInputs: false },
            { key: 'language', label: 'Présence/Absence de texte', property: 'dcterms:language', allowMultipleInputs: false },
            { key: 'audience', label: 'Relation aux spectateur·ices', property: 'dcterms:audience', allowMultipleInputs: false },
            { key: 'temporal', label: "Temporalité de l'œuvre", property: 'schema:temporal', allowMultipleInputs: false },
          ],
        },
      ],
    },
  ],

  showKeywords: false,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Autres éléments esthétiques',
  recommendationType: 'element_esthetique',
  defaultView: 'Analyse',
  formEnabled: true,

  contributorButtons: [
    { label: 'Ajouter Intervenant', templateId: 72, property: 'dcterms:creator' },
    { label: 'Ajouter Étudiant', templateId: 96, property: 'dcterms:creator' },
  ],

  smartRecommendations: {
    maxRecommendations: 5,
  },
};

export const elementEsthetiqueConfig = convertToGenericConfig(elementEsthetiqueConfigSimplified);
