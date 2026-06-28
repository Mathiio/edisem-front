import { VocabGroupField } from '../simplifiedConfig';

/**
 * Champs communs pour la section "Imaginaire de l'IA" présente dans tous les récits.
 * Propriétés et property_id alignés sur l'instance Edisem.
 */
export const IMAGINAIRE_IA_VOCAB_FIELDS: VocabGroupField[] = [
  {
    label: "Position de l'IA / Technologie au sein du récit",
    property: 'schema:characterAttribute',
    type: 'textarea',
    propertyId: 534,
    placeholder: "Décrivez la position de l'IA dans l'œuvre...",
  },
  {
    label: "Enjeux de l'IA",
    property: 'storyline:hasTheme',
    type: 'customVocab',
    vocabId: 50,
    propertyId: 3233,
  },
  {
    label: "Figure de l'IA",
    property: 'storyline:hasRole',
    type: 'customVocab',
    vocabId: 55,
    propertyId: 3235,
  },
  {
    label: 'Cadrages idéologiques',
    property: 'genstory:hasParam',
    type: 'customVocab',
    vocabId: 56,
    propertyId: 2082,
  },
  {
    label: "Promesses et bénéfices de l'IA",
    property: 'genstory:hasMonde',
    type: 'customVocab',
    vocabId: 51,
    propertyId: 2080,
  },
  {
    label: 'Risques et mises en garde',
    property: 'storyline:hasRisk',
    type: 'customVocab',
    vocabId: 54,
    propertyId: 3240,
  },
  {
    label: 'Effets sur le spectateur / public',
    property: 'storyline:hasAffect',
    type: 'customVocab',
    vocabId: 53,
    propertyId: 3239,
  },
];
