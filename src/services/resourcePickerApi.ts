/**
 * Appels légers au helper backend ResourcePicker (edisem-back).
 * Remplace les requêtes Omeka /items complètes pour le ResourcePicker front.
 */

export interface PickerListItem {
  id: number;
  title: string;
  thumbnail?: string;
  subtitle?: string;
  owner_id?: number | null;
}

export interface PickerListResponse {
  success: boolean;
  items: PickerListItem[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  error?: string;
}

const PER_PAGE = 200;
const MAX_PAGES = 100;

/** Même base que les autres appels ajax (Query, MotsCles, …) */
const EDISEM_AJAX_BASE =
  import.meta.env.VITE_EDISEM_AJAX_BASE ??
  (import.meta.env.DEV ? 'https://tests.arcanes.ca/omk/s/edisem/page/ajax' : '/omk/s/edisem/page/ajax');

function buildPickerUrl(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams({
    helper: 'ResourcePicker',
    action: 'list',
    json: '1',
  });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return `${EDISEM_AJAX_BASE}?${searchParams.toString()}`;
}

export async function fetchPickerPage(options: {
  templateId?: number;
  itemSetId?: number;
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<PickerListResponse> {
  const params: Record<string, string | number | undefined> = {
    page: options.page ?? 1,
    per_page: options.perPage ?? PER_PAGE,
  };

  if (options.templateId) params.template_id = options.templateId;
  if (options.itemSetId) params.item_set_id = options.itemSetId;
  if (options.q?.trim()) params.q = options.q.trim();

  const response = await fetch(buildPickerUrl(params));
  if (!response.ok) {
    return {
      success: false,
      items: [],
      total: 0,
      page: options.page ?? 1,
      per_page: options.perPage ?? PER_PAGE,
      has_more: false,
      error: `HTTP ${response.status}`,
    };
  }

  const text = await response.text();
  if (!text.trim()) {
    return {
      success: false,
      items: [],
      total: 0,
      page: options.page ?? 1,
      per_page: options.perPage ?? PER_PAGE,
      has_more: false,
      error: 'Réponse vide',
    };
  }

  let data: PickerListResponse;
  try {
    data = JSON.parse(text) as PickerListResponse;
  } catch {
    return {
      success: false,
      items: [],
      total: 0,
      page: options.page ?? 1,
      per_page: options.perPage ?? PER_PAGE,
      has_more: false,
      error: 'Réponse non-JSON (helper ResourcePicker indisponible ?)',
    };
  }

  if (!data.success) {
    return {
      success: false,
      items: [],
      total: 0,
      page: options.page ?? 1,
      per_page: options.perPage ?? PER_PAGE,
      has_more: false,
      error: data.error ?? 'Erreur inconnue',
    };
  }

  return data;
}

/** Charge toutes les pages (pagination backend) pour un template ou un item set. */
export async function fetchAllPickerResources(options: {
  templateId?: number;
  itemSetId?: number;
  q?: string;
}): Promise<PickerListItem[]> {
  const all: PickerListItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const res = await fetchPickerPage({ ...options, page, perPage: PER_PAGE });
    if (!res.success) break;
    all.push(...res.items);
    hasMore = res.has_more;
    page++;
  }

  return all;
}

/** Normalise un item backend vers la forme attendue par ResourcePicker. */
export function normalizePickerItem(item: PickerListItem): Record<string, unknown> {
  return {
    id: item.id,
    'o:id': item.id,
    title: item.title,
    display_title: item.title,
    thumbnail: item.thumbnail,
    subtitle: item.subtitle,
    owner_id: item.owner_id ?? null,
  };
}
