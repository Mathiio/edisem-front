import { getResourceConfigByTemplateId } from '@/config/resourceConfig';
import {
  EDITION_LABORATORY_PROPERTY,
  EDITION_ORGANIZER_PROPERTIES,
  EDITION_SEASON_PROPERTY,
  EDITION_UNIVERSITY_PROPERTY,
} from '@/config/editionConfig';
import {
  getResourceThumbnail,
  readOmekaPersonFirstName,
  readOmekaPersonLastName,
  resolveOmekaThumbnail,
} from '@/lib/resourceUtils';
import { EditionHostInstitution, EditionOrganizer } from '@/types/ui';
import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';

const UNIVERSITY_TEMPLATE_ID = 73;
const LABORATORY_TEMPLATE_ID = 91;
const ORGANIZER_TEMPLATE_IDS = new Set([72, 33]);

type OmekaResourceValue = {
  value_resource_id?: number;
  display_title?: string;
  thumbnail_url?: string;
};

type OmekaItem = {
  'o:id'?: number;
  'o:title'?: string;
  'o:resource_template'?: { 'o:id'?: number };
  'dcterms:alternative'?: { '@value'?: string }[];
  'foaf:firstName'?: { '@value'?: string }[];
  'foaf:lastName'?: { '@value'?: string }[];
  'foaf:familyName'?: { '@value'?: string }[];
  'schema:givenName'?: { '@value'?: string }[];
  'schema:familyName'?: { '@value'?: string }[];
  thumbnail_display_urls?: Record<string, string | undefined>;
  [key: string]: unknown;
};

function readResourceValues(item: OmekaItem, property: string): OmekaResourceValue[] {
  const raw = item[property];
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is OmekaResourceValue => v && typeof v === 'object' && v.value_resource_id != null);
}

function readOrganizerPropertyValues(item: OmekaItem): OmekaResourceValue[] {
  const merged: OmekaResourceValue[] = [];
  for (const property of EDITION_ORGANIZER_PROPERTIES) {
    merged.push(...readResourceValues(item, property));
  }
  return merged;
}

async function fetchOmekaItem(itemId: string | number): Promise<OmekaItem | null> {
  const res = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${itemId}`));
  if (!res.ok) return null;
  return res.json();
}

async function fetchOmekaItemsByIds(ids: number[]): Promise<Map<number, OmekaItem>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const query = unique.map((id) => `id[]=${encodeURIComponent(String(id))}`).join('&');
  const res = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items?${query}&per_page=${unique.length}`));
  if (!res.ok) return new Map();

  const list: OmekaItem[] = await res.json();
  const map = new Map<number, OmekaItem>();
  for (const item of list) {
    const id = item['o:id'];
    if (id != null) map.set(Number(id), item);
  }
  return map;
}

function readLiteralFirst(item: OmekaItem, property: string): string | undefined {
  const values = item[property];
  if (!Array.isArray(values) || !values[0]) return undefined;
  const v = values[0]['@value'];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function readPersonNames(
  item: OmekaItem,
  fallback?: string,
): { firstname: string; lastname: string } {
  let firstname = readOmekaPersonFirstName(item) || '';
  let lastname = readOmekaPersonLastName(item) || '';

  if (!firstname || !lastname) {
    const source = item['o:title']?.trim() || fallback?.trim() || '';
    if (source) {
      const parts = source.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        if (!firstname) firstname = parts[0];
        if (!lastname) lastname = parts.slice(1).join(' ');
      } else if (parts.length === 1 && !firstname && !lastname) {
        firstname = parts[0];
      }
    }
  }

  return {
    firstname: firstname.trim(),
    lastname: lastname.trim(),
  };
}

function institutionLogo(value: OmekaResourceValue, item?: OmekaItem): string | undefined {
  const fromValue = resolveOmekaThumbnail(value.thumbnail_url);
  if (fromValue) return fromValue;
  if (item) {
    const thumb = getResourceThumbnail(item);
    return thumb || undefined;
  }
  return undefined;
}

function hrefForTemplate(templateId: number, resourceId: number): string {
  const config = getResourceConfigByTemplateId(templateId);
  if (config?.getUrl) return config.getUrl(resourceId);
  return `/item/${resourceId}`;
}

function readEditionSeason(item: OmekaItem): string | undefined {
  const raw = item[EDITION_SEASON_PROPERTY];
  if (!Array.isArray(raw) || !raw[0] || typeof raw[0] !== 'object') return undefined;
  const entry = raw[0] as { display_title?: string; '@value'?: string };
  const season = (entry.display_title || entry['@value'] || '').trim();
  if (!season) return undefined;
  return season.charAt(0).toUpperCase() + season.slice(1);
}

export type EditionHeaderMeta = {
  hostInstitutions: EditionHostInstitution[];
  organizers: EditionOrganizer[];
  season?: string;
};

