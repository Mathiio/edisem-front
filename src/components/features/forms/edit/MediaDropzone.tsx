import React, { useState, useRef, useCallback } from 'react';
import { Tabs, Tab } from '@heroui/react';
import { addToast } from '@/theme/components';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  modalCloseButtonClasses,
  ModalCloseIcon,
} from '@/theme/components/modal';
import { Button } from '@/theme/components/button';
import { AlertModal } from '@/components/ui/AlertModal';
import { FormTextInput } from '@/components/features/forms/edit/FormFields';
import { CrossIcon, UploadIcon, AddIcon, MovieIcon } from '@/components/ui/icons';
import { isValidYouTubeUrl } from '@/lib/utils';
import {
  type MediaGalleryItem,
  createUploadGalleryItem,
  createYoutubeGalleryItem,
} from '@/lib/mediaGallery';

export interface MediaAuthor {
  id: number | string;
  title?: string;
  name?: string;
  picture?: string;
  thumbnailUrl?: string;
  resource_template_id?: number;
  type?: string;
}

/** @deprecated Utiliser MediaGalleryItem */
export interface MediaFile {
  id: string;
  file?: File;
  url?: string;
  preview: string;
  type: 'image' | 'video';
  name: string;
  isExisting?: boolean;
}

/** Actant (72), Personne (33), Organisation (104), Étudiant (96) */
export const DEFAULT_AUTHOR_TEMPLATE_IDS = [72, 33, 104, 96] as const;

export interface MediaDropzoneProps {
  items: MediaGalleryItem[];
  onItemsChange: (items: MediaGalleryItem[]) => void;
  /** Appelé quand un média Omeka existant est retiré (pour tracking suppression) */
  onRemoveExistingMedia?: (item: MediaGalleryItem) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
  height?: string;
  /** Affiche l'onglet YouTube dans la modale d'ajout */
  allowYoutube?: boolean;
}

const REJECTED_MIME_TYPES = ['image/webp'] as const;
const REJECTED_FILE_EXTENSIONS = ['.webp'] as const;

const MODAL_TAB_CLASS_NAMES = {
  base: 'w-full',
  tabList: 'w-full bg-c2 border-2 border-c3 rounded-xl p-px gap-px',
  cursor: 'w-full bg-action rounded-lg',
  tab: 'flex-1 px-4 py-2 text-c5 data-[selected=true]:text-white justify-center',
  tabContent: 'group-data-[selected=true]:text-white',
};

