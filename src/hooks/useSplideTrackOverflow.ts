import { useEffect, useState, type RefObject } from 'react';
import type { Splide } from '@splidejs/splide';

function measureTrackOverflow(root: HTMLElement): boolean {
  const list = root.querySelector('.splide__list') as HTMLElement | null;
  const track = root.querySelector('.splide__track') as HTMLElement | null;
  if (!list || !track) return false;
  return list.scrollWidth > track.clientWidth + 1;
}

/**
 * Détecte si la piste Splide déborde (autoWidth ou slides plus larges que le conteneur).
 * Quand `enabled` est false, retourne toujours true (flèches toujours visibles).
 */
export function useSplideTrackOverflow(
  splideRef: RefObject<Splide | null>,
  enabled: boolean,
  deps: unknown[] = [],
): boolean {
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHasOverflow(false);
      return;
    }

    const splide = splideRef.current;
    if (!splide?.root) return;

    const check = () => {
      setHasOverflow(measureTrackOverflow(splide.root));
    };

    const scheduleCheck = () => requestAnimationFrame(check);
    scheduleCheck();

    const ro = new ResizeObserver(scheduleCheck);
    ro.observe(splide.root);
    const list = splide.root.querySelector('.splide__list');
    if (list) ro.observe(list);
    window.addEventListener('resize', scheduleCheck);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', scheduleCheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, splideRef, ...deps]);

  return enabled ? hasOverflow : true;
}
