import { getResourceUrl, isFormOnlyResourceType } from '@/config/resourceConfig';
import { formatFlexibleDateDisplay } from '@/lib/flexibleDate';

export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

/** Extrait l'URL externe depuis une réponse Omeka brute */
export function extractExternalUrlFromOmekaItem(data: any): string | null {
  const candidates = [
    data?.['bibo:uri']?.[0]?.['@id'],
    data?.['foaf:page']?.[0]?.['@id'],
    data?.['schema:url']?.[0]?.['@id'],
  ];
  for (const candidate of candidates) {
    if (isHttpUrl(candidate)) return candidate;
  }
  return null;
}

/** URL externe d'une ressource formOnly (pas de page vue interne) */
export function getFormOnlyExternalUrl(resource: any): string | null {
  if (!resource) return null;

  const fromRaw = extractExternalUrlFromOmekaItem(resource);
  if (fromRaw) return fromRaw;

  const candidates = [resource.url, resource.uri, resource.website, resource.page, resource.externalLink];
  for (const candidate of candidates) {
    if (isHttpUrl(candidate)) return candidate;
  }
  return null;
}

/** URL à utiliser dans le cache ressource : externe si formOnly, sinon route interne */
export function buildCachedResourceUrl(resourceType: string, resourceId: number, resourceData: any): string | undefined {
  const external = extractExternalUrlFromOmekaItem(resourceData);
  if (external) return external;
  if (isFormOnlyResourceType(resourceType)) return undefined;
  const internal = getResourceUrl(resourceType, resourceId);
  return internal !== '#' ? internal : undefined;
}

/** Lien de navigation depuis une carte ou un chip : null si aucune action */
export function getResourceLinkHref(item: any): string | null {
  if (!item?.type || item.id == null) return null;

  if (isFormOnlyResourceType(item.type)) {
    return getFormOnlyExternalUrl(item);
  }

  const internal = getResourceUrl(item.type, item.id);
  return internal && internal !== '#' ? internal : null;
}

/** Ouvre le lien externe ou navigue en interne. Retourne false si aucune action. */
export function navigateToResource(item: any, navigate: (url: string) => void): boolean {
  const href = getResourceLinkHref(item);
  if (!href) return false;
  if (isHttpUrl(href)) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return true;
  }
  navigate(href);
  return true;
}

/**
 * Extract authors from a resource item.
 * Handles TWO types of data:
 * 1. Actant-based (Conferences/Experimentations): firstname + lastname + universities
 * 2. Creator-based (All Recits): name (display_title)
 * 
 * Supports 'actants', 'personne', 'actant' keys.
 */
export const getResourceAuthors = (item: any) => {
    const people = item.actants || item.personne || item.personnes || item.actant || [];
    if (!Array.isArray(people)) return [];

    return people
        .map((p: any) => {
            // Try to construct full name from firstname/lastname (Actants)
            const fullName = `${p.firstname || p.firstName || ''} ${p.lastname || p.lastName || ''}`.trim();

            // Fallback to name field (Creators - display_title)
            const name = fullName || p.name || p.title || '';

            if (!name) return null;

            return {
                name,
                picture: p.picture,
            };
        })
        .filter((a: any) => a !== null) as { name: string; picture?: string }[];
};

/**
 * Extract subtitle from a resource item.
 * - Actant-based resources (Conferences/Experimentations): universities
 * - Creator-based resources (Recits): formatted date
 */
export const getResourceSubtitle = (item: any) => {
    // For recits, use formatted date as subtitle
    if (item.type?.startsWith('recit_')) {
        return getRecitDateLine(item);
    }

    // For other resources, use universities
    const people = item.actants || item.personne || item.personnes || item.actant || [];
    if (!Array.isArray(people) || people.length === 0) return undefined;

    const universities = people
        .flatMap((person: any) => {
            const univs = person?.universite || person?.universities || person?.affiliations || [];
            return Array.isArray(univs) ? univs : [];
        })
        .filter(Boolean);

    if (universities.length === 0) return undefined;

    // Get unique university shortNames
    const uniqueUnivs = Array.from(
        new Set(
            universities.map((u: any) => {
                if (typeof u === 'string') return u;
                return u.shortName || u.name || 'Université';
            })
        )
    );

    return uniqueUnivs.join(' - ');
};

/**
 * Get standardized resource URL for navigation.
 * formOnly → URL externe uniquement ; sinon route interne.
 */
export const getSafeResourceUrl = (item: any): string => {
  return getResourceLinkHref(item) ?? '#';
};

/**
 * Miniature générique Omeka S (pas une vraie couverture)
 */
