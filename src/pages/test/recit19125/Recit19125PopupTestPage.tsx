import React, { useCallback, useMemo, useState } from 'react';
import { GenericDetailPage } from '@/pages/generic/GenericDetailPage';
import { GenericDetailPageConfig } from '@/pages/generic/config';
import { recitArtitstiqueConfig } from '@/pages/generic/config/recitArtitstiqueConfig';
import { PopupItemsListView } from './PopupItemsListView';
import {
  LinkedResourcePopupModal,
  LinkedResourcePopupState,
  PopupViewKey,
} from './LinkedResourcePopupModal';

const TEST_ITEM_ID = '19125';

const POPUP_VIEW_KEYS = new Set<PopupViewKey>([
  'AnalyseCritique',
  'ElementsNarratifs',
  'ElementsEsthetiques',
]);

const POPUP_VIEW_META: Record<
  PopupViewKey,
  { property: string; urlPattern: string; resourceTemplateId?: number; resourceTemplateIds?: number[] }
> = {
  AnalyseCritique: {
    property: 'dcterms:description',
    urlPattern: '/corpus/analyse-critique/:id',
    resourceTemplateId: 101,
  },
  ElementsNarratifs: {
    property: 'schema:backstory',
    urlPattern: '/corpus/element-narratif/:id',
    resourceTemplateIds: [115],
  },
  ElementsEsthetiques: {
    property: 'schema:artform',
    urlPattern: '/corpus/element-esthetique/:id',
    resourceTemplateIds: [118],
  },
};

function buildPopupTestConfig(
  onItemSelect: (resourceId: string | number, viewKey: PopupViewKey) => void,
): GenericDetailPageConfig {
  return {
    ...recitArtitstiqueConfig,
    viewOptions: recitArtitstiqueConfig.viewOptions.map((viewOption) => {
      if (!POPUP_VIEW_KEYS.has(viewOption.key as PopupViewKey)) {
        return viewOption;
      }

      const viewKey = viewOption.key as PopupViewKey;
      const meta = POPUP_VIEW_META[viewKey];

      return {
        ...viewOption,
        renderContent: (context) => (
          <PopupItemsListView
            view={{ key: viewKey, ...meta }}
            context={context}
            onItemSelect={(id, key) => onItemSelect(id, key as PopupViewKey)}
          />
        ),
      };
    }),
  };
}

export const Recit19125PopupTestPage: React.FC = () => {
  const [popup, setPopup] = useState<LinkedResourcePopupState | null>(null);

  const handleItemSelect = useCallback((resourceId: string | number, viewKey: PopupViewKey) => {
    setPopup({ resourceId, viewKey });
  }, []);

  const config = useMemo(() => buildPopupTestConfig(handleItemSelect), [handleItemSelect]);

  return (
    <>
      <div className='w-full bg-amber-500/15 border-b border-amber-500/30 px-6 py-3 text-center'>
        <p className='text-c6 text-sm'>
          <span className='font-medium'>Page test</span> — item {TEST_ITEM_ID} (Her). Les analyses
          critiques, éléments narratifs et esthétiques s&apos;ouvrent en popup au lieu de naviguer
          (popup désormais chargée via le nouveau backend <code>getChildItem</code>, un seul appel réseau).
        </p>
      </div>
      <GenericDetailPage config={config} itemId={TEST_ITEM_ID} />
      <LinkedResourcePopupModal popup={popup} onClose={() => setPopup(null)} />
    </>
  );
};
