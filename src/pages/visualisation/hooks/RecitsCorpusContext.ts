import { createContext, useContext } from 'react';

import type { ProximityLink, RecitNode } from './useRecitsData';

export interface RecitsCorpusContextValue {
  nodes: RecitNode[];
  baseLinks: ProximityLink[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const RecitsCorpusContext = createContext<RecitsCorpusContextValue | null>(null);

export function useRecitsCorpus(): RecitsCorpusContextValue {
  const ctx = useContext(RecitsCorpusContext);
  if (!ctx) {
    throw new Error('useRecitsCorpus doit être utilisé dans RecitsCorpusProvider');
  }
  return ctx;
}

export function useRecitsCorpusOptional(): RecitsCorpusContextValue | null {
  return useContext(RecitsCorpusContext);
}
