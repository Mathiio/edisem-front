/**
 * Service CorpusChat — appels vers CorpusChatViewHelper (backend PHP).
 *
 * Sécurité :
 * - Auth via cookie HttpOnly (edisem_auth) automatiquement inclus par le navigateur.
 * - Accès réservé aux global_admin (vérifié côté serveur).
 * - Lecture seule : aucun endpoint ne modifie les données Omeka.
 */

import { edisemHelperAjaxUrl, parseLooseJsonText } from '@/utils/omekaApi';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ChatContextType = 'general' | 'item' | 'corpus';

export interface QuotaInfo {
  periodDays?: number;  // fenêtre glissante (ex. 7)
  messagesUsed: number;
  messagesLimit: number;
  tokensUsed: number;
  tokensLimit: number;
  messagesLeft: number;
  tokensLeft: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
  modelLabel?: string;  // 'haiku' | 'sonnet+thinking' — uniquement sur les nouveaux messages
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  contextType: ChatContextType;
  contextItemId: number | null;
  itemTitle?: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  conversationId: number;
  reply: string;
  model: string;
  modelLabel: string;  // 'haiku' | 'sonnet+thinking'
  tokens: { input: number; output: number };
  quota: QuotaInfo;
}

export interface UsageStats {
  period: QuotaInfo;  // fenêtre glissante (7 jours)
  month: { messages: number; tokensInput: number; tokensOutput: number };
}

export interface EmbeddingStats {
  indexed: number;
  indexedWithCurrentModel?: number;
  totalRecits: number;
  indexModel: string;
  queryModel: string;
  /** Alias serveur = indexModel */
  model: string;
  needsReindex?: boolean;
  requiresIndexSync?: boolean;
  indexSyncComplete?: boolean;
  voyageTokensTotal?: number;
  voyageConfigured: boolean;
}

export interface IndexCorpusResult {
  success: boolean;
  indexed: number;
  totalCandidates: number;
  model: string;
  errors: string[];
}

interface IndexCorpusChunkResult {
  success: boolean;
  indexed: number;
  processed: number;
  offset: number;
  nextOffset: number | null;
  totalRecits: number;
  totalCandidates: number;
  model: string;
  errors: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────

function chatUrl(params: Record<string, string | number | undefined> = {}): string {
  return edisemHelperAjaxUrl('CorpusChat', { json: '1', ...params });
}

/** Récupère le token JWT depuis localStorage (fallback si cookie bloqué CORS). */
function getBearerToken(): string | null {
  return localStorage.getItem('token');
}

function formatInvalidApiBody(status: number, text: string, cause: unknown): Error {
  const snippet = text.trim().slice(0, 160).replace(/\s+/g, ' ');
  const detail =
    snippet.length > 0
      ? snippet
      : cause instanceof SyntaxError && cause.message === 'Empty JSON response'
        ? 'réponse vide (timeout ou erreur serveur ?)'
        : 'réponse non JSON';
  const err = new Error(`Réponse serveur invalide (HTTP ${status}) : ${detail}`);
  (err as Error & { status?: number }).status = status;
  return err;
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = parseLooseJsonText(text);
  } catch (e) {
    throw formatInvalidApiBody(res.status, text, e);
  }

  if ((data as Record<string, unknown>)?.error) {
    const err = new Error((data as Record<string, unknown>).error as string);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  return data as T;
}

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = getBearerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include', // cookie HttpOnly edisem_auth
    headers,
    body: JSON.stringify(body),
  });

  return readJsonResponse<T>(res);
}

async function getJson<T>(url: string): Promise<T> {
  const token = getBearerToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { credentials: 'include', headers });
  return readJsonResponse<T>(res);
}

// ─────────────────────────────────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envoie un message dans une conversation.
 * @param conversationId  null = nouvelle conversation
 */
export async function sendChatMessage(params: {
  conversationId: number | null;
  message: string;
  contextType?: ChatContextType;
  contextItemId?: number | null;
}): Promise<ChatResponse> {
  const url = chatUrl({ action: 'chat' });
  return postJson<ChatResponse>(url, {
    conversationId: params.conversationId ?? null,
    message: params.message,
    contextType: params.contextType ?? 'general',
    contextItemId: params.contextItemId ?? null,
  });
}

/** Liste toutes les conversations de l'utilisateur courant. */
export async function listConversations(archived = false): Promise<{ conversations: Conversation[] }> {
  const url = chatUrl({ action: 'listConversations', archived: archived ? '1' : '0' });
  return getJson(url);
}

/** Retourne une conversation complète avec tous ses messages. */
export async function getConversation(conversationId: number): Promise<ConversationDetail> {
  const url = chatUrl({ action: 'getConversation', conversationId });
  return getJson(url);
}

/** Archive (soft-delete) une conversation. */
export async function deleteConversation(conversationId: number): Promise<{ success: boolean }> {
  const url = chatUrl({ action: 'deleteConversation' });
  return postJson(url, { conversationId });
}

/** Met à jour le titre d'une conversation. */
export async function updateConversationTitle(
  conversationId: number,
  title: string,
): Promise<{ success: boolean; title: string }> {
  const url = chatUrl({ action: 'updateTitle' });
  return postJson(url, { conversationId, title });
}

/** Retourne les stats d'usage de la journée et du mois. */
export async function getUsageStats(): Promise<UsageStats> {
  const url = chatUrl({ action: 'getUsage' });
  return getJson(url);
}

/** Stats d'indexation sémantique (Voyage RAG). */
export async function getEmbeddingStats(): Promise<EmbeddingStats> {
  const url = chatUrl({ action: 'embeddingStats' });
  return getJson(url);
}

const INDEX_CHUNK_SIZE = 10;

type IndexCorpusChunkResponse = IndexCorpusChunkResult & EmbeddingStats;

/** Une passe d'indexation par paquets (appelé en boucle par syncEmbeddingIndex). */
async function runIndexCorpusChunks(options?: {
  onProgress?: (processed: number, total: number) => void;
}): Promise<IndexCorpusResult> {
  let offset = 0;
  let totalIndexed = 0;
  const allErrors: string[] = [];
  let totalCandidates = 0;
  let model = '';

  for (;;) {
    const url = chatUrl({
      action: 'indexCorpus',
      offset,
      limit: INDEX_CHUNK_SIZE,
    });
    const chunk = await postJson<IndexCorpusChunkResponse>(url, {});

    totalCandidates = chunk.totalRecits ?? chunk.totalCandidates ?? totalCandidates;
    model = chunk.model || model;
    totalIndexed += chunk.indexed ?? 0;
    if (chunk.errors?.length) {
      allErrors.push(...chunk.errors);
    }

    const processed = chunk.nextOffset ?? offset + (chunk.processed ?? INDEX_CHUNK_SIZE);
    options?.onProgress?.(
      Math.min(processed, totalCandidates || processed),
      totalCandidates || processed,
    );

    if (chunk.nextOffset == null) {
      break;
    }
    offset = chunk.nextOffset;
  }

  return {
    success: true,
    indexed: totalIndexed,
    totalCandidates,
    model,
    errors: allErrors,
  };
}

/**
 * Synchronise l'index sémantique si nécessaire (nouveau corpus, changement de modèle, etc.).
 */
export async function syncEmbeddingIndex(options?: {
  onProgress?: (processed: number, total: number) => void;
}): Promise<EmbeddingStats> {
  let stats = await getEmbeddingStats();
  if (!stats.voyageConfigured || !stats.requiresIndexSync) {
    return stats;
  }

  await runIndexCorpusChunks(options);
  stats = await getEmbeddingStats();
  return stats;
}

