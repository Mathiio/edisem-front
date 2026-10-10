/**
 * Service Playlist — via UserSpaceViewHelper PHP (pattern identique aux autres actions UserSpace)
 * Template Omeka ID 133
 */

import { edisemHelperAjaxUrl, omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';
import { getYouTubeThumbnail, isOmekaPlaceholderThumbnail } from '@/lib/resourceUtils';
import { TEMPLATE_ID_TO_TYPE, resolveResourceTypeFromOmekaItem } from '@/config/resourceConfig';

export const PLAYLIST_TEMPLATE_ID = 133;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaylistItemEntry {
  id: number;
  addedAt: string;
  note: string | null;
}

export interface Playlist {
  id: number;
  title: string;
  description: string;
  visibility: 'private' | 'public';
  items: PlaylistItemEntry[];
  createdAt: string;
  modifiedAt: string;
}

export interface PlaylistCard {
  id: number;
  title: string;
  thumbnail?: string | null;
  type?: string;
  actants?: { name?: string; title?: string; picture?: string | null }[];
  date?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(action: string, params: Record<string, string | number | object> = {}): Promise<T> {
  const flat: Record<string, string | number | undefined> = { action, json: '1' };
  Object.entries(params).forEach(([key, value]) => {
    flat[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
  const response = await fetch(edisemHelperAjaxUrl('UserSpace', flat), { credentials: 'include' });
  const data = await response.json();

  if (data?.code === 401) throw new Error('Non authentifié');
  if (data?.code === 403) throw new Error('Accès refusé');
  if (data?.error) throw new Error(data.error);

  return data as T;
}

// ─── CRUD playlists ────────────────────────────────────────────────────────────

/** Toutes les playlists de l'actant connecté */
export async function getPlaylists(): Promise<Playlist[]> {
  const result = await apiFetch<Playlist[] | { error: string }>('getPlaylists');
  return Array.isArray(result) ? result : [];
}

/** Crée une nouvelle playlist */
export async function createPlaylist(title: string, description = '', visibility: 'private' | 'public' = 'private'): Promise<Playlist> {
  return apiFetch<Playlist>('createPlaylist', { title, description, visibility });
}

/** Met à jour titre, description, visibilité et/ou ordre des items */
export async function updatePlaylist(
  id: number,
  patch: { title?: string; description?: string; visibility?: 'private' | 'public'; items?: PlaylistItemEntry[] },
): Promise<Playlist> {
  const params: Record<string, string | number | object> = { id };
  if (patch.title !== undefined) params.title = patch.title;
  if (patch.description !== undefined) params.description = patch.description;
  if (patch.visibility !== undefined) params.visibility = patch.visibility;
  if (patch.items !== undefined) params.items = JSON.stringify(patch.items);
  return apiFetch<Playlist>('updatePlaylist', params);
}

/** Supprime une playlist */
export async function deletePlaylist(id: number): Promise<void> {
  await apiFetch<{ success: boolean }>('deletePlaylist', { id });
}

/** Ajoute un item à une playlist */
export async function addItemToPlaylist(playlistId: number, resourceId: number): Promise<Playlist> {
  return apiFetch<Playlist>('addItemToPlaylist', { playlistId, resourceId });
}

/** Retire un item d'une playlist */
export async function removeItemFromPlaylist(playlistId: number, resourceId: number): Promise<Playlist> {
  return apiFetch<Playlist>('removeItemFromPlaylist', { playlistId, resourceId });
}

/** Récupère une playlist par son ID (publique sans auth, privée si propriétaire connecté) */
export async function fetchPlaylistById(id: number): Promise<Playlist | null> {
  try {
    const result = await fetchPlaylistItemCards(id);
    return result?.playlist ?? null;
  } catch {
    return null;
  }
}

// ─── Items enrichis ───────────────────────────────────────────────────────────

export interface PlaylistItemsResult {
  playlist: Playlist;
  items: PlaylistCard[];
}

/** Charge les cards enrichies des items d'une playlist via le backend */
export async function fetchPlaylistItemCards(playlistOrId: Playlist | number): Promise<PlaylistItemsResult | null> {
  const playlistId = typeof playlistOrId === 'number' ? playlistOrId : playlistOrId.id;
  try {
    const result = await apiFetch<PlaylistItemsResult | { error: string }>('getPlaylistItems', { playlistId });
    if ('error' in result) return null;
    return result;
  } catch {
    // Fallback : playlist publique via getSharedPlaylist
    try {
      const shared = await apiFetch<PlaylistItemsResult | { error: string }>('getSharedPlaylist', { id: playlistId });
      if ('error' in shared) return null;
      return shared;
    } catch {
      return null;
    }
  }
}

/** Miniatures des premiers items pour la mosaïque (ordre playlist, max 4) */
export async function fetchPlaylistPreviewThumbnails(playlist: Playlist, limit = 4): Promise<(string | null)[]> {
  const itemIds = playlist.items.slice(0, limit).map((i) => i.id);
  if (itemIds.length === 0) return [];

  const resolveThumb = (card: PlaylistCard | undefined): string | null => {
    const thumb = card?.thumbnail;
    return thumb && !isOmekaPlaceholderThumbnail(thumb) ? thumb : null;
  };

  try {
    const result = await fetchPlaylistItemCards(playlist.id);
    if (result?.items?.length) {
      const cardMap = new Map(result.items.map((c) => [Number(c.id), c]));
      return itemIds.map((id) => resolveThumb(cardMap.get(id)));
    }
  } catch {
    // fallback Omeka direct ci-dessous
  }

  return Promise.all(
    itemIds.map(async (id) => {
      try {
        const res = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${id}`));
        if (!res.ok) return null;
        const thumb = extractThumbnail(await res.json());
        return thumb && !isOmekaPlaceholderThumbnail(thumb) ? thumb : null;
      } catch {
        return null;
      }
    }),
  );
}

// ─── Fallback fetch direct Omeka (si le backend n'est pas disponible) ─────────

function extractThumbnail(item: Record<string, any>): string | null {
  const d = item['thumbnail_display_urls'];
  const fromDisplay = d?.square || d?.medium || d?.large;
  if (fromDisplay && !isOmekaPlaceholderThumbnail(fromDisplay)) return fromDisplay;

  const MEDIA_PROPS = ['schema:url', 'dcterms:identifier', 'bibo:uri', 'schema:contentUrl', 'schema:embedUrl'];
  for (const prop of MEDIA_PROPS) {
    const vals = item[prop];
    if (!Array.isArray(vals)) continue;
    for (const v of vals) {
      const url = v?.['@id'] || v?.['@value'] || v?.url;
      if (typeof url !== 'string') continue;
      const yt = getYouTubeThumbnail(url);
      if (yt) return yt;
      if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) return url;
    }
  }
  return null;
}

function mapOmekaToCard(raw: Record<string, any>): PlaylistCard {
  const templateId = raw['o:resource_template']?.['o:id'];
  const type =
    resolveResourceTypeFromOmekaItem(raw) ??
    (templateId ? TEMPLATE_ID_TO_TYPE[Number(templateId)] : undefined);

  const actants: PlaylistCard['actants'] = [];
  for (const prop of ['dcterms:creator', 'schema:contributor']) {
    const vals = raw[prop];
    if (!Array.isArray(vals)) continue;
    for (const v of vals) {
      if (v?.type !== 'resource') continue;
      actants.push({ title: v.display_title || '', name: v.display_title || '', picture: v.thumbnail_url || null });
    }
  }

  let date: string | null = null;
  for (const prop of ['dcterms:issued', 'dcterms:date', 'schema:eventDate']) {
    const val = raw[prop]?.[0]?.['@value'];
    if (typeof val === 'string' && val.trim()) { date = val.trim(); break; }
  }

  return {
    id: raw['o:id'],
    title: raw['o:title'] || 'Sans titre',
    thumbnail: extractThumbnail(raw),
    type: type as string | undefined,
    actants,
    date,
  };
}

/** Fallback si getPlaylistItems échoue : fetch direct Omeka item par item */
export async function fetchPlaylistItemCardsDirect(playlist: Playlist): Promise<PlaylistCard[]> {
  if (playlist.items.length === 0) return [];

  const CONCURRENCY = 5;
  const results: PlaylistCard[] = [];
  const ordered = playlist.items;

  for (let i = 0; i < ordered.length; i += CONCURRENCY) {
    const batch = ordered.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(
      batch.map(async (entry) => {
        try {
          const res = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${entry.id}`));
          if (!res.ok) return null;
          return mapOmekaToCard(await res.json());
        } catch {
          return null;
        }
      }),
    );
    results.push(...fetched.filter((c): c is PlaylistCard => c !== null));
  }

  const byId = new Map(results.map((c) => [c.id, c]));
  return ordered.map((e) => byId.get(e.id)).filter((c): c is PlaylistCard => c != null);
}