export const isOmekaPlaceholderThumbnail = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return true;
  const normalized = url.toLowerCase();
  return (
    normalized.includes('/application/asset/thumbnails/image.png') ||
    normalized.endsWith('/thumbnails/image.png') ||
    normalized.includes('/thumbnails/image.gif')
  );
};

/**
 * Convertit un chemin Omeka (URL absolue, chemin /files/… ou nom de fichier) en URL affichable.
 * Préfixe /omk/ pour les chemins relatifs (same-origin, fonctionne en dev et prod).
 */
export function resolveOmekaPublicUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/omk/')) return trimmed;

  if (trimmed.startsWith('/')) {
    return `/omk${trimmed}`;
  }

  if (trimmed.startsWith('files/')) {
    return `/omk/${trimmed}`;
  }

  return `/omk/files/${trimmed}`;
}

export function resolveOmekaThumbnail(url: string | null | undefined): string | null {
  const resolved = resolveOmekaPublicUrl(url);
  if (!resolved || isOmekaPlaceholderThumbnail(resolved)) return null;
  return resolved;
}

/**
 * Extract thumbnail from resource item.
 * Supports direct property or YouTube URL derivation.
 */
export const getResourceThumbnail = (item: any): string => {
    // 0. Omeka S thumbnail_display_urls (réponse API liste ou détail)
    const displayUrls = item['thumbnail_display_urls'];
    if (displayUrls) {
        const raw = displayUrls.square || displayUrls.medium || displayUrls.large;
        const resolved = resolveOmekaThumbnail(typeof raw === 'string' ? raw : null);
        if (resolved) return resolved;
    }

    // 1. Direct string properties
    const directThumb = resolveOmekaThumbnail(
        typeof item.thumbnail === 'string' ? item.thumbnail : null,
    );
    if (directThumb) return directThumb;

    const imageThumb = resolveOmekaThumbnail(typeof item.image === 'string' ? item.image : null);
    if (imageThumb) return imageThumb;

    const pictureThumb = resolveOmekaThumbnail(typeof item.picture === 'string' ? item.picture : null);
    if (pictureThumb) return pictureThumb;

    // 2. Check for YouTube URL (for recits)
    const urlCandidates = [
        item.url,
        item.fullUrl,
        item.externalLink,
        item['schema:url']?.[0]?.['@id'],
    ];
    for (const candidate of urlCandidates) {
        const ytThumb = getYouTubeThumbnail(candidate);
        if (ytThumb) return ytThumb;
    }

    // 3. Object properties (thumbnail.url or thumbnail.thumbnail)
    if (item.thumbnail && typeof item.thumbnail === 'object') {
        const ytThumbFromObject = getYouTubeThumbnail(item.thumbnail.url);
        if (ytThumbFromObject) return ytThumbFromObject;
        if (item.thumbnail.thumbnail) {
            const resolved = resolveOmekaThumbnail(item.thumbnail.thumbnail);
            if (resolved) return resolved;
        }
        if (item.thumbnail.url) {
            const resolved = resolveOmekaThumbnail(item.thumbnail.url);
            if (resolved) return resolved;
        }
    }

    // 4. Array properties (take first element)
    if (Array.isArray(item.thumbnail) && item.thumbnail.length > 0) {
        const first = typeof item.thumbnail[0] === 'string' ? item.thumbnail[0] : item.thumbnail[0]?.url || '';
        const resolved = resolveOmekaThumbnail(first);
        if (resolved) return resolved;
    }

    // 5. Associated Media
    if (item.associatedMedia?.[0]?.thumbnail) {
        const resolved = resolveOmekaThumbnail(item.associatedMedia[0].thumbnail);
        if (resolved) return resolved;
    }

    return '';
};

/**
 * Extract YouTube thumbnail from URL.
 * Returns high quality thumbnail or undefined if not a YouTube URL.
 */
export const getYouTubeThumbnail = (url: string | string[]): string | undefined => {
    const finalUrl = Array.isArray(url) ? url[0] : url;
    if (!finalUrl || typeof finalUrl !== 'string') return undefined;

    // Match youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID
    const match = finalUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (!match || !match[1]) return undefined;

    return `https://img.youtube.com/vi/${match[1]}/0.jpg`;
};

/**
 * Format date line for recits with appropriate prefix.
 * - recit_citoyen: "Fondé : [date]"
 * - Other recits: "Publié : [date]"
 */
export const formatResourceDisplayDate = (raw: string): string => {
  const formatted = formatFlexibleDateDisplay(raw);
  if (formatted) return formatted;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const getRecitDateLine = (item: any): string | undefined => {
    const raw = item.dateIssued || item.date || item.created;
    if (!raw) return undefined;
    const formatted = formatResourceDisplayDate(String(raw));
    if (item.type === 'recit_citoyen') return `Fondé : ${formatted}`;
    return `Publié : ${formatted}`;
};