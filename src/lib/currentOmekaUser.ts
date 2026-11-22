import type { UserData } from '@/hooks/useAuth';
import { hasOmekaApiKey } from '@/utils/omekaApi';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readStoredUser(): UserData | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserData) : null;
  } catch {
    return null;
  }
}

/** ID utilisateur Omeka S (`o:owner`) du compte connecté — pas l'item actant. */
export function getCurrentOmekaUserId(userData?: UserData | null): number | null {
  const candidates: unknown[] = [
    userData?.omekaUserId,
    readStoredUser()?.omekaUserId,
  ];

  const rawLs = localStorage.getItem('omekaUserId');
  if (rawLs) candidates.push(parseInt(rawLs, 10));

  const token = localStorage.getItem('token');
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload?.sub != null) candidates.push(payload.sub);
  }

  for (const raw of candidates) {
    const id = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(id) && id > 0) return id;
  }

  return null;
}

export function getOmekaOwnerPayload(userData?: UserData | null): { 'o:id': number } | undefined {
  const id = getCurrentOmekaUserId(userData);
  return id != null ? { 'o:id': id } : undefined;
}

/** Aligne la clé `omekaUserId` sur l'objet `user` / le JWT (sessions anciennes). */
export function syncOmekaUserIdStorage(): void {
  const id = getCurrentOmekaUserId();
  if (id != null) {
    localStorage.setItem('omekaUserId', String(id));
  }
}

export const OMEKA_OWNER_REQUIRED_MESSAGE =
  'Impossible de déterminer votre compte Omeka. Déconnectez-vous, reconnectez-vous, puis réessayez.';

/** Owner obligatoire à la création quand l'appels REST utilisent la clé API (sinon owner = compte API). */
export function requireOmekaOwnerForCreate(userData?: UserData | null): { 'o:id': number } {
  const owner = getOmekaOwnerPayload(userData);
  if (owner) return owner;
  if (hasOmekaApiKey()) {
    throw new Error(OMEKA_OWNER_REQUIRED_MESSAGE);
  }
  throw new Error(OMEKA_OWNER_REQUIRED_MESSAGE);
}