/**
 * Hook de gestion du chat IA Corpus.
 * Gère : liste des conversations, conversation active, envoi de messages,
 * état de chargement, et quota utilisateur.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  type Conversation,
  type ChatMessage,
  type ChatContextType,
  type QuotaInfo,
  sendChatMessage,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
  getUsageStats,
  type UsageStats,
} from '@/services/CorpusChat';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

export interface CorpusChatState {
  /** Liste des conversations de l'utilisateur */
  conversations: Conversation[];
  /** ID de la conversation active */
  activeConversationId: number | null;
  /** Messages de la conversation active */
  messages: ChatMessage[];
  /** Envoi en cours */
  isSending: boolean;
  /** Chargement de la liste des conversations */
  isLoadingConversations: boolean;
  /** Chargement des messages de la conversation active */
  isLoadingMessages: boolean;
  /** Erreur éventuelle (reset à chaque action) */
  error: string | null;
  /** Quota journalier de l'utilisateur */
  quota: QuotaInfo | null;
  /** Stats détaillées (jour + mois) */
  usageStats: UsageStats | null;
  /** Index du message assistant à animer (réponse fraîche) */
  streamMessageIndex: number | null;
}

/** Pastille modèle pour les messages rechargés (API ne renvoie modelLabel que si dérivé côté serveur). */
function modelLabelFromStoredModel(model: string, role: ChatMessage['role']): string | undefined {
  if (role !== 'assistant' || !model) {
    return undefined;
  }
  const m = model.toLowerCase();
  if (m.includes('sonnet')) {
    return 'sonnet+thinking';
  }
  if (m.includes('haiku')) {
    return 'haiku';
  }
  return undefined;
}

function normalizeLoadedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((msg) =>
    msg.role === 'assistant' && !msg.modelLabel && msg.model
      ? { ...msg, modelLabel: modelLabelFromStoredModel(msg.model, msg.role) }
      : msg,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_CONVERSATIONS_START' }
  | { type: 'LOAD_CONVERSATIONS_OK'; conversations: Conversation[] | undefined }
  | { type: 'LOAD_MESSAGES_START'; conversationId: number }
  | { type: 'LOAD_MESSAGES_OK'; conversationId: number; messages: ChatMessage[] }
  /** Ajoute immédiatement le message utilisateur avant la réponse API */
  | { type: 'SEND_START'; userMessage: ChatMessage }
  /** Ajoute le message assistant une fois la réponse reçue */
  | { type: 'SEND_OK'; conversationId: number; assistantMessage: ChatMessage; quota: QuotaInfo | null }
  | { type: 'SEND_ERROR'; error: string }
  | { type: 'DELETE_CONV'; conversationId: number }
  | { type: 'UPDATE_TITLE'; conversationId: number; title: string }
  | { type: 'SET_ACTIVE'; conversationId: number | null }
  | { type: 'SET_USAGE_STATS'; stats: UsageStats }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'NEW_CONVERSATION' }
  | { type: 'STREAM_ANIMATION_DONE' };

const initial: CorpusChatState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  isSending: false,
  isLoadingConversations: true, // premier fetch au mount → skeleton sidebar tant que liste vide
  isLoadingMessages: false,
  error: null,
  quota: null,
  usageStats: null,
  streamMessageIndex: null,
};

