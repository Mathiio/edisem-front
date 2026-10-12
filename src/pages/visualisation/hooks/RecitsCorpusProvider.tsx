import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchRecitsCorpusFromApi } from '@/services/DatavisCorpus';

import { RecitsCorpusContext } from './RecitsCorpusContext';
import { computeProximityLinksAsync } from './computeProximityLinksAsync';
import { clearRecitsCorpusCache, readRecitsCorpusCache, writeRecitsCorpusCache } from './recitsCorpusCache';
import { fetchAllRecitNodes, type ProximityLink, type RecitNode } from './useRecitsData';

export function RecitsCorpusProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<RecitNode[]>(() => readRecitsCorpusCache() ?? []);
  const [baseLinks, setBaseLinks] = useState<ProximityLink[]>([]);
  const [loading, setLoading] = useState(() => !(readRecitsCorpusCache()?.length));
  const [linksLoading, setLinksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeLinks = useCallback(async (list: RecitNode[]) => {
    if (list.length === 0) {
      setBaseLinks([]);
      return;
    }
    setLinksLoading(true);
    try {
      const links = await computeProximityLinksAsync(list, 1);
      setBaseLinks(links);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const cached = readRecitsCorpusCache();
    if (cached?.length) {
      setNodes(cached);
      setLoading(false);
      void computeLinks(cached);
    } else {
      setLoading(true);
    }

    try {
      let fetched = await fetchRecitsCorpusFromApi();
      if (!fetched?.length) {
        fetched = await fetchAllRecitNodes();
      }
      setNodes(fetched);
      writeRecitsCorpusCache(fetched);
      await computeLinks(fetched);
    } catch (e) {
      if (!cached?.length) {
        setNodes([]);
        setBaseLinks([]);
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [computeLinks]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(async () => {
    clearRecitsCorpusCache();
    setLoading(true);
    setBaseLinks([]);
    await load();
  }, [load]);

  const value = useMemo(
    () => ({
      nodes,
      baseLinks,
      loading: loading || linksLoading,
      error,
      reload,
    }),
    [nodes, baseLinks, loading, linksLoading, error, reload],
  );

  return <RecitsCorpusContext.Provider value={value}>{children}</RecitsCorpusContext.Provider>;
}
