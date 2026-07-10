import { getResourceCardsByKeyword } from '@/services/Items';
import { CONFERENCE_TEMPLATE_ID } from '@/config/conferenceTypeConfig';
import { RESOURCE_TYPES, getResourceConfigByTemplateId } from '@/config/resourceConfig';
import { type PickerListItem } from '@/services/resourcePickerApi';

const ALLOWED_TYPES = new Set([
  'seminaire',
  'journee_etudes',
  'colloque',
  'experimentation',
  'recit_scientifique',
  'recit_artistique',
  'recit_techno_industriel',
  'recit_citoyen',
  'recit_mediatique',
]);

function getCardTemplateId(card: Record<string, unknown>): number {
  return Number(
    card.template_id ?? card.templateId ?? card.resource_template_id ?? card.class ?? 0,
  );
}

function resolveCardResourceType(card: Record<string, unknown>): string {
  const explicitType = card.type;
  if (explicitType) return String(explicitType);

  const templateId = getCardTemplateId(card);
  if (templateId === CONFERENCE_TEMPLATE_ID) return 'seminaire';

  const config = getResourceConfigByTemplateId(templateId);
  return config?.type ?? '';
}

function cardMatchesAllowedTemplates(card: Record<string, unknown>, allowedTemplateIds: Set<number>): boolean {
  const templateId = getCardTemplateId(card);
  if (templateId && allowedTemplateIds.has(templateId)) return true;

  if (allowedTemplateIds.has(CONFERENCE_TEMPLATE_ID) && templateId === CONFERENCE_TEMPLATE_ID) {
    return true;
  }

  const type = resolveCardResourceType(card);
  if (!type || !ALLOWED_TYPES.has(type)) return false;

  const config = RESOURCE_TYPES[type as keyof typeof RESOURCE_TYPES];
  if (!config) return false;
  return config.templateIds.some((id) => allowedTemplateIds.has(id));
}

function cardToPickerItem(card: Record<string, unknown>): PickerListItem {
  const type = resolveCardResourceType(card);
  return {
    id: Number(card.id),
    title: String(card.title ?? card.name ?? `Item ${card.id}`),
    thumbnail: (card.thumbnail ?? card.thumbnailUrl ?? card.picture) as string | undefined,
    subtitle: type || undefined,
  };
}

function buildExcludeIdSet(
  excludeItemId?: string | number,
  excludeIds?: (string | number)[],
): Set<string> {
  const excluded = new Set<string>();
  if (excludeItemId != null) excluded.add(String(excludeItemId));
  for (const id of excludeIds ?? []) {
    excluded.add(String(id));
  }
  return excluded;
}

/** Suggestions basées sur le recoupement des mots-clés de la fiche courante. */
export async function fetchRelatedResourceSuggestions(options: {
  keywordIds: (string | number)[];
  allowedTemplateIds: number[];
  excludeItemId?: string | number;
  excludeIds?: (string | number)[];
  limit?: number;
}): Promise<PickerListItem[]> {
  const { keywordIds, allowedTemplateIds, excludeItemId, excludeIds, limit = 4 } = options;
  if (keywordIds.length === 0) return [];

  const allowed = new Set(allowedTemplateIds);
  const excluded = buildExcludeIdSet(excludeItemId, excludeIds);
  const scoreMap = new Map<number, { item: PickerListItem; score: number }>();

  const batches = await Promise.all(
    keywordIds.slice(0, 10).map((keywordId) => getResourceCardsByKeyword(keywordId, 32)),
  );

  for (const cards of batches) {
    if (!Array.isArray(cards)) continue;
    for (const raw of cards) {
      const card = raw as Record<string, unknown>;
      const id = Number(card.id);
      if (!id || Number.isNaN(id)) continue;
      if (excluded.has(String(id))) continue;
      if (!cardMatchesAllowedTemplates(card, allowed)) continue;

      const item = cardToPickerItem(card);
      const existing = scoreMap.get(id);
      if (existing) {
        existing.score += 1;
      } else {
        scoreMap.set(id, { item, score: 1 });
      }
    }
  }

  return [...scoreMap.values()]
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'fr'))
    .slice(0, limit)
    .map(({ item, score }) => ({ ...item, matchScore: score }));
}

export function getTemplateLabel(templateId: number): string {
  return getResourceConfigByTemplateId(templateId)?.label ?? `Template ${templateId}`;
}
