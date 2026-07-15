import React, { useEffect, useState } from 'react';
import { Spinner, useDisclosure } from '@heroui/react';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  modalCloseButtonClasses,
} from '@/theme/components';
import { ScrollFadeArea } from '@/components/ui/ScrollFadeArea';
import {
  FEEDBACK_POPUP_CATEGORY_VIEWS,
  isFeedbackPopupViewKey,
  LinkedResourcePopupState,
} from '@/config/linkedResourcePopupConfig';
import { fieldValue, flattenMediaUrls, getChildItem, ItemPageData, viewCategoryEntries } from '@/services/itemPage';
import { PopupMediaGallery } from './PopupMediaGallery';

interface LinkedResourcePopupModalProps {
  popup: LinkedResourcePopupState | null;
  onClose: () => void;
}

export type { LinkedResourcePopupState } from '@/config/linkedResourcePopupConfig';

const CategoryFields: React.FC<{
  entries: { key: string; label: string; values: string[] }[];
}> = ({ entries }) => (
  <div className='flex flex-col gap-3'>
    {entries.map((field) => (
      <div key={field.key} className='rounded-xl border-2 border-c3 p-4'>
        <p className='text-c4 text-sm font-medium mb-1.5'>{field.label}</p>
        <p className='text-c6 text-base whitespace-pre-line leading-relaxed'>{field.values.join(', ')}</p>
      </div>
    ))}
  </div>
);

const renderCategoryPopupContent = (item: ItemPageData, viewKey: string) => {
  if (viewKey === 'AnalyseCritique') {
    const argument = fieldValue(item.fields.argument);
    if (argument) {
      return <p className='text-c6 text-base whitespace-pre-line leading-relaxed'>{argument}</p>;
    }
    return null;
  }

  if (isFeedbackPopupViewKey(viewKey)) {
    const sections = FEEDBACK_POPUP_CATEGORY_VIEWS.map(({ key, title }) => {
      const entries = viewCategoryEntries(item.views[key]);
      if (entries.length === 0) return null;
      return { key, title, entries };
    }).filter(Boolean) as { key: string; title: string; entries: { key: string; label: string; values: string[] }[] }[];

    if (sections.length === 0) return null;

    return (
      <div className='flex flex-col gap-5'>
        {sections.map((section) => (
          <div key={section.key} className='flex flex-col gap-3'>
            <h3 className='text-c5 text-sm font-medium uppercase tracking-wide'>{section.title}</h3>
            <CategoryFields entries={section.entries} />
          </div>
        ))}
      </div>
    );
  }

  const filledFields = viewCategoryEntries(item.views.Analyse);
  if (filledFields.length > 0) {
    return <CategoryFields entries={filledFields} />;
  }

  return null;
};

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

  const renderTextContent = () => {
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

    const content = popup?.viewKey ? renderCategoryPopupContent(item, popup.viewKey) : null;
    if (content) return content;

    return !medias.length ? (
      <p className='text-c4 text-sm italic text-center py-8'>Aucun contenu renseigné.</p>
    ) : null;
  };

  const showMediaGallery = !loading && !!item && medias.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size='3xl'
      backdrop='blur'
      scrollBehavior='normal'
      placement='center'
      classNames={{
        closeButton: modalCloseButtonClasses,
        body: 'overflow-hidden',
      }}
      motionProps={{
        variants: {
          enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
          exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
        },
      }}>
      <ModalContent className='flex h-[85vh] max-h-[85vh] flex-col bg-c1 border-2 border-c3'>
        <ModalHeader className='flex shrink-0 flex-col gap-px py-4 border-b border-c3'>
          <h2 className='text-c6 text-xl font-semibold leading-tight'>
            {loading ? 'Chargement...' : title || 'Sans titre'}
          </h2>
        </ModalHeader>

        <ModalBody className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden py-4 pb-6'>
          {showMediaGallery && (
            <div className='shrink-0 px-1'>
              <PopupMediaGallery key={String(popup?.resourceId)} medias={medias} />
            </div>
          )}

          <ScrollFadeArea contentClassName='px-1'>
            {renderTextContent()}
          </ScrollFadeArea>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
