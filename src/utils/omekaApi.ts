/**
 * URLs et auth Omeka S — une seule source pour le front (proxy Vite / same-origin en prod).
 * En dev : /omk/api et /omk/s → edisem.arcanes.ca via vite.config.ts.
 */

const API_IDENT =
  (import.meta.env.VITE_OMEKA_KEY_IDENTITY as string | undefined) ??
  'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

/** @deprecated Préférer omekaApiUrl() ; conservé pour imports existants */
export const OMEKA_API_BASE = '/omk/api/';

/** Base des helpers PHP edisem-back (Query, UserSpace, …) */
export const OMEKA_QUERY_AJAX_BASE = '/omk/s/edisem/page/ajax';

/** Identité de clé API Omeka (credential via VITE_API_KEY). À terme : plus de clé dans le bundle. */
export const OMEKA_API_KEY_IDENTITY = API_IDENT;

export function getEdisemAjaxBase(): string {
  return import.meta.env.VITE_EDISEM_AJAX_BASE ?? OMEKA_QUERY_AJAX_BASE;
}

export function hasOmekaApiKey(): boolean {
  return Boolean(API_KEY);
}

export function getOmekaApiAuthQuery(): string {
  if (!API_KEY) return '';
  return `key_identity=${encodeURIComponent(API_IDENT)}&key_credential=${encodeURIComponent(API_KEY)}`;
}

/** Ajoute les paramètres d'auth à une URL API Omeka REST si la clé est définie */
export function omekaApiUrl(path: string): string {
  const auth = getOmekaApiAuthQuery();
  if (!auth) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${auth}`;
}

/** URL ajax edisem (helper Query, UserSpace, …) — chemin relatif, pas d'auth query */
export function omekaQueryAjaxUrl(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `${getEdisemAjaxBase()}?${qs}` : getEdisemAjaxBase();
}

export function edisemHelperAjaxUrl(
  helper: string,
  params: Record<string, string | number | boolean | undefined> = {},
): string {
  return omekaQueryAjaxUrl({ helper, ...params });
}

/** Lien admin Omeka (same-origin quand le front est servi sous /omk) */
export function omekaAdminItemUrl(itemId: number | string): string {
  return `/omk/admin/item/${itemId}`;
}

/** Préfixe un chemin relatif Omeka (/files/…) pour le même site */
export function omekaSiteMediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return path.startsWith('/omk') ? path : `/omk${path}`;
}

export function omekaAuthErrorMessage(status: number): string | null {
  if (status === 403 && !API_KEY) {
    return "Accès refusé (403). Ajoutez VITE_API_KEY dans votre fichier .env à la racine du projet, puis redémarrez le serveur de dev.";
  }
  return null;
}

function extractFirstJsonSubstring(text: string): string {
  const arrayStart = text.indexOf('[');
  const objStart = text.indexOf('{');

  let start: number;
  let open: string;
  let close: string;

  if (arrayStart === -1 && objStart === -1) {
    throw new SyntaxError('No JSON start in response');
  }
  if (arrayStart !== -1 && (objStart === -1 || arrayStart < objStart)) {
    start = arrayStart;
    open = '[';
    close = ']';
  } else {
    start = objStart;
    open = '{';
    close = '}';
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new SyntaxError('Unclosed JSON in response');
}

/**
 * Parse une réponse ajax edisem dont le PHP peut suffixer du bruit (<br />, notices…).
 */
export function parseLooseJsonText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new SyntaxError('Empty JSON response');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonSlice = extractFirstJsonSubstring(trimmed);
    return JSON.parse(jsonSlice);
  }
}

export async function parseFetchJsonLoose(response: Response): Promise<unknown> {
  const text = await response.text();
  return parseLooseJsonText(text);
}
