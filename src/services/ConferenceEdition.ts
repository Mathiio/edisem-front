/**
 * Liaison conférence ↔ édition (template 77, propriété 937 sur l’édition).
 */

import * as Items from '@/services/Items';
import {
  EDITION_TEMPLATE_ID,
  EDITION_CONFERENCE_LINK_PROPERTY_ID,
  EDITION_YEAR_PROPERTY_ID,
  EDITION_SEASON_PROPERTY_ID,
  buildEditionSeasonOmekaValue,
  type EditionTypeKey,
  conferenceTermToEditionTypeKey,
} from '@/config/editionConfig';
import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';

export type EditionLinkFormState = {
  mode: 'existing' | 'create';
  editionId: number | null;
  title: string;
  year: string;
  season: string;
};

export const emptyEditionLinkState = (): EditionLinkFormState => ({
  mode: 'existing',
  editionId: null,
  title: '',
  year: '',
  season: '',
});

export async function findEditionIdForConference(conferenceId: number): Promise<number | null> {
  for (const typeKey of ['seminaire', 'colloque', 'journee_etudes'] as EditionTypeKey[]) {
    const editions = await Items.getEditionsByType(typeKey);
    if (!Array.isArray(editions)) continue;
    for (const ed of editions) {
      const confs = ed.conferences ?? [];
      if (confs.some((c: { id?: string | number }) => Number(c.id) === conferenceId)) {
        return Number(ed.id);
      }
    }
  }
  return null;
}

export async function loadEditionLinkForConference(conferenceId: number): Promise<EditionLinkFormState> {
  const editionId = await findEditionIdForConference(conferenceId);
  if (!editionId) return emptyEditionLinkState();

  const details = await Items.getEditionDetails(editionId);
  const edition = details?.edition;
  return {
    mode: 'existing',
    editionId,
    title: edition?.title ?? '',
    year: edition?.year ?? '',
    season: edition?.season ?? '',
  };
}

export async function listEditionsForConferenceType(conferenceTypeTerm: string | undefined) {
  const typeKey = conferenceTermToEditionTypeKey(conferenceTypeTerm);
  const editions = await Items.getEditionsByType(typeKey);
  return Array.isArray(editions) ? editions : [];
}

function conferenceLinkValues(raw: Record<string, unknown>, conferenceId: number) {
  const propKey = 'schema:isRelatedTo';
  const existing = Array.isArray(raw[propKey]) ? [...(raw[propKey] as object[])] : [];
  const has = existing.some(
    (v: any) => Number(v?.value_resource_id ?? v?.['value_resource_id']) === conferenceId,
  );
  if (has) return existing;
  return [
    ...existing,
    {
      type: 'resource',
      property_id: EDITION_CONFERENCE_LINK_PROPERTY_ID,
      value_resource_id: conferenceId,
      is_public: true,
    },
  ];
}

function conferenceLinkValuesWithout(raw: Record<string, unknown>, conferenceId: number) {
  const propKey = 'schema:isRelatedTo';
  const existing = Array.isArray(raw[propKey]) ? (raw[propKey] as any[]) : [];
  return existing.filter((v) => Number(v?.value_resource_id ?? v?.['value_resource_id']) !== conferenceId);
}

function upsertLiteralByPropertyId(
  raw: Record<string, unknown>,
  propertyId: number,
  value: string,
  fallbackKey: string,
) {
  if (!value.trim()) return raw;
  const next = { ...raw };
  let targetKey = fallbackKey;
  for (const [key, vals] of Object.entries(next)) {
    if (!Array.isArray(vals)) continue;
    if ((vals as { property_id?: number }[]).some((v) => v?.property_id === propertyId)) {
      targetKey = key;
      break;
    }
  }
  next[targetKey] = [
    { type: 'literal', property_id: propertyId, '@value': value.trim(), is_public: true },
  ];
  return next;
}

function applyEditionMetadata(
  raw: Record<string, unknown>,
  meta: Pick<EditionLinkFormState, 'title' | 'year' | 'season'>,
) {
  let next = { ...raw };
  if (meta.title.trim()) {
    next['dcterms:title'] = [
      { type: 'literal', property_id: 1, '@value': meta.title.trim(), is_public: true },
    ];
    next['o:title'] = meta.title.trim();
  }
  next = upsertLiteralByPropertyId(next, EDITION_YEAR_PROPERTY_ID, meta.year, 'dcterms:date');
  next = upsertEditionSeason(next, meta.season);
  return next;
}

