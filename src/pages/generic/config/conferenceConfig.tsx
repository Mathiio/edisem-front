import { RESOURCE_TYPES } from '@/config/resourceConfig';
import {
  CONFERENCE_TYPE_PROPERTY,
  CONFERENCE_TYPE_VOCAB_ID,
  CONFERENCE_TYPE_TERMS,
} from '@/config/conferenceTypeConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';

export const conferenceConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.seminaire.type,
  templateId: 71,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    date: { property: 'dcterms:date', type: 'date', zone: 'details' },
    description: { property: 'dcterms:abstract', type: 'textarea', label: 'Résumé', zone: 'details' },
    conferenceType: {
      property: CONFERENCE_TYPE_PROPERTY,
      type: 'select',
      label: 'Type de conférence',
      zone: 'details',
      customVocabId: CONFERENCE_TYPE_VOCAB_ID,
      options: [
        { value: CONFERENCE_TYPE_TERMS.seminaire, label: 'Séminaire' },
        { value: CONFERENCE_TYPE_TERMS.journee_etudes, label: "Journée d'études" },
        { value: CONFERENCE_TYPE_TERMS.colloque, label: 'Colloque' },
      ],
    },
    contributors: {
      property: 'schema:agent',
      type: 'resource',
      label: 'Conférencier',
      resourceTemplateId: 72,
      multiSelect: true,
      zone: 'overview',
      editable: false,
    },
    keywords: {
      property: 'jdc:hasConcept',
      type: 'resource',
      label: 'Mots-clés',
      resourceTemplateId: 34,
      multiSelect: true,
      zone: 'header',
    },
  },

  views: [
    {
      key: 'MicroResumes',
      title: 'Micro-résumés',
      renderType: 'microresumes',
      resourceTemplateId: 125,
      editable: true,
    },
    {
      key: 'Citations',
      title: 'Citations',
      renderType: 'citations',
      resourceTemplateId: 80,
      editable: true,
    },
    {
      key: 'Bibliographie',
      title: 'Bibliographie',
      property: 'dcterms:references',
      renderType: 'references',
      resourceTemplateIds: [81, 99],
      editable: true,
    },
    {
      key: 'Medias',
      title: 'Médias',
      property: 'schema:associatedMedia',
      renderType: 'references',
      resourceTemplateIds: [83, 98],
      editable: true,
    },
  ],

  resourceLabel: 'Conférence',

  showKeywords: true,
  showRecommendations: true,
  showComments: true,
  recommendationsTitle: 'Conférences associées',
  defaultView: 'MicroResumes',
  formEnabled: true,

  contributorButtons: [
    { label: 'Ajouter Intervenant', templateId: 72, property: 'schema:agent' },
  ],
};

export const conferenceConfig = convertToGenericConfig(conferenceConfigSimplified);
