import React from 'react';
import type { ResourceOwnerInfo } from '@/lib/resourceOwner';

interface ResourceOwnerAttributionProps {
  owner?: ResourceOwnerInfo | null;
  resourceTypeLabel?: string | null;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

/**
 * Métadonnées bas de page : type de ressource et créateur (o:owner).
 */
export const ResourceOwnerAttribution: React.FC<ResourceOwnerAttributionProps> = ({
  owner,
  resourceTypeLabel,
  className = '',
  align = 'end',
}) => {
  const typeLabel = resourceTypeLabel?.trim();
  const creatorName = owner?.displayName?.trim();
  if (!typeLabel && !creatorName) return null;

  const alignClass = align === 'start' ? 'text-start items-start' : align === 'center' ? 'text-center items-center' : 'text-end items-end';

  return (
    <div className={`flex gap-1.5 text-sm text-c4 ${alignClass} ${className}`.trim()}>
      {typeLabel && <span>{typeLabel}</span>}
      {creatorName && <span>créé par : {creatorName}</span>}
    </div>
  );
};
