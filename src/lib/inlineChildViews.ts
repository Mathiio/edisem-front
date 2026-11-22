/**
 * Citations (template 80) et micro-résumés (template 125) liés à une conférence
 * via schema:citation / bibo:abstract — aligné sur ItemPageFetcher.
 */

import { getTemplatePropertiesMap } from '@/services/Items';
import { deleteUserResource } from '@/services/UserSpace';
import { requireOmekaOwnerForCreate } from '@/lib/currentOmekaUser';
import { OMEKA_API_BASE as API_BASE, omekaApiUrl } from '@/utils/omekaApi';

export interface InlineChildViewConfig {
  viewKey: string;
  renderType: 'citations' | 'microresumes';
  linkProperty: string;
  childTemplateId: number;
  detailsKey: 'citations' | 'microResumes';
}

export function buildInlineChildViewsFromConfig(
  views?: { key: string; renderType?: string; property?: string; resourceTemplateId?: number }[],
): InlineChildViewConfig[] {
  if (!views) return [];
  return views
    .filter((v) => (v.renderType === 'citations' || v.renderType === 'microresumes') && v.property && v.resourceTemplateId)
    .map((v) => ({
      viewKey: v.key,
      renderType: v.renderType as 'citations' | 'microresumes',
      linkProperty: v.property!,
      childTemplateId: v.resourceTemplateId!,
      detailsKey: v.renderType === 'citations' ? 'citations' : 'microResumes',
    }));
}

export function mapCitationToFormItem(raw: any) {
  return {
    id: raw.id,
    citation: raw.citation ?? '',
    startTime: Number(raw.startTime) || 0,
    endTime: Number(raw.endTime) || 0,
    actantId: raw.actant?.id != null && raw.actant.id !== '' ? Number(raw.actant.id) : undefined,
  };
}

export function mapMicroresumeToFormItem(raw: any) {
  const outils = Array.isArray(raw.outils)
    ? raw.outils
        .map((o: any) => ({
          id: Number(o.id),
          title: o.title ?? '',
          thumbnail: o.thumbnail ?? null,
        }))
        .filter((o: { id: number }) => o.id && !Number.isNaN(o.id))
    : [];
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    startTime: Number(raw.startTime) || 0,
    endTime: Number(raw.endTime) || 0,
    outils,
    outilIds: outils.map((o: { id: number }) => o.id),
  };
}

function literal(propId: number, value: string) {
  return { type: 'literal' as const, property_id: propId, '@value': value, is_public: true };
}

function resourceLink(propId: number, resourceId: number) {
  return { type: 'resource' as const, property_id: propId, value_resource_id: resourceId, is_public: true };
}

async function fetchOmekaItem(itemId: string | number): Promise<Record<string, unknown>> {
  const response = await fetch(omekaApiUrl(`${API_BASE}items/${itemId}`));
  if (!response.ok) throw new Error(`Item ${itemId} introuvable (${response.status})`);
  return response.json();
}

function linkedResourceIds(item: Record<string, unknown>, linkProperty: string): number[] {
  const entries = item[linkProperty];
  if (!Array.isArray(entries)) return [];
  return entries
    .map((e: any) => e?.value_resource_id ?? e?.id ?? e?.['o:id'])
    .filter((id: unknown) => id != null && id !== '')
    .map((id: unknown) => Number(id));
}

function buildCitationBody(
  item: ReturnType<typeof mapCitationToFormItem>,
  propMap: Record<string, number>,
): Record<string, unknown[]> {
  const body: Record<string, unknown[]> = {};
  const citeId = propMap['cito:hasCitedEntity'];
  const startId = propMap['schema:startTime'];
  const endId = propMap['schema:endTime'];
  const actantProp = propMap['cito:isCitedBy'];
  if (citeId) body['cito:hasCitedEntity'] = [literal(citeId, (item.citation ?? '').trim())];
  if (startId) body['schema:startTime'] = [literal(startId, String(item.startTime ?? 0))];
  if (endId) body['schema:endTime'] = [literal(endId, String(item.endTime ?? 0))];
  if (actantProp && item.actantId != null && !Number.isNaN(item.actantId)) {
    body['cito:isCitedBy'] = [resourceLink(actantProp, item.actantId)];
  }
  return body;
}

function buildMicroresumeBody(
  item: ReturnType<typeof mapMicroresumeToFormItem>,
  propMap: Record<string, number>,
): Record<string, unknown[]> {
  const body: Record<string, unknown[]> = {};
  const titleId = propMap['dcterms:title'];
  const descId = propMap['dcterms:description'];
  const startId = propMap['schema:startTime'];
  const endId = propMap['schema:endTime'];
  const instrumentId = propMap['schema:instrument'];
  if (titleId) body['dcterms:title'] = [literal(titleId, (item.title ?? '').trim())];
  if (descId) body['dcterms:description'] = [literal(descId, (item.description ?? '').trim())];
  if (startId) body['schema:startTime'] = [literal(startId, String(item.startTime ?? 0))];
  if (endId) body['schema:endTime'] = [literal(endId, String(item.endTime ?? 0))];
  if (instrumentId) {
    body['schema:instrument'] =
      item.outilIds?.length > 0
        ? item.outilIds.map((rid: number) => resourceLink(instrumentId, Number(rid)))
        : [];
  }
  return body;
}

