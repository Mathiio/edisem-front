import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getPlaylists,
  createPlaylist as apiCreate,
  deletePlaylist as apiDelete,
  addItemToPlaylist as apiAdd,
  removeItemFromPlaylist as apiRemove,
  updatePlaylist as apiUpdate,
  type Playlist,
  type PlaylistItemEntry,
} from '@/services/Playlist';

interface PlaylistContextValue {
  playlists: Playlist[];
  /** IDs présents dans au moins une playlist */
  savedIds: Set<number>;
  loading: boolean;
  canUsePlaylists: boolean;
  isInAnyPlaylist: (id: number) => boolean;
  isInPlaylist: (playlistId: number, itemId: number) => boolean;
  addToPlaylist: (playlistId: number, resourceId: number) => Promise<void>;
  removeFromPlaylist: (playlistId: number, resourceId: number) => Promise<void>;
  createPlaylist: (title: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: number) => Promise<void>;
  updatePlaylist: (id: number, patch: Parameters<typeof apiUpdate>[1]) => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultValue: PlaylistContextValue = {
  playlists: [],
  savedIds: new Set(),
  loading: false,
  canUsePlaylists: false,
  isInAnyPlaylist: () => false,
  isInPlaylist: () => false,
  addToPlaylist: async () => {},
  removeFromPlaylist: async () => {},
  createPlaylist: async () => ({ id: 0, title: '', description: '', visibility: 'private', items: [], createdAt: '', modifiedAt: '' }),
  deletePlaylist: async () => {},
  updatePlaylist: async () => {},
  refresh: async () => {},
};

const PlaylistContext = createContext<PlaylistContextValue>(defaultValue);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userData } = useAuth();
  const canUsePlaylists = isAuthenticated && userData?.type === 'actant';

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!canUsePlaylists) { setPlaylists([]); return; }
    setLoading(true);
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, [canUsePlaylists]);

  useEffect(() => { refresh(); }, [refresh]);

  const savedIds = useMemo<Set<number>>(() => {
    const ids = new Set<number>();
    playlists.forEach((p) => p.items.forEach((item: PlaylistItemEntry) => ids.add(item.id)));
    return ids;
  }, [playlists]);

  const isInAnyPlaylist = useCallback((id: number) => savedIds.has(id), [savedIds]);

  const isInPlaylist = useCallback(
    (playlistId: number, itemId: number) => {
      const p = playlists.find((pl) => pl.id === playlistId);
      return p ? p.items.some((i: PlaylistItemEntry) => i.id === itemId) : false;
    },
    [playlists],
  );

  const addToPlaylist = useCallback(
    async (playlistId: number, resourceId: number) => {
      // Optimiste
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id !== playlistId || p.items.some((i) => i.id === resourceId)
            ? p
            : { ...p, items: [...p.items, { id: resourceId, addedAt: new Date().toISOString(), note: null }] },
        ),
      );
      try {
        const updated = await apiAdd(playlistId, resourceId);
        setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const removeFromPlaylist = useCallback(
    async (playlistId: number, resourceId: number) => {
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id !== playlistId ? p : { ...p, items: p.items.filter((i) => i.id !== resourceId) },
        ),
      );
      try {
        const updated = await apiRemove(playlistId, resourceId);
        setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const createPlaylist = useCallback(
    async (title: string, description = ''): Promise<Playlist> => {
      const created = await apiCreate(title, description);
      setPlaylists((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const deletePlaylist = useCallback(
    async (id: number) => {
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      try {
        await apiDelete(id);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const updatePlaylist = useCallback(
    async (id: number, patch: Parameters<typeof apiUpdate>[1]) => {
      const updated = await apiUpdate(id, patch);
      setPlaylists((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [],
  );

  const value = useMemo(
    () => ({ playlists, savedIds, loading, canUsePlaylists, isInAnyPlaylist, isInPlaylist, addToPlaylist, removeFromPlaylist, createPlaylist, deletePlaylist, updatePlaylist, refresh }),
    [playlists, savedIds, loading, canUsePlaylists, isInAnyPlaylist, isInPlaylist, addToPlaylist, removeFromPlaylist, createPlaylist, deletePlaylist, updatePlaylist, refresh],
  );

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  return useContext(PlaylistContext);
}
