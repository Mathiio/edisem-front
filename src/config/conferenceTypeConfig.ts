import type { ResourceType } from './resourceConfig';

/** Template Omeka S unifié pour toutes les conférences */
export const CONFERENCE_TEMPLATE_ID = 71;

/** Propriété Omeka S discriminant le type de conférence */
export const CONFERENCE_TYPE_PROPERTY = 'dcterms:type';
export const CONFERENCE_TYPE_PROPERTY_ID = 8;
export const CONFERENCE_TYPE_VOCAB_ID = 57;

/** Templates legacy (avant migration) */
export const LEGACY_CONFERENCE_TEMPLATE_IDS = {
  journee_etudes: 121,
  colloque: 122,
} as const;

/** Termes du vocabulaire custom « Type de conférence » (vocab 57) */
export const CONFERENCE_TYPE_TERMS = {
  seminaire: 'séminaire',
  journee_etudes: "journée d'études",
  colloque: 'colloque',
} as const;

export type ConferenceResourceType = 'seminaire' | 'journee_etudes' | 'colloque';

const CONFERENCE_RESOURCE_TYPES = new Set<string>(['seminaire', 'journee_etudes', 'colloque']);

const TERM_TO_RESOURCE_TYPE: Record<string, ConferenceResourceType> = {
  [CONFERENCE_TYPE_TERMS.seminaire]: 'seminaire',
  [CONFERENCE_TYPE_TERMS.journee_etudes]: 'journee_etudes',
  [CONFERENCE_TYPE_TERMS.colloque]: 'colloque',
};

const RESOURCE_TYPE_TO_TERM: Record<ConferenceResourceType, string> = {
  seminaire: CONFERENCE_TYPE_TERMS.seminaire,
  journee_etudes: CONFERENCE_TYPE_TERMS.journee_etudes,
  colloque: CONFERENCE_TYPE_TERMS.colloque,
};

/** Valeur Omeka S pour dcterms:type (custom vocab 57) */
export function buildConferenceTypeOmekaValue(
  term: string,
  propertyId: number = CONFERENCE_TYPE_PROPERTY_ID,
) {
  return {
    type: `customvocab:${CONFERENCE_TYPE_VOCAB_ID}`,
    property_id: propertyId,
    '@value': term,
    is_public: true,
  };
}

/** Extrait le terme dcterms:type depuis un item Omeka S */
export function extractConferenceTypeTerm(item: Record<string, unknown>): string | null {
  const values = item[CONFERENCE_TYPE_PROPERTY];
  if (!Array.isArray(values) || values.length === 0) return null;
  const raw = values[0]?.['@value'];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/** Résout le ResourceType à partir du terme dcterms:type */
export function resolveConferenceResourceTypeFromTerm(term: string | null | undefined): ConferenceResourceType | null {
  if (!term) return null;
  return TERM_TO_RESOURCE_TYPE[term.trim()] ?? null;
}

/** Résout le ResourceType d'une conférence depuis un item Omeka S (dcterms:type + fallback legacy template) */
export function resolveResourceTypeFromOmekaItem(item: Record<string, unknown>): ResourceType | null {
  const fromTerm = resolveConferenceResourceTypeFromTerm(extractConferenceTypeTerm(item));
  if (fromTerm) return fromTerm;

  const templateRef = item['o:resource_template'];
  let id: unknown = templateRef;
  if (templateRef && typeof templateRef === 'object' && 'o:id' in templateRef) {
    id = (templateRef as { 'o:id'?: number })['o:id'];
  }

  if (Number(id) === LEGACY_CONFERENCE_TEMPLATE_IDS.journee_etudes) return 'journee_etudes';
  if (Number(id) === LEGACY_CONFERENCE_TEMPLATE_IDS.colloque) return 'colloque';
  if (Number(id) === CONFERENCE_TEMPLATE_ID) return 'seminaire';

  return null;
}

export function isConferenceResourceType(type: string | undefined | null): type is ConferenceResourceType {
  return Boolean(type && CONFERENCE_RESOURCE_TYPES.has(type));
}

export function getConferenceTypeTermForResourceType(type: ConferenceResourceType): string {
  return RESOURCE_TYPE_TO_TERM[type];
}

/** URL de détail d'une conférence selon son type logique */
export function getConferenceDetailUrl(type: ConferenceResourceType, id: string | number): string {
  switch (type) {
    case 'journee_etudes':
      return `/corpus/journees-etudes/conference/${id}`;
    case 'colloque':
      return `/corpus/colloques/conference/${id}`;
    default:
      return `/corpus/seminaires/conference/${id}`;
  }
}

/** Indique si une propriété Omeka doit utiliser le custom vocab conférence */
export function isConferenceTypeOmekaProperty(
  propertyKey: string,
  templateId: number | string | undefined | null,
): boolean {
  return (
    propertyKey === CONFERENCE_TYPE_PROPERTY &&
    Number(templateId) === CONFERENCE_TEMPLATE_ID
  );
}
