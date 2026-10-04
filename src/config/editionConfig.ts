/** Template Omeka S — Édition */
export const EDITION_TEMPLATE_ID = 77;

/** schema:isRelatedTo — l’édition liste ses conférences (value_resource_id = id conférence) */
export const EDITION_CONFERENCE_LINK_PROPERTY_ID = 937;

/** Métadonnées édition (IDs propriétés Omeka, alignés QuerySqlViewHelper) */
export const EDITION_YEAR_PROPERTY_ID = 7;
export const EDITION_SEASON_PROPERTY_ID = 1662;
/** Custom Vocab Omeka S « Saison » (template édition, data_type customvocab:47) */
export const EDITION_SEASON_VOCAB_ID = 47;
export const EDITION_SEASON_PROPERTY = 'schema:season';
/** Si l’API ne renvoie pas o:terms (vocab basé sur un item set). */
export const EDITION_SEASON_TERM_FALLBACK = ['hiver', 'printemps', 'été', 'automne'] as const;
export const EDITION_TYPE_PROPERTY_ID = 8;

export function buildEditionSeasonOmekaValue(
  term: string,
  propertyId: number = EDITION_SEASON_PROPERTY_ID,
) {
  return {
    type: `customvocab:${EDITION_SEASON_VOCAB_ID}`,
    property_id: propertyId,
    '@value': term.trim(),
    is_public: true,
  };
}

export type EditionTypeKey = 'seminaire' | 'colloque' | 'journee_etudes';

export const CONFERENCE_TERM_TO_EDITION_TYPE: Record<string, EditionTypeKey> = {
  séminaire: 'seminaire',
  seminaire: 'seminaire',
  colloque: 'colloque',
  "journée d'études": 'journee_etudes',
  'journee d etudes': 'journee_etudes',
};

export function conferenceTermToEditionTypeKey(term: string | null | undefined): EditionTypeKey {
  if (!term) return 'seminaire';
  const normalized = term.trim().toLowerCase();
  return CONFERENCE_TERM_TO_EDITION_TYPE[normalized] ?? CONFERENCE_TERM_TO_EDITION_TYPE[term.trim()] ?? 'seminaire';
}
