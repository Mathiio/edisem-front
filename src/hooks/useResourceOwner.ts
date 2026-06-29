import { useEffect, useState } from 'react';
import { resolveResourceOwner, type ResourceOwnerInfo } from '@/lib/resourceOwner';
import { getResourceOwnerId } from '@/lib/resourceEditHelpers';

/** Résout resourceOwner depuis itemDetails (cache enrichi ou lookup actant). */
export function useResourceOwner(itemDetails: any): ResourceOwnerInfo | null {
  const [owner, setOwner] = useState<ResourceOwnerInfo | null>(itemDetails?.resourceOwner ?? null);

  useEffect(() => {
    if (itemDetails?.resourceOwner) {
      setOwner(itemDetails.resourceOwner);
      return;
    }

    const ownerId = getResourceOwnerId(itemDetails);
    if (ownerId == null) {
      setOwner(null);
      return;
    }

    let cancelled = false;
    resolveResourceOwner(ownerId, itemDetails?.['o:owner']).then((resolved) => {
      if (!cancelled) setOwner(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [itemDetails]);

  return owner;
}
