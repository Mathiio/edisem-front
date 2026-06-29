import { getActantsForLogin, type Actant } from '@/services/UserSpace';
import { getResourceOwnerId } from '@/lib/resourceEditHelpers';

export type ResourceOwnerInfo = {
  omekaUserId: number;
  displayName: string;
  actantId?: number;
  email?: string;
};

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=UserSpace';

let actantsList: Actant[] | null = null;
let actantsLoadPromise: Promise<Actant[]> | null = null;
const resolvedOwnerCache = new Map<number, ResourceOwnerInfo | null>();

async function loadActantsList(): Promise<Actant[]> {
  if (actantsList) return actantsList;
  if (actantsLoadPromise) return actantsLoadPromise;

  actantsLoadPromise = getActantsForLogin()
    .then((actants) => {
      actantsList = actants;
      return actants;
    })
    .catch((error) => {
      console.warn('[resourceOwner] Impossible de charger les actants', error);
      actantsList = [];
      return actantsList;
    })
    .finally(() => {
      actantsLoadPromise = null;
    });

  return actantsLoadPromise;
}

export function formatActantDisplayName(actant: Actant): string {
  const fullName = `${actant.firstname || ''} ${actant.lastname || ''}`.trim();
  return fullName || actant.title || actant.omekaUserName || '';
}

function actantToOwnerInfo(actant: Actant, omekaUserId: number): ResourceOwnerInfo | null {
  const displayName = formatActantDisplayName(actant);
  if (!displayName) return null;
  return {
    omekaUserId,
    displayName,
    actantId: actant.id,
    email: actant.mail || undefined,
  };
}

/** Fallback client : évite de prendre un actant arbitraire quand plusieurs partagent le même omekaUserId */
async function resolveResourceOwnerFallback(omekaUserId: number): Promise<ResourceOwnerInfo | null> {
  const actants = await loadActantsList();
  const linked = actants.filter((actant) => actant.omekaUserId === omekaUserId);
  if (linked.length === 0) return null;

  const emailLinked = linked.filter((actant) => actant.mail?.trim());
  if (emailLinked.length === 1) {
    return actantToOwnerInfo(emailLinked[0], omekaUserId);
  }

  const omekaUserName = linked.find((actant) => actant.omekaUserName)?.omekaUserName?.trim();
  if (omekaUserName) {
    return { omekaUserId, displayName: omekaUserName };
  }

  return null;
}

async function resolveResourceOwnerFromApi(omekaUserId: number): Promise<ResourceOwnerInfo | null> {
  try {
    const response = await fetch(
      `${API_BASE}&action=resolveResourceOwner&ownerId=${omekaUserId}&json=1`,
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.error || !data.displayName) return null;

    return {
      omekaUserId: data.omekaUserId ?? omekaUserId,
      displayName: String(data.displayName),
      actantId: data.actantId != null ? Number(data.actantId) : undefined,
      email: data.email || undefined,
    };
  } catch {
    return null;
  }
}

/** Résout le créateur (o:owner) via l'API backend (email utilisateur → actant) */
export async function resolveResourceOwner(
  omekaUserId: number,
  _ownerBlock?: unknown,
): Promise<ResourceOwnerInfo | null> {
  if (!Number.isFinite(omekaUserId)) return null;

  if (resolvedOwnerCache.has(omekaUserId)) {
    return resolvedOwnerCache.get(omekaUserId) ?? null;
  }

  const fromApi = await resolveResourceOwnerFromApi(omekaUserId);
  const owner = fromApi ?? (await resolveResourceOwnerFallback(omekaUserId));

  resolvedOwnerCache.set(omekaUserId, owner);
  return owner;
}

/** Enrichit itemDetails avec resourceOwner à partir de o:owner */
export async function enrichItemWithResourceOwner(enrichedData: any): Promise<void> {
  const ownerId = getResourceOwnerId(enrichedData);
  if (ownerId == null) return;

  enrichedData.ownerId = ownerId;
  const owner = await resolveResourceOwner(ownerId, enrichedData['o:owner']);
  if (owner) enrichedData.resourceOwner = owner;
}