function reducer(state: CorpusChatState, action: Action): CorpusChatState {
  switch (action.type) {
    case 'LOAD_CONVERSATIONS_START':
      return { ...state, isLoadingConversations: true, error: null };

    case 'LOAD_CONVERSATIONS_OK':
      return { ...state, isLoadingConversations: false, conversations: action.conversations ?? [] };

    case 'LOAD_MESSAGES_START':
      return {
        ...state,
        isLoadingMessages: true,
        error: null,
        activeConversationId: action.conversationId,
        messages: [],
        streamMessageIndex: null,
      };

    case 'LOAD_MESSAGES_OK':
      return {
        ...state,
        isLoadingMessages: false,
        activeConversationId: action.conversationId,
        messages: action.messages,
        streamMessageIndex: null,
      };

    case 'SEND_START':
      // Affichage optimiste : le message user apparaît immédiatement
      return {
        ...state,
        isSending: true,
        error: null,
        messages: [...state.messages, action.userMessage],
      };

    case 'SEND_OK': {
      // Mettre à jour la liste : déplacer la conversation en tête + màj compteur
      const updatedConvs = (state.conversations ?? [])
        .map((c) =>
          c.id === action.conversationId
            ? { ...c, messageCount: c.messageCount + 2, updatedAt: new Date().toISOString() }
            : c,
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const messages = [...state.messages, action.assistantMessage];
      return {
        ...state,
        isSending: false,
        activeConversationId: action.conversationId,
        messages,
        conversations: updatedConvs,
        quota: action.quota,
        streamMessageIndex: messages.length - 1,
      };
    }

    case 'SEND_ERROR':
      // Retire le dernier message user (ajouté optimistiquement) en cas d'erreur
      return {
        ...state,
        isSending: false,
        error: action.error,
        messages: state.messages.slice(0, -1),
        streamMessageIndex: null,
      };

    case 'DELETE_CONV': {
      const filtered = (state.conversations ?? []).filter((c) => c.id !== action.conversationId);
      const newActive =
        state.activeConversationId === action.conversationId
          ? (filtered[0]?.id ?? null)
          : state.activeConversationId;
      return {
        ...state,
        conversations: filtered,
        activeConversationId: newActive,
        messages: state.activeConversationId === action.conversationId ? [] : state.messages,
      };
    }

    case 'UPDATE_TITLE':
      return {
        ...state,
        conversations: (state.conversations ?? []).map((c) =>
          c.id === action.conversationId ? { ...c, title: action.title } : c,
        ),
      };

    case 'SET_ACTIVE':
      return { ...state, activeConversationId: action.conversationId };

    case 'SET_USAGE_STATS':
      return { ...state, usageStats: action.stats, quota: action.stats.period };

    case 'SET_ERROR':
      return { ...state, error: action.error, isSending: false, isLoadingMessages: false };

    case 'NEW_CONVERSATION':
      return {
        ...state,
        activeConversationId: null,
        messages: [],
        error: null,
        streamMessageIndex: null,
      };

    case 'STREAM_ANIMATION_DONE':
      return { ...state, streamMessageIndex: null };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCorpusChat() {
  const [state, dispatch] = useReducer(reducer, initial);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Chargement des conversations ───────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    dispatch({ type: 'LOAD_CONVERSATIONS_START' });
    try {
      const res = await listConversations();
      if (!mountedRef.current) return;
      dispatch({ type: 'LOAD_CONVERSATIONS_OK', conversations: res?.conversations ?? [] });
    } catch (err) {
      if (!mountedRef.current) return;
      dispatch({ type: 'LOAD_CONVERSATIONS_OK', conversations: [] });
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
    }
  }, []);

  // ── Chargement des messages d'une conversation ────────────────────────────

  const openConversation = useCallback(async (conversationId: number) => {
    dispatch({ type: 'LOAD_MESSAGES_START', conversationId });
    try {
      const { messages } = await getConversation(conversationId);
      if (!mountedRef.current) return;
      dispatch({
        type: 'LOAD_MESSAGES_OK',
        conversationId,
        messages: normalizeLoadedMessages(messages ?? []),
      });
    } catch (err) {
      if (!mountedRef.current) return;
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
    }
  }, []);

  // ── Nouvelle conversation (local, pas encore persistée) ───────────────────

  const newConversation = useCallback(() => {
    dispatch({ type: 'NEW_CONVERSATION' });
  }, []);

  const clearStreamAnimation = useCallback(() => {
    dispatch({ type: 'STREAM_ANIMATION_DONE' });
  }, []);

  // ── Envoi d'un message ────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (params: {
      message: string;
      contextType?: ChatContextType;
      contextItemId?: number | null;
    }) => {
      const now = new Date().toISOString();

      // Affichage optimiste : on ajoute le message user immédiatement
      const optimisticUserMsg: ChatMessage = {
        role: 'user',
        content: params.message,
        tokensInput: 0,
        tokensOutput: 0,
        model: '',
        createdAt: now,
      };
      dispatch({ type: 'SEND_START', userMessage: optimisticUserMsg });

      try {
        const res = await sendChatMessage({
          conversationId: state.activeConversationId,
          message: params.message,
          contextType: params.contextType ?? 'general',
          contextItemId: params.contextItemId ?? null,
        });

        if (!mountedRef.current) return;

        // Réponse vide inattendue (le PHP devrait déjà retourner une erreur dans ce cas)
        if (!res.reply?.trim()) {
          dispatch({ type: 'SEND_ERROR', error: 'L\'IA n\'a pas généré de réponse. Reformulez votre question ou réessayez.' });
          return;
        }

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: res.reply,
          tokensInput: res.tokens?.input ?? 0,
          tokensOutput: res.tokens?.output ?? 0,
          model: res.model ?? 'claude-haiku-5-5',
          modelLabel: res.modelLabel,
          createdAt: new Date().toISOString(),
        };

        dispatch({
          type: 'SEND_OK',
          conversationId: res.conversationId,
          assistantMessage: assistantMsg,
          quota: res.quota ?? null,
        });

        // Si nouvelle conversation, recharger la liste en arrière-plan
        if (!state.activeConversationId) {
          listConversations().then(({ conversations }) => {
            if (!mountedRef.current) return;
            dispatch({ type: 'LOAD_CONVERSATIONS_OK', conversations });
          });
        }
      } catch (err) {
        if (!mountedRef.current) return;
        // Retire le message optimiste en cas d'erreur
        dispatch({ type: 'SEND_ERROR', error: (err as Error).message });
      }
    },
    [state.activeConversationId],
  );

  // ── Suppression ───────────────────────────────────────────────────────────

  const removeConversation = useCallback(async (conversationId: number) => {
    try {
      await deleteConversation(conversationId);
      if (!mountedRef.current) return;
      dispatch({ type: 'DELETE_CONV', conversationId });
    } catch (err) {
      if (!mountedRef.current) return;
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
    }
  }, []);

  // ── Renommage ─────────────────────────────────────────────────────────────

  const renameConversation = useCallback(async (conversationId: number, title: string) => {
    try {
      const res = await updateConversationTitle(conversationId, title);
      if (!mountedRef.current) return;
      dispatch({ type: 'UPDATE_TITLE', conversationId, title: res.title });
    } catch (err) {
      if (!mountedRef.current) return;
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
    }
  }, []);

  // ── Statistiques d'usage ─────────────────────────────────────────────────

  const loadUsageStats = useCallback(async () => {
    try {
      const stats = await getUsageStats();
      if (!mountedRef.current) return;
      dispatch({ type: 'SET_USAGE_STATS', stats });
    } catch {
      // Non bloquant
    }
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadConversations();
    loadUsageStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    /** Conversation active (objet complet depuis la liste) */
    activeConversation: (state.conversations ?? []).find((c) => c.id === state.activeConversationId) ?? null,
    // Actions
    loadConversations,
    openConversation,
    newConversation,
    sendMessage,
    removeConversation,
    renameConversation,
    loadUsageStats,
    clearStreamAnimation,
  };
}