export async function fetchEditionHeaderMeta(editionId: string | number): Promise<EditionHeaderMeta> {
  const editionItem = await fetchOmekaItem(editionId);
  if (!editionItem) {
    return { hostInstitutions: [], organizers: [] };
  }

  const season = readEditionSeason(editionItem);

  const universityValues = readResourceValues(editionItem, EDITION_UNIVERSITY_PROPERTY);
  const laboratoryValues = readResourceValues(editionItem, EDITION_LABORATORY_PROPERTY);
  const organizerValues = readOrganizerPropertyValues(editionItem);

  const allIds = [
    ...universityValues.map((v) => v.value_resource_id!),
    ...laboratoryValues.map((v) => v.value_resource_id!),
    ...organizerValues.map((v) => v.value_resource_id!),
  ];
  let linkedById = await fetchOmekaItemsByIds(allIds);

  const organizerResourceIds = organizerValues
    .map((v) => v.value_resource_id)
    .filter((id): id is number => id != null);

  const affiliationIds: number[] = [];
  for (const orgId of organizerResourceIds) {
    const linked = linkedById.get(orgId);
    if (!linked) continue;
    for (const uniVal of readResourceValues(linked, EDITION_UNIVERSITY_PROPERTY)) {
      if (uniVal.value_resource_id != null) affiliationIds.push(uniVal.value_resource_id);
    }
  }
  if (affiliationIds.length > 0) {
    const affiliationLinked = await fetchOmekaItemsByIds(affiliationIds);
    linkedById = new Map([...linkedById, ...affiliationLinked]);
  }

  function readOrganizerAffiliations(linked: OmekaItem | undefined): string[] {
    if (!linked) return [];
    const labels: string[] = [];
    for (const uniVal of readResourceValues(linked, EDITION_UNIVERSITY_PROPERTY)) {
      const uniId = uniVal.value_resource_id;
      if (uniId != null) {
        const uniItem = linkedById.get(uniId);
        const short = uniItem ? readLiteralFirst(uniItem, 'dcterms:alternative') : undefined;
        const label = short || uniItem?.['o:title'] || uniVal.display_title;
        if (label?.trim()) labels.push(label.trim());
      } else if (uniVal.display_title?.trim()) {
        labels.push(uniVal.display_title.trim());
      }
    }
    return [...new Set(labels)];
  }

  const hostInstitutions: EditionHostInstitution[] = [];
  const seenHost = new Set<number>();

  const resolveHostKind = (
    linked: OmekaItem | undefined,
    sourceProperty: 'university' | 'laboratory',
  ): EditionHostInstitution['kind'] | null => {
    const templateId = linked?.['o:resource_template']?.['o:id'];
    if (templateId != null && ORGANIZER_TEMPLATE_IDS.has(templateId)) return null;
    if (templateId === LABORATORY_TEMPLATE_ID) return 'laboratoire';
    if (templateId === UNIVERSITY_TEMPLATE_ID) return 'universite';
    if (sourceProperty === 'laboratory') return 'laboratoire';
    return 'universite';
  };

  const pushInstitutionFromValue = (
    value: OmekaResourceValue,
    sourceProperty: 'university' | 'laboratory',
  ) => {
    const id = value.value_resource_id!;
    if (seenHost.has(id)) return;
    const linked = linkedById.get(id);
    const kind = resolveHostKind(linked, sourceProperty);
    if (!kind) return;

    const templateId = linked?.['o:resource_template']?.['o:id'];
    const fallbackTemplateId =
      kind === 'laboratoire' ? LABORATORY_TEMPLATE_ID : UNIVERSITY_TEMPLATE_ID;

    seenHost.add(id);
    const title =
      linked?.['o:title'] ||
      value.display_title ||
      (kind === 'universite' ? 'Université' : 'Laboratoire');
    const shortTitle = readLiteralFirst(linked ?? {}, 'dcterms:alternative');

    hostInstitutions.push({
      id,
      title,
      shortTitle: shortTitle || undefined,
      logo: institutionLogo(value, linked),
      kind,
      href: hrefForTemplate(templateId ?? fallbackTemplateId, id),
    });
  };

  universityValues.forEach((v) => pushInstitutionFromValue(v, 'university'));

  const organizers: EditionOrganizer[] = [];
  const seenOrganizer = new Set<number>();

  const pushOrganizer = (value: OmekaResourceValue) => {
    const id = value.value_resource_id!;
    if (seenOrganizer.has(id)) return;
    const linked = linkedById.get(id);
    const templateId = linked?.['o:resource_template']?.['o:id'];
    if (templateId == null || !ORGANIZER_TEMPLATE_IDS.has(templateId)) return;

    seenOrganizer.add(id);
    const picture =
      resolveOmekaThumbnail(value.thumbnail_url) ??
      (linked ? getResourceThumbnail(linked) || undefined : undefined);

    const names = linked
      ? readPersonNames(linked, value.display_title)
      : readPersonNames({}, value.display_title);

    const affiliations = readOrganizerAffiliations(linked);

    organizers.push({
      id,
      firstname: names.firstname || 'Organisateur',
      lastname: names.lastname,
      picture,
      href: hrefForTemplate(templateId, id),
      affiliations: affiliations.length > 0 ? affiliations : undefined,
    });
  };

  for (const value of laboratoryValues) {
    const linked = linkedById.get(value.value_resource_id!);
    const templateId = linked?.['o:resource_template']?.['o:id'];

    if (templateId != null && ORGANIZER_TEMPLATE_IDS.has(templateId)) {
      // Champ Omeka « Organisateur » mappé sur jdc:hasLaboratoire (legacy)
      pushOrganizer(value);
    } else {
      pushInstitutionFromValue(value, 'laboratory');
    }
  }

  for (const value of organizerValues) {
    pushOrganizer(value);
  }

  return { hostInstitutions, organizers, season };
}
