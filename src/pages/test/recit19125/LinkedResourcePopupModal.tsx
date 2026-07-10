import React, { useEffect, useState } from 'react';
import { Spinner, useDisclosure } from '@heroui/react';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  modalBottomFadeClass,
  modalCloseButtonClasses,
} from '@/theme/components';
import { fieldValue, flattenMediaUrls, getChildItem, ItemPageData, viewCategoryEntries } from '@/services/itemPage';
import { PopupMediaGallery } from './PopupMediaGallery';

export type PopupViewKey = 'AnalyseCritique' | 'ElementsNarratifs' | 'ElementsEsthetiques';

export interface LinkedResourcePopupState {
  resourceId: string | number;
  viewKey: PopupViewKey;
}

interface LinkedResourcePopupModalProps {
  popup: LinkedResourcePopupState | null;
  onClose: () => void;
}

/**
 * Popup d'item enfant (analyse critique, élément narratif/esthétique) — même structure/rendu
 * qu'avant, mais chargée via le nouveau backend "Item Page" (getChildItem, un seul appel réseau)
 * au lieu de config.dataFetcher (GET /omk/api/items/{id} + enrichissements N+1).
 */
export const LinkedResourcePopupModal: React.FC<LinkedResourcePopupModalProps> = ({ popup, onClose }) => {
  const { isOpen, onOpen, onClose: closeModal } = useDisclosure();
  const [item, setItem] = useState<ItemPageData | null>(null);
  const [medias, setMedias] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (popup) {
      onOpen();
    } else {
      closeModal();
    }
  }, [popup, onOpen, closeModal]);

  useEffect(() => {
    if (!popup) {
      setItem(null);
      setMedias([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setItem(null);
    setMedias([]);

    getChildItem(popup.resourceId)
      .then((result) => {
        if (cancelled) return;
        setItem(result);
        setMedias(result ? flattenMediaUrls(result.associatedMedia) : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setItem(null);
        setMedias([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [popup?.resourceId, popup?.viewKey]);

  const handleClose = () => {
    closeModal();
    onClose();
  };

  const title = item?.title || '';

  const renderContent = () => {
    if (loading) {
      return (
        <div className='flex flex-col items-center justify-center gap-2 py-16'>
          <Spinner color='current' className='text-c6' size='md' />
          <p className='text-c5 text-sm'>Chargement...</p>
        </div>
      );
    }

    if (!item) {
      return (
        <div className='flex flex-col items-center justify-center gap-1 py-16 text-center'>
          <p className='text-c5 text-base font-medium'>Impossible de charger cette ressource.</p>
        </div>
      );
    }

    if (popup?.viewKey === 'AnalyseCritique') {
      const argument = fieldValue(item.fields.argument);
      return (
        <div className='flex flex-col gap-5'>
          <PopupMediaGallery key={String(popup?.resourceId)} medias={medias} />
          {argument ? (
            <p className='text-c6 text-base whitespace-pre-line leading-relaxed'>{argument}</p>
          ) : (
            !medias.length && <p className='text-c4 text-sm italic text-center py-8'>Aucune analyse renseignée.</p>
          )}
        </div>
      );
    }

    const filledFields = viewCategoryEntries(item.views.Analyse);

    return (
      <div className='flex flex-col gap-5'>
        <PopupMediaGallery key={String(popup?.resourceId)} medias={medias} />
        {filledFields.length > 0 ? (
          <div className='flex flex-col gap-3'>
            {filledFields.map((field) => (
              <div key={field.key} className='rounded-xl border-2 border-c3 p-4'>
                <p className='text-c4 text-sm font-medium mb-1.5'>{field.label}</p>
                <p className='text-c6 text-base whitespace-pre-line leading-relaxed'>{field.values.join(', ')}</p>
              </div>
            ))}
          </div>
        ) : (
          !medias.length && <p className='text-c4 text-sm italic text-center py-8'>Aucun contenu renseigné.</p>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size='3xl'
      backdrop='blur'
      scrollBehavior='inside'
      placement='center'
      classNames={{ closeButton: modalCloseButtonClasses }}
      motionProps={{
        variants: {
          enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
          exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
        },
      }}>
      <ModalContent className='max-h-[85vh] bg-c1 border-2 border-c3'>
        <ModalHeader className='flex flex-col gap-px py-4 border-b border-c3'>
          <h2 className='text-c6 text-xl font-semibold leading-tight'>
            {loading ? 'Chargement...' : title || 'Sans titre'}
          </h2>
        </ModalHeader>

        <ModalBody className='relative flex flex-col overflow-hidden py-4 pb-6'>
          <div className='pointer-events-none absolute top-0 left-0 z-10 h-5 w-full bg-gradient-to-b from-c1 to-transparent' />
          <div className='min-h-0 flex-1 overflow-y-auto px-1 scrollbar-hide'>
            {renderContent()}
          </div>
          <div className={`pointer-events-none absolute bottom-0 left-0 z-10 w-full ${modalBottomFadeClass}`} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
