import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractExternalUrlFromOmekaItem } from '@/lib/resourceUtils';

const API_BASE = '/omk/api/';

/**
 * Les ressources formOnly n'ont pas de page vue.
 * Accès direct à /organisation/:id etc. → ouvre le lien externe si présent, puis retour.
 */
export function FormOnlyResourceGate({ itemId }: { itemId: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const leave = () => {
      if (cancelled) return;
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    };

    (async () => {
      try {
        const res = await fetch(`${API_BASE}items/${itemId}`);
        if (res.ok) {
          const data = await res.json();
          const externalUrl = extractExternalUrlFromOmekaItem(data);
          if (externalUrl) {
            window.open(externalUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } catch {
        // ignore
      }
      leave();
    })();

    return () => {
      cancelled = true;
    };
  }, [itemId, navigate]);

  return null;
}
