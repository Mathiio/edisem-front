import React from 'react';
import { Spinner } from '@heroui/react';
import { pickOmekaDisplayThumbnail, resolveOmekaThumbnail } from '@/lib/resourceUtils';
import {
  getResourceFallbackTitle,
  getResourceOwnerId,
} from '@/lib/resourceEditHelpers';
import { getResourceIds } from '@/pages/generic/simplifiedConfigAdapter';
import { RenderContentContext } from '@/pages/generic/config';
import { LINKED_RESOURCE_LIST_CLASS } from '@/components/features/resource-links/LinkedResourceCard';
import { LinkedResourceCard } from '@/components/features/resource-links/LinkedResourceCard';

interface PopupViewMeta {
  key: string;
  property: string;
  urlPattern?: string;
  resourceTemplateId?: number;
  resourceTemplateIds?: number[];
}

interface PopupItemsListViewProps {
  view: PopupViewMeta;
  context: RenderContentContext;
  onItemSelect: (resourceId: string | number, viewKey: string) => void;
}

export const PopupItemsListView: React.FC<PopupItemsListViewProps> = ({ view, context, onItemSelect }) => {
  const { itemDetails, loadingViews } = context;

  let resourceIds = getResourceIds(itemDetails, view.property || '');
  const resourceCache = { ...(itemDetails?.resourceCache || {}) };
  const viewPropertyRefs: any[] = Array.isArray(itemDetails[view.property || ''])
    ? itemDetails[view.property || '']
    : [];
  const linkedRefThumbnailById = new Map<string, string>();

  viewPropertyRefs.forEach((ref: any) => {
    const refId = ref?.value_resource_id;
    if (refId == null) return;
    const thumb =
      pickOmekaDisplayThumbnail(ref['thumbnail_display_urls']) ||
      resolveOmekaThumbnail(ref.thumbnail_url);
    if (thumb) linkedRefThumbnailById.set(String(refId), thumb);
  });

  const items = resourceIds
    .map((id) => {
      const cached = resourceCache[id];
      const cachedTemplateId = cached?.resource_template_id || cached?.template || cached?.class || view.resourceTemplateId;
      const cachedTitle = cached?.title?.startsWith('Item #') ? undefined : cached?.title;

      if (loadingViews && !cached) {
        return null;
      }

      return {
        id,
        title: cachedTitle || getResourceFallbackTitle(id, cachedTemplateId),
        thumbnail:
          cached?.thumbnailUrl ||
          cached?.thumbnail ||
          linkedRefThumbnailById.get(String(id)),
        ownerId: getResourceOwnerId(cached),
      };
    })
    .filter(Boolean) as { id: string | number; title: string; thumbnail?: string }[];

  if (loadingViews) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Spinner size='lg' />
        <span className='ml-3 text-c5'>Chargement des ressources...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={LINKED_RESOURCE_LIST_CLASS}>
      {items.map((item) => (
        <LinkedResourceCard
          key={item.id}
          thumbnail={item.thumbnail}
          onClick={(e) => {
            e.preventDefault();
            onItemSelect(item.id, view.key);
          }}>
          <div className='flex flex-col gap-2.5 min-w-0'>
            <p className='text-c6 text-base font-normal'>{item.title}</p>
          </div>
        </LinkedResourceCard>
      ))}
    </div>
  );
};
