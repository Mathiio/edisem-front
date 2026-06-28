/**
 * API administration globale (global_admin) — GlobalAdminViewHelper backend.
 */

import type { StudentResourceCard } from '@/services/UserSpace';

const EDISEM_AJAX_BASE =
  import.meta.env.VITE_EDISEM_AJAX_BASE ??
  (import.meta.env.DEV ? 'https://tests.arcanes.ca/omk/s/edisem/page/ajax' : '/omk/s/edisem/page/ajax');

export interface OmekaOwnerOption {
  id: number;
  name: string;
  email: string;
}

export interface GlobalAdminCatalogResponse {
  success: boolean;
  items: AdminResourceCard[];
  total: number;
  limit: number;
  error?: string;
  code?: number;
}

export interface AdminResourceCard extends StudentResourceCard {
  owner_id?: number | null;
  owner_name?: string | null;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchGlobalAdmin<T>(action: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const searchParams = new URLSearchParams({
    helper: 'GlobalAdmin',
    action,
    json: '1',
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`${EDISEM_AJAX_BASE}?${searchParams.toString()}`, {
    credentials: 'include',
    headers: authHeaders(),
  });

  const data = await response.json();

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Erreur lors de la requête administration');
  }

  return data as T;
}

export async function fetchGlobalAdminRecent(): Promise<AdminResourceCard[]> {
  const data = await fetchGlobalAdmin<{ items: AdminResourceCard[] }>('listRecent');
  return data.items ?? [];
}

export async function fetchGlobalAdminCatalog(options: {
  q?: string;
  ownerId?: number;
  templateId?: number;
  sort?: 'asc' | 'desc';
}): Promise<GlobalAdminCatalogResponse> {
  return fetchGlobalAdmin<GlobalAdminCatalogResponse>('listResources', {
    q: options.q,
    owner_id: options.ownerId,
    template_id: options.templateId,
    sort: options.sort,
  });
}

export async function fetchGlobalAdminOwners(): Promise<OmekaOwnerOption[]> {
  const data = await fetchGlobalAdmin<{ owners: OmekaOwnerOption[] }>('listOwners');
  return data.owners ?? [];
}
