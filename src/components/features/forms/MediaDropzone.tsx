import React, { useState, useRef, useCallback } from 'react';
import { addToast, Tabs, Tab } from '@heroui/react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  modalCloseButtonClasses,
} from '@/theme/components/modal';
import { Button } from '@/theme/components/button';
import { AlertModal } from '@/components/ui/AlertModal';
import { FormTextInput } from '@/components/features/forms/FormFields';
import { CrossIcon, UploadIcon, AddIcon, MovieIcon } from '@/components/ui/icons';
import { isValidYouTubeUrl } from '@/lib/utils';

export interface MediaAuthor {
  id: number | string;
  title?: string;
  name?: string;
  picture?: string;
  thumbnailUrl?: string;
  resource_template_id?: number;
  type?: string;
}

/** Actant (72), Personne (33), Organisation (104), Étudiant (96) */
export const DEFAULT_AUTHOR_TEMPLATE_IDS = [72, 33, 104, 96] as const;

export interface MediaFile {
  id: string;
  file?: File;
  url?: string;
  preview: string;
  type: 'image' | 'video';
  name: string;
  isExisting?: boolean;
}

export interface MediaDropzoneProps {
  value: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  existingMedias?: string[];
  onRemoveExisting?: (index: number) => void;
  youtubeUrls?: string[];
  onYouTubeUrlsChange?: (urls: string[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
  height?: string;
}

const getYouTubeThumbnail = (url: string): string => {
  const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match ? match[1] : null;
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
};

const getYouTubeEmbedUrl = (url: string): string => {
  const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match ? match[1] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
};

const REJECTED_MIME_TYPES = ['image/webp'] as const;
const REJECTED_FILE_EXTENSIONS = ['.webp'] as const;

const MODAL_TAB_CLASS_NAMES = {
  base: 'w-full',
  tabList: 'w-full bg-c2 border-2 border-c3 rounded-xl p-px gap-px',
  cursor: 'w-full bg-action rounded-lg',
  tab: 'flex-1 px-4 py-2 text-c5 data-[selected=true]:text-white justify-center',
  tabContent: 'group-data-[selected=true]:text-white',
};

const generateId = () => `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


const isVideo = (file: File | string): boolean => {
  if (typeof file === 'string') {
    return file.includes('.mov') || file.includes('.mp4') || file.includes('.webm');
  }
  return file.type.startsWith('video/');
};

export const MediaDropzone: React.FC<MediaDropzoneProps> = ({
  value = [],
  onChange,
  existingMedias = [],
  onRemoveExisting,
  youtubeUrls = [],
  onYouTubeUrlsChange,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'video/*'],
  disabled = false,
  className = '',
  height = '450px',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<string>('media');
  const [isDragging, setIsDragging] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaToDelete, setMediaToDelete] = useState<MediaFile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<MediaFile[]>([]);
  const [youtubeDraft, setYoutubeDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allMediaItems: (MediaFile & { isYouTube?: boolean; youtubeUrl?: string })[] = [
    ...existingMedias.map((url, index) => {
      const isYouTubeMedia = isValidYouTubeUrl(url);
      return {
        id: `existing-${index}`,
        url: isYouTubeMedia ? getYouTubeEmbedUrl(url) : url,
        preview: isYouTubeMedia ? getYouTubeThumbnail(url) : url,
        type: (isVideo(url) || isYouTubeMedia ? 'video' : 'image') as 'video' | 'image',
        name: isYouTubeMedia ? `Vidéo YouTube ${index + 1}` : `Média existant ${index + 1}`,
        isExisting: true,
        isYouTube: isYouTubeMedia,
        youtubeUrl: isYouTubeMedia ? url : undefined,
      };
    }),
    ...value.map((file) => ({ ...file, isExisting: false, isYouTube: false })),
    ...youtubeUrls.map((ytUrl, index) => ({
      id: `youtube-${index}`,
      url: getYouTubeEmbedUrl(ytUrl),
      preview: getYouTubeThumbnail(ytUrl),
      type: 'video' as 'video' | 'image',
      name: `Vidéo YouTube ${index + 1}`,
      isExisting: false,
      isYouTube: true,
      youtubeUrl: ytUrl,
    })),
  ];

  const currentMedia = allMediaItems[currentIndex];
  const canAddMore = allMediaItems.length < maxFiles;
  const showYoutubeTab = !!onYouTubeUrlsChange;

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
    setIsDragging(false);
    setIsModalOpen(false);
  };

  const processFiles = useCallback(
    (files: FileList | null, target: 'pending' | 'immediate' = 'pending') => {
      if (!files || disabled) return;

      const newMediaFiles: MediaFile[] = [];
      const rejectedFiles: string[] = [];
      const baseCount = allMediaItems.length + (target === 'pending' ? pendingFiles.length : 0);
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

          newMediaFiles.push({
            id: generateId(),
            file,
            preview: URL.createObjectURL(file),
            type: isVideo(file) ? 'video' : 'image',
            name: file.name,
            isExisting: false,
          });
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
        onChange([...value, ...newMediaFiles]);
      }
    },
    [disabled, allMediaItems.length, pendingFiles.length, maxFiles, onChange, value],
  );

  const handleModalSave = () => {
    if (modalTab === 'youtube') {
      if (!isValidYouTubeUrl(youtubeDraft)) return;
      onYouTubeUrlsChange?.([...youtubeUrls, youtubeDraft]);
      setCurrentIndex(allMediaItems.length);
      closeModal();
      return;
    }

    if (pendingFiles.length > 0) {
      onChange([...value, ...pendingFiles]);
      setCurrentIndex(allMediaItems.length);
      closeModal({ revokePending: false });
      return;
    }
    closeModal();
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.file) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleRemoveClick = (media: MediaFile) => {
    setMediaToDelete(media);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmRemove = () => {
    if (!mediaToDelete) return;

    const mediaWithYoutube = mediaToDelete as MediaFile & { isYouTube?: boolean; youtubeUrl?: string };

    if (mediaWithYoutube.isYouTube) {
      if (onYouTubeUrlsChange && mediaWithYoutube.youtubeUrl) {
        onYouTubeUrlsChange(youtubeUrls.filter((u) => u !== mediaWithYoutube.youtubeUrl));
      }
    } else if (mediaToDelete.isExisting) {
      const existingIndex = existingMedias.findIndex((url) => url === mediaToDelete.url);
      if (existingIndex !== -1 && onRemoveExisting) {
        onRemoveExisting(existingIndex);
      }
    } else {
      const mediaToRemoveFile = value.find((m) => m.id === mediaToDelete.id);
      if (mediaToRemoveFile?.file) {
        URL.revokeObjectURL(mediaToRemoveFile.preview);
      }
      onChange(value.filter((m) => m.id !== mediaToDelete.id));
    }

    if (currentIndex >= allMediaItems.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (allMediaItems.length <= 1) {
      setCurrentIndex(0);
    }

    setIsDeleteModalOpen(false);
    setMediaToDelete(null);
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
        ${isDragging ? 'border-action bg-c3' : 'border-c4/50 hover:border-c4/75 hover:bg-c2'}
      `}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
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