async function createChildItem(
  templateId: number,
  body: Record<string, unknown>,
): Promise<number> {
  const payload: Record<string, unknown> = {
    'o:resource_template': { 'o:id': templateId },
    ...body,
    'o:owner': requireOmekaOwnerForCreate(),
  };
  const response = await fetch(omekaApiUrl(`${API_BASE}items`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.errors?.[0]?.message || 'Erreur création ressource liée');
  }
  const created = await response.json();
  return Number(created['o:id']);
}

async function updateChildItem(itemId: number, existing: Record<string, unknown>, body: Record<string, unknown[]>) {
  const updated = { ...existing, ...body };
  const response = await fetch(omekaApiUrl(`${API_BASE}items/${itemId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.errors?.[0]?.message || `Erreur mise à jour #${itemId}`);
  }
}

async function syncParentLinks(
  parentId: string | number,
  parentItem: Record<string, unknown>,
  linkProperty: string,
  childIds: number[],
  parentPropMap: Record<string, number>,
) {
  const propertyId = parentPropMap[linkProperty];
  if (!propertyId) {
    console.warn(`[inlineChildViews] property_id manquant pour ${linkProperty}`);
    return;
  }
  const updated = {
    ...parentItem,
    [linkProperty]: childIds.map((rid) => resourceLink(propertyId, rid)),
  };
  const response = await fetch(omekaApiUrl(`${API_BASE}items/${parentId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.errors?.[0]?.message || 'Erreur liaison parent');
  }
}

async function persistOneInlineChildView(
  parentId: string | number,
  parentTemplateId: number,
  view: InlineChildViewConfig,
  items: any[] | undefined,
) {
  if (!Array.isArray(items)) return;

  const parentItem = await fetchOmekaItem(parentId);
  const previousLinkedIds = linkedResourceIds(parentItem, view.linkProperty);
  const childPropMap = await getTemplatePropertiesMap(view.childTemplateId);
  const parentPropMap = await getTemplatePropertiesMap(parentTemplateId);

  const orderedChildIds: number[] = [];

  for (const raw of items) {
    if (view.renderType === 'citations') {
      const item = mapCitationToFormItem(raw);
      const body = buildCitationBody(item, childPropMap);
      if (!(item.citation ?? '').trim() && !item.id) continue;

      if (item.id) {
        const existing = await fetchOmekaItem(item.id);
        await updateChildItem(item.id, existing, body);
        orderedChildIds.push(item.id);
      } else {
        const newId = await createChildItem(view.childTemplateId, body);
        orderedChildIds.push(newId);
      }
    } else {
      const item = mapMicroresumeToFormItem(raw);
      const body = buildMicroresumeBody(item, childPropMap);
      const hasContent = (item.title ?? '').trim() || (item.description ?? '').trim();
      if (!hasContent && !item.id) continue;

      if (item.id) {
        const existing = await fetchOmekaItem(item.id);
        await updateChildItem(item.id, existing, body);
        orderedChildIds.push(item.id);
      } else {
        const newId = await createChildItem(view.childTemplateId, body);
        orderedChildIds.push(newId);
      }
    }
  }

  const removedIds = previousLinkedIds.filter((id) => !orderedChildIds.includes(id));
  for (const removedId of removedIds) {
    try {
      await deleteUserResource(removedId);
    } catch (err) {
      console.warn(`[inlineChildViews] suppression #${removedId}:`, err);
    }
  }

  const freshParent = await fetchOmekaItem(parentId);
  await syncParentLinks(parentId, freshParent, view.linkProperty, orderedChildIds, parentPropMap);
}

export async function persistInlineChildViews(
  parentId: string | number,
  parentTemplateId: number | undefined,
  views: InlineChildViewConfig[],
  data: Record<string, unknown>,
): Promise<void> {
  if (!parentTemplateId || views.length === 0) return;
  for (const view of views) {
  const payload = data[view.viewKey];
  if (payload === undefined) continue;
  await persistOneInlineChildView(parentId, parentTemplateId, view, payload as any[]);
  }
}

export function seedInlineChildFormData(
  itemDetails: Record<string, unknown>,
  views: InlineChildViewConfig[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const view of views) {
    const list = itemDetails[view.detailsKey];
    if (!Array.isArray(list) || list.length === 0) continue;
    out[view.viewKey] =
      view.renderType === 'citations'
        ? list.map(mapCitationToFormItem)
        : list.map(mapMicroresumeToFormItem);
  }
  return out;
}