export const MediaDropzone: React.FC<MediaDropzoneProps> = ({
  items = [],
  onItemsChange,
  onRemoveExistingMedia,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'video/*'],
  disabled = false,
  className = '',
  height = '450px',
  allowYoutube = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<string>('media');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [dragReorderIndex, setDragReorderIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaToDelete, setMediaToDelete] = useState<MediaGalleryItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<MediaGalleryItem[]>([]);
  const [youtubeDraft, setYoutubeDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMedia = items[currentIndex];
  const canAddMore = items.length < maxFiles;
  const showYoutubeTab = allowYoutube;

  const openModal = (tab: 'media' | 'youtube' = 'media') => {
    if (disabled || !canAddMore) return;
    setModalTab(tab);
    setPendingFiles([]);
    setYoutubeDraft('');
    setIsModalOpen(true);
  };

  const closeModal = (options?: { revokePending?: boolean }) => {
    const shouldRevokePending = options?.revokePending ?? true;
    if (shouldRevokePending) {
      pendingFiles.forEach((f) => {
        if (f.file) URL.revokeObjectURL(f.preview);
      });
    }
    setPendingFiles([]);
    setYoutubeDraft('');
    setIsDraggingFile(false);
    setIsModalOpen(false);
  };

  const processFiles = useCallback(
    (files: FileList | null, target: 'pending' | 'immediate' = 'pending') => {
      if (!files || disabled) return;

      const newMediaFiles: MediaGalleryItem[] = [];
      const rejectedFiles: string[] = [];
      const baseCount = items.length + (target === 'pending' ? pendingFiles.length : 0);
      const remainingSlots = maxFiles - baseCount;

      Array.from(files)
        .slice(0, remainingSlots)
        .forEach((file) => {
          const isRejectedType = (REJECTED_MIME_TYPES as readonly string[]).includes(file.type);
          const isRejectedExtension = REJECTED_FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

          if (isRejectedType || isRejectedExtension) {
            rejectedFiles.push(file.name);
            return;
          }

          newMediaFiles.push(createUploadGalleryItem(file));
        });

      if (rejectedFiles.length > 0) {
        addToast({
          title: 'Format non supporté',
          description: `Les fichiers WebP ne sont pas acceptés : ${rejectedFiles.join(', ')}`,
          classNames: { base: 'bg-warning text-white' },
        });
      }

      if (newMediaFiles.length === 0) return;

      if (target === 'pending') {
        setPendingFiles((prev) => [...prev, ...newMediaFiles]);
      } else {
        onItemsChange([...items, ...newMediaFiles]);
      }
    },
    [disabled, items, pendingFiles.length, maxFiles, onItemsChange],
  );

  const handleModalSave = () => {
    if (modalTab === 'youtube') {
      if (!isValidYouTubeUrl(youtubeDraft)) return;
      const newItem = createYoutubeGalleryItem(youtubeDraft, items.length);
      onItemsChange([...items, newItem]);
      setCurrentIndex(items.length);
      closeModal();
      return;
    }

    if (pendingFiles.length > 0) {
      onItemsChange([...items, ...pendingFiles]);
      setCurrentIndex(items.length);
      closeModal({ revokePending: false });
      return;
    }
    closeModal();
  };

  const removePendingFile = (key: string) => {
    setPendingFiles((prev) => {
      const removed = prev.find((f) => f.key === key);
      if (removed?.file) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.key !== key);
    });
  };

  const handleRemoveClick = (media: MediaGalleryItem) => {
    setMediaToDelete(media);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmRemove = () => {
    if (!mediaToDelete) return;

    if (mediaToDelete.isExisting) {
      onRemoveExistingMedia?.(mediaToDelete);
    } else if (mediaToDelete.file) {
      URL.revokeObjectURL(mediaToDelete.preview);
    }

    const removeIndex = items.findIndex((item) => item.key === mediaToDelete.key);
    onItemsChange(items.filter((item) => item.key !== mediaToDelete.key));

    if (removeIndex !== -1) {
      if (currentIndex >= items.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (removeIndex < currentIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (items.length <= 1) {
        setCurrentIndex(0);
      }
    }

    setIsDeleteModalOpen(false);
    setMediaToDelete(null);
  };

  const reorderItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onItemsChange(reordered);

    if (currentIndex === fromIndex) {
      setCurrentIndex(toIndex);
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleThumbnailDragStart = (index: number) => (event: React.DragEvent) => {
    if (disabled) return;
    setDragReorderIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleThumbnailDragOver = (event: React.DragEvent) => {
    if (disabled || dragReorderIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleThumbnailDrop = (dropIndex: number) => (event: React.DragEvent) => {
    event.preventDefault();
    if (dragReorderIndex === null || dragReorderIndex === dropIndex) {
      setDragReorderIndex(null);
      return;
    }
    reorderItems(dragReorderIndex, dropIndex);
    setDragReorderIndex(null);
  };

  const handleThumbnailDragEnd = () => {
    setDragReorderIndex(null);
  };

  const canSaveModal =
    modalTab === 'youtube'
      ? isValidYouTubeUrl(youtubeDraft)
      : pendingFiles.length > 0;

  const renderDropZone = (compact = false) => (
    <div
      className={`
        flex flex-col items-center justify-center w-full
        ${compact ? 'min-h-[220px] py-8' : 'h-full min-h-[280px]'}
        bg-c2/50 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
        ${isDraggingFile ? 'border-action bg-c3' : 'border-c4/50 hover:border-c4/75 hover:bg-c2'}
      `}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDraggingFile(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        if (!disabled) processFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      role='button'
      tabIndex={0}>
      <UploadIcon size={compact ? 32 : 40} className='text-c4 mb-4' />
      <p className='text-c5 text-sm font-medium mb-2 text-center max-w-[300px]'>
        Glissez-déposez vos images ou vidéos ou cliquer pour parcourir les fichiers.
      </p>
    </div>
  );

  const renderPendingFileThumbnail = (file: MediaGalleryItem) => (
    <div key={file.key} className='group relative w-24 h-16 rounded-lg overflow-hidden border-2 border-c3'>
      {file.type === 'video' ? (
        <video src={file.preview} className='w-full h-full object-cover' />
      ) : (
        <img src={file.preview} alt={file.name} className='w-full h-full object-cover' />
      )}
      <button
        type='button'
        onClick={() => removePendingFile(file.key)}
        aria-label={`Retirer ${file.name}`}
        className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer'>
        <span className='absolute inset-0 bg-black/55' aria-hidden='true' />
        <CrossIcon size={22} className='relative z-10 text-white' />
      </button>
    </div>
  );

  return (
    <div className='flex flex-col gap-2'>
      <div className={`relative rounded-xl overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ height }}>
        {items.length > 0 && currentMedia ? (
          <div className={`relative w-full h-full flex flex-col ${className}`}>
            <div className='relative flex-1 min-h-0'>
              {currentMedia.isYouTube ? (
                <iframe
                  src={currentMedia.displayUrl}
                  className='w-full h-full rounded-xl'
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                  allowFullScreen
                  title={currentMedia.name}
                />
              ) : currentMedia.type === 'video' ? (
                <video src={currentMedia.displayUrl || currentMedia.preview} className='w-full h-full object-cover rounded-xl' controls />
              ) : (
                <img src={currentMedia.displayUrl || currentMedia.preview} alt={currentMedia.name} className='w-full h-full object-cover rounded-xl' />
              )}

              {!disabled && (
                <button
                  type='button'
                  aria-label='Supprimer le média'
                  onClick={() => handleRemoveClick(currentMedia)}
                  className={[
                    'absolute top-3 right-3 z-10',
                    'flex items-center justify-center',
                    'w-9 h-9 rounded-lg',
                    'bg-c3/70 hover:bg-danger',
                    'text-c6 shadow-sm',
                    'cursor-pointer transition-colors duration-200',
                  ].join(' ')}>
                  <ModalCloseIcon className='w-4 h-4' />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type='button'
            disabled={disabled}
            onClick={() => openModal('media')}
            className={`
              w-full h-full flex flex-col items-center justify-center gap-4
              border-2 border-c3 rounded-xl
              hover:bg-c3 bg-c2 transition-all duration-200
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}>
            <MovieIcon size={40} className='text-c4' />
            <div className='flex flex-col items-center'>
              <p className='text-c6 text-base font-medium'>Ajouter des médias</p>
              <p className='text-c4 text-sm'>Cliquez pour ouvrir la fenêtre d&apos;ajout</p>
            </div>
          </button>
        )}
      </div>


      <div className='flex w-full justify-start items-center gap-2 flex-wrap'>
        {items.map((media, index) => (
          <div
            key={media.key}
            className={`relative ${dragReorderIndex === index ? 'opacity-60 scale-95' : ''}`}
            draggable={!disabled && items.length > 1}
            onDragStart={handleThumbnailDragStart(index)}
            onDragOver={handleThumbnailDragOver}
            onDrop={handleThumbnailDrop(index)}
            onDragEnd={handleThumbnailDragEnd}>
            <button
              type='button'
              onClick={() => setCurrentIndex(index)}
              className={`
                flex-shrink-0 w-28 h-16 rounded-xl overflow-hidden
                transition-all duration-200
                ${disabled ? 'cursor-default' : items.length > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                ${index === currentIndex ? 'border-2 border-c5' : 'border-2 border-transparent hover:border-c4'}
              `}>
              {media.isYouTube ? (
                <div className='relative w-full h-full'>
                  <img src={media.preview} alt={media.name} className='w-full h-full object-cover' draggable={false} />
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
                    <MovieIcon size={20} className='text-white' />
                  </div>
                </div>
              ) : media.type === 'video' ? (
                <video src={media.displayUrl || media.preview} className='w-full h-full object-cover' draggable={false} />
              ) : (
                <img src={media.displayUrl || media.preview} alt={media.name} className='w-full h-full object-cover' draggable={false} />
              )}
            </button>
          </div>
        ))}

        {!disabled && canAddMore && items.length > 0 && (
          <button
            type='button'
            onClick={() => openModal('media')}
            className='flex-shrink-0 w-28 h-16 rounded-xl border-2 cursor-pointer border-c3 bg-c2 hover:bg-c3 flex items-center justify-center transition-all duration-200'>
            <AddIcon size={16} className='text-c4' />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type='file'
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => {
          processFiles(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        className='hidden'
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        size='xl'
        backdrop='blur'
        scrollBehavior='inside'
        classNames={{ closeButton: modalCloseButtonClasses }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <span className='text-c6 font-semibold text-xl'>Ajouter un média</span>
              </ModalHeader>

              <ModalBody>
                {showYoutubeTab ? (
                  <Tabs
                    fullWidth
                    aria-label='Type de média'
                    selectedKey={modalTab}
                    onSelectionChange={(key) => setModalTab(String(key))}
                    classNames={MODAL_TAB_CLASS_NAMES}>
                    <Tab key='media' title='Médias'>
                      <div className='flex flex-col gap-4 pt-4'>
                        {renderDropZone(true)}
                        {pendingFiles.length > 0 && (
                          <div className='flex flex-col gap-2'>
                            <p className='text-c5 text-sm font-medium'>
                              {pendingFiles.length} fichier{pendingFiles.length > 1 ? 's' : ''} à ajouter
                            </p>
                            <div className='flex flex-wrap gap-2'>
                              {pendingFiles.map(renderPendingFileThumbnail)}
                            </div>
                          </div>
                        )}
                      </div>
                    </Tab>
                    <Tab key='youtube' title='Vidéo YouTube'>
                      <div className='pt-4'>
                        <FormTextInput
                          label='URL YouTube'
                          type='url'
                          value={youtubeDraft}
                          onChange={setYoutubeDraft}
                          placeholder='https://www.youtube.com/watch?v=...'
                        />
                      </div>
                    </Tab>
                  </Tabs>
                ) : (
                  <div className='flex flex-col gap-4'>
                    {renderDropZone(true)}
                    {pendingFiles.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {pendingFiles.map(renderPendingFileThumbnail)}
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant='light' onPress={onClose} className='text-c5 rounded-lg'>
                  Annuler
                </Button>
                <Button
                  onPress={handleModalSave}
                  isDisabled={!canSaveModal}
                  className='bg-action text-selected rounded-lg'>
                  Enregistrer
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <AlertModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setMediaToDelete(null); }}
        title='Confirmer la suppression'
        type='danger'
        confirmLabel='Supprimer'
        onConfirm={handleConfirmRemove}
        description={
          <>
            <p>
              {mediaToDelete?.isExisting ? (
                <>Supprimer le média <span className='text-c6 font-medium'>&quot;{mediaToDelete.name}&quot;</span> ?</>
              ) : (
                <>Retirer <span className='text-c6 font-medium'>&quot;{mediaToDelete?.name}&quot;</span> de la liste ?</>
              )}
            </p>
            <p className='text-c4 text-sm mt-2.5'>
              {mediaToDelete?.isExisting
                ? 'Cette action est irréversible.'
                : 'Le fichier ne sera pas envoyé lors de la sauvegarde.'}
            </p>
          </>
        }
      />
    </div>
  );
};

export default MediaDropzone;
