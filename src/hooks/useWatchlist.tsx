import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getWatchlistIds, toggleWatchlistItem } from '@/services/UserSpace';

interface WatchlistContextValue {
  ids: Set<number>;
  isSaved: (id: number) => boolean;
  toggle: (id: number) => Promise<boolean>;
  loading: boolean;
  canUseWatchlist: boolean;
  refresh: () => Promise<void>;
}

const defaultValue: WatchlistContextValue = {
  ids: new Set(),
  isSaved: () => false,
  toggle: async () => false,
  loading: false,
  canUseWatchlist: false,
  refresh: async () => {},
};

const WatchlistContext = createContext<WatchlistContextValue>(defaultValue);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userData } = useAuth();
  const canUseWatchlist = isAuthenticated && userData?.type === 'actant';
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!canUseWatchlist) {
      setIds(new Set());
      return;
    }

    setLoading(true);
    try {
      const result = await getWatchlistIds();
      setIds(new Set(result.ids ?? []));
    } catch {
      setIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [canUseWatchlist]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaved = useCallback((id: number) => ids.has(id), [ids]);

  const toggle = useCallback(
    async (id: number) => {
      if (!canUseWatchlist) return false;

      const previous = new Set(ids);
      const optimisticSaved = !previous.has(id);
      const next = new Set(previous);
      if (optimisticSaved) next.add(id);
      else next.delete(id);
      setIds(next);

      try {
        const result = await toggleWatchlistItem(id);
        setIds(new Set(result.ids ?? []));
        return result.saved;
      } catch {
        setIds(previous);
        return previous.has(id);
      }
    },
    [canUseWatchlist, ids],
  );

  const value = useMemo(
    () => ({ ids, isSaved, toggle, loading, canUseWatchlist, refresh }),
    [ids, isSaved, toggle, loading, canUseWatchlist, refresh],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