function upsertEditionSeason(raw: Record<string, unknown>, season: string) {
  if (!season.trim()) return raw;
  const next = { ...raw };
  let targetKey = 'schema:season';
  for (const [key, vals] of Object.entries(next)) {
    if (!Array.isArray(vals)) continue;
    if ((vals as { property_id?: number }[]).some((v) => v?.property_id === EDITION_SEASON_PROPERTY_ID)) {
      targetKey = key;
      break;
    }
  }
  next[targetKey] = [buildEditionSeasonOmekaValue(season)];
  return next;
}

async function fetchEditionItem(editionId: number): Promise<Record<string, unknown>> {
  const res = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${editionId}`));
  if (!res.ok) throw new Error('Impossible de charger l’édition');
  return res.json();
}

async function putEditionItem(editionId: number, body: Record<string, unknown>) {
  const res = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${editionId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.message || 'Échec de la mise à jour de l’édition');
  }
}

function getConnectedOmekaOwner(): { 'o:id': number } | undefined {
  const raw = localStorage.getItem('omekaUserId');
  const id = raw ? parseInt(raw, 10) : NaN;
  return id > 0 ? { 'o:id': id } : undefined;
}

async function createEditionItem(
  meta: Pick<EditionLinkFormState, 'title' | 'year' | 'season'>,
  conferenceId: number,
): Promise<number> {
  const owner = getConnectedOmekaOwner();
  const body: Record<string, unknown> = {
    'o:resource_template': { 'o:id': EDITION_TEMPLATE_ID },
    'o:is_public': true,
    ...(owner ? { 'o:owner': owner } : {}),
    'dcterms:title': [{ type: 'literal', property_id: 1, '@value': meta.title.trim(), is_public: true }],
    'schema:isRelatedTo': [
      {
        type: 'resource',
        property_id: EDITION_CONFERENCE_LINK_PROPERTY_ID,
        value_resource_id: conferenceId,
        is_public: true,
      },
    ],
  };
  if (meta.year.trim()) {
    body['dcterms:date'] = [
      { type: 'literal', property_id: EDITION_YEAR_PROPERTY_ID, '@value': meta.year.trim(), is_public: true },
    ];
  }
  if (meta.season.trim()) {
    body['schema:season'] = [buildEditionSeasonOmekaValue(meta.season)];
  }

  const res = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.message || 'Échec de la création de l’édition');
  }
  const created = await res.json();
  return Number(created['o:id']);
}

export async function persistConferenceEditionLink(
  conferenceId: number,
  state: EditionLinkFormState | undefined | null,
): Promise<void> {
  if (!state) return;

  const previousEditionId = await findEditionIdForConference(conferenceId);

  if (state.mode === 'create') {
    if (!state.title.trim()) return;
    if (previousEditionId) {
      const prev = await fetchEditionItem(previousEditionId);
      await putEditionItem(previousEditionId, {
        ...prev,
        'schema:isRelatedTo': conferenceLinkValuesWithout(prev, conferenceId),
      });
    }
    await createEditionItem(state, conferenceId);
    return;
  }

  if (!state.editionId) {
    if (previousEditionId) {
      const prev = await fetchEditionItem(previousEditionId);
      await putEditionItem(previousEditionId, {
        ...prev,
        'schema:isRelatedTo': conferenceLinkValuesWithout(prev, conferenceId),
      });
    }
    return;
  }

  if (previousEditionId && previousEditionId !== state.editionId) {
    const prev = await fetchEditionItem(previousEditionId);
    await putEditionItem(previousEditionId, {
      ...prev,
      'schema:isRelatedTo': conferenceLinkValuesWithout(prev, conferenceId),
    });
  }

  let editionRaw = await fetchEditionItem(state.editionId);
  editionRaw = applyEditionMetadata(editionRaw, state);
  editionRaw['schema:isRelatedTo'] = conferenceLinkValues(editionRaw, conferenceId);
  await putEditionItem(state.editionId, editionRaw);
}
