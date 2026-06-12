/** Auth API Omeka S — requise en dev local (le proxy Vite ne transmet pas les cookies de session) */
const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

export const OMEKA_API_BASE = '/omk/api/';

export function hasOmekaApiKey(): boolean {
  return Boolean(API_KEY);
}

export function getOmekaApiAuthQuery(): string {
  if (!API_KEY) return '';
  return `key_identity=${encodeURIComponent(API_IDENT)}&key_credential=${encodeURIComponent(API_KEY)}`;
}

/** Ajoute les paramètres d'auth à une URL API Omeka si la clé est définie */
export function omekaApiUrl(path: string): string {
  const auth = getOmekaApiAuthQuery();
  if (!auth) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${auth}`;
}

export function omekaAuthErrorMessage(status: number): string | null {
  if (status === 403 && !API_KEY) {
    return "Accès refusé (403). Ajoutez VITE_API_KEY dans votre fichier .env à la racine du projet, puis redémarrez le serveur de dev.";
  }
  return null;
}