  const renderPendingFileThumbnail = (file: MediaFile) => (
    <div key={file.id} className='group relative w-24 h-16 rounded-lg overflow-hidden border-2 border-c3'>
      {file.type === 'video' ? (
        <video src={file.preview} className='w-full h-full object-cover' />
      ) : (
        <img src={file.preview} alt={file.name} className='w-full h-full object-cover' />
      )}
      <button
        type='button'
        onClick={() => removePendingFile(file.id)}
        aria-label={`Retirer ${file.name}`}
        className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer'>
        <span className='absolute inset-0 bg-black/55' aria-hidden='true' />
        <CrossIcon size={22} className='relative z-10 text-white' />
      </button>
    </div>
  );

  return (
    <div className='flex flex-col gap-2'>
      {/* Zone principale */}
      <div className={`relative rounded-xl overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ height }}>
        {allMediaItems.length > 0 && currentMedia ? (
          <div className={`relative w-full h-full flex flex-col ${className}`}>
            <div className='relative flex-1 min-h-0'>
              {currentMedia.isYouTube ? (
                <iframe
                  src={currentMedia.url}
                  className='w-full h-full rounded-xl'
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                  allowFullScreen
                  title={currentMedia.name}
                />
              ) : currentMedia.type === 'video' ? (
                <video src={currentMedia.url || currentMedia.preview} className='w-full h-full object-cover rounded-xl' controls />
              ) : (
                <img src={currentMedia.url || currentMedia.preview} alt={currentMedia.name} className='w-full h-full object-cover rounded-xl' />
              )}

              {!disabled && (
                <Button
                  isIconOnly
                  size='sm'
                  className='absolute top-3 right-3 bg-c1/80 hover:bg-danger text-c6 hover:text-white z-10 px-4 py-2 w-fit h-fit flex items-center justify-center !gap-2.5 rounded-lg'
                  onPress={() => handleRemoveClick(currentMedia)}>
                  <span>Supprimer</span>
                  <CrossIcon size={14} className='w-3.5 h-3.5' />
                </Button>
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

      {/* Vignettes */}
      <div className='flex w-full justify-start items-center gap-2.5 flex-wrap'>
        {allMediaItems.map((media, index) => (
          <div key={media.id} className='relative'>
            <button
              type='button'
              onClick={() => setCurrentIndex(index)}
              className={`
                flex-shrink-0 w-[136px] h-[70px] rounded-lg overflow-hidden
                transition-all duration-200 cursor-pointer
                ${index === currentIndex ? 'border-2 border-c5' : 'border-2 border-transparent hover:border-c4'}
              `}>
              {media.isYouTube ? (
                <div className='relative w-full h-full'>
                  <img src={media.preview} alt={media.name} className='w-full h-full object-cover' />
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
                    <MovieIcon size={20} className='text-white' />
                  </div>
                </div>
              ) : media.type === 'video' ? (
                <video src={media.url || media.preview} className='w-full h-full object-cover' />
              ) : (
                <img src={media.url || media.preview} alt={media.name} className='w-full h-full object-cover' />
              )}
            </button>
            {media.isYouTube && (
              <span className='absolute bottom-px right-px bg-red-600 text-white text-[8px] px-px rounded z-10'>YT</span>
            )}
          </div>
        ))}

        {!disabled && canAddMore && allMediaItems.length > 0 && (
          <button
            type='button'
            onClick={() => openModal('media')}
            className='flex-shrink-0 w-[136px] h-[70px] rounded-lg border-2 cursor-pointer border-c3 bg-c2 hover:bg-c3 flex items-center justify-center transition-all duration-200'>
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

      {/* Modal d'ajout */}
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
