/**
 * Composants génériques pour les pages de détail simplifiées
 *
 * Ces composants rendent automatiquement les champs basés sur la configuration
 * SimpleDetailConfig, sans avoir à créer de composants React personnalisés.
 */

import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Skeleton, Spinner, Input, Textarea, Slider, Button, Link, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, addToast, cn } from '@heroui/react';
import { DatePicker } from '@heroui/react';
import { parseDate, type DateValue } from '@internationalized/date';
import { Splide, SplideTrack, SplideSlide } from '@splidejs/react-splide';
import { CameraIcon, UserIcon, ShareIcon, MovieIcon, ArrowIcon, PlusIcon, CrossIcon } from '@/components/ui/icons';
import MediaViewer from '@/components/features/conference/MediaViewer';
import { MediaDropzone, MediaFile } from '@/components/features/forms/MediaDropzone';
import { ResourceSelectionModal } from '@/components/features/forms/ResourceSelectionModal';
import { InternalFieldConfig, getOverviewFields, getDetailsFields, getHeaderFields } from './simplifiedConfig';
import { getOmekaValue, getResourceIds } from './simplifiedConfigAdapter';
import { isValidYouTubeUrl, getYouTubeThumbnailUrl } from '@/lib/utils';
import { getResourceConfigByType } from '@/config/resourceConfig';

// ========================================
// Animation variants
// ========================================

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 10 },
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};

// ========================================
// Types
// ========================================

interface ResourceInfo {
  id: number;
  title: string;
  resourceClass?: string;
  thumbnailUrl?: string;
  type?: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  picture?: string;
}

interface SimpleOverviewProps {
  fields: InternalFieldConfig[];
  resourceType: string;
  itemDetails: any;
  resourceCache?: Record<number, ResourceInfo>;
  isEditing?: boolean;
  onMediasChange?: (files: MediaFile[]) => void;
  youtubeUrls?: string[];
  onYouTubeUrlsChange?: (urls: string[]) => void;
  mediaFiles?: MediaFile[];
  type?: string;
  loadingMedia?: boolean;
  removedMediaIndexes?: number[];
  onRemoveExistingMedia?: (index: number) => void;
  currentVideoTime?: number;
  videoSeek?: { time: number; id: number } | null;
}

interface SimpleDetailsProps {
  fields: InternalFieldConfig[];
  resourceType: string;
  itemDetails: any;
  resourceCache?: Record<number, ResourceInfo>;
  isEditing?: boolean;
  onFieldChange?: (property: string, value: any) => void;
  onAddResource?: (property: string) => void;
  onResourcesSelected?: (property: string, resources: any[]) => void;
  onRemoveContributor?: (personId: number) => void;
  contributorTemplateIds?: number[];
  type?: string;
}

// ========================================
// Helper functions
// ========================================

const getPersonRoute = (person: any): string => {
  if (!person?.type) {
    return `/conferencier/${person?.id}`;
  }
  switch (person.type) {
    case 'actant':
    case 'student':
      return `/intervenant/${person.id}`;
    case 'personne':
      return `/personne/${person.id}`;
    default:
      return `/conferencier/${person?.id}`;
  }
};

const getPersonDisplayName = (person: any): string => {
  if (!person) return '';

  // Essayer d'abord le titre ou nom complet (plus fiable)
  if (person.title && person.title.trim()) return person.title;
  if (person.name && person.name.trim()) return person.name;

  // Sinon essayer de construire depuis prénom/nom
  const firstname = person.firstname || person.firstName || '';
  const lastname = person.lastname || person.lastName || '';
  const fullName = `${firstname} ${lastname}`.trim();
  if (fullName) return fullName;

  return 'Nom inconnu';
};

const getPersonPicture = (person: any): string | null => {
  return person?.picture || person?.thumbnailUrl || null;
};

// ========================================
// SimpleOverviewCard
// ========================================

export const SimpleOverviewCard: React.FC<SimpleOverviewProps> = ({
  fields,
  resourceType,
  itemDetails,
  resourceCache: propResourceCache,
  isEditing = false,
  onMediasChange,
  youtubeUrls = [],
  onYouTubeUrlsChange,
  mediaFiles = [],
  type,
  loadingMedia = false,
  removedMediaIndexes = [],
  onRemoveExistingMedia,
  currentVideoTime: _currentVideoTime,
  videoSeek,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);

  // Utiliser resourceCache depuis itemDetails si pas fourni en prop
  const resourceCache = propResourceCache || itemDetails?.resourceCache || {};

  const headerFields = getHeaderFields(fields);
  const overviewFields = getOverviewFields(fields);
  const detailsFields = getDetailsFields(fields);

  // Extraire les données des champs
  const titleField = headerFields.find((f) => f.type === 'title');
  const title = titleField ? getOmekaValue(itemDetails, titleField.property) : itemDetails?.title;

  const mediaField = overviewFields.find((f) => f.type === 'media');
  const rawMedias = mediaField ? getOmekaValue(itemDetails, mediaField.property) || itemDetails?.associatedMedia || [] : itemDetails?.associatedMedia || [];

  // URL field for media fallback (YouTube URLs stored in schema:url etc.)
  const urlFieldForMedia = detailsFields.find((f) => f.type === 'url') || overviewFields.find((f) => f.type === 'url');
  const externalUrl = urlFieldForMedia ? (getOmekaValue(itemDetails, urlFieldForMedia.property) as string) : itemDetails?.fullUrl || itemDetails?.url || '';

  // Normaliser medias pour s'assurer que c'est toujours un tableau
  // Fallback: si pas de médias attachés mais qu'il y a une URL YouTube externe, l'utiliser comme média
  let medias: string[] = Array.isArray(rawMedias) ? rawMedias : typeof rawMedias === 'string' ? [rawMedias] : [];
  if (medias.length === 0 && externalUrl && isValidYouTubeUrl(externalUrl)) {
    medias = [externalUrl];
  }

  const resourceField = overviewFields.find((f) => f.type === 'resource');

  // Vérifier si personnes est déjà au format ResourceInfo[] (depuis formData en mode édition)
  const directPersonnes = itemDetails?.personnes;
  const isAlreadyResolved =
    Array.isArray(directPersonnes) &&
    directPersonnes.length > 0 &&
    typeof directPersonnes[0] === 'object' &&
    directPersonnes[0].id !== undefined &&
    !directPersonnes[0].value_resource_id;

  const rawPersonnes = isAlreadyResolved
    ? directPersonnes
    : resourceField
      ? getResourceIds(itemDetails, resourceField.property)
          .map((id) => resourceCache[id])
          .filter(Boolean)
      : itemDetails?.actants || [];

  // Normaliser personnes pour s'assurer que c'est toujours un tableau
  const personnes: ResourceInfo[] = Array.isArray(rawPersonnes) ? rawPersonnes : [];

  const percentageField = overviewFields.find((f) => f.type === 'percentage' || f.type === 'slider');
  const percentage = percentageField ? Number(getOmekaValue(itemDetails, percentageField.property)) || 0 : itemDetails?.percentage || 0;

  const statusField = overviewFields.find((f) => f.type === 'status');
  const status = statusField ? (getOmekaValue(itemDetails, statusField.property) as string) : itemDetails?.status || '';

  // URL field for "Voir plus" button (from details zone)
  const urlField = detailsFields.find((f) => f.type === 'url');
  const fullUrl = urlField ? (getOmekaValue(itemDetails, urlField.property) as string) : itemDetails?.fullUrl || itemDetails?.url || '';

  const copyToClipboard = () => {
    if (medias && medias[currentMediaIndex]) {
      navigator.clipboard.writeText(medias[currentMediaIndex]);
    }
  };

  const clampedPercentage = Math.max(0, Math.min(100, Math.round(percentage)));
  const totalSegments = 5;
  const segmentSpan = 100 / totalSegments;

  return (
    <motion.div className='w-full flex flex-col gap-[25px]' initial='hidden' animate='visible' variants={containerVariants}>
      {/* Médias */}
      <motion.div variants={itemVariants} className='lg:w-full overflow-hidden relative'>
        {isEditing ? (
          <MediaDropzone
            value={mediaFiles}
            onChange={(files) => onMediasChange?.(files)}
            youtubeUrls={youtubeUrls}
            onYouTubeUrlsChange={onYouTubeUrlsChange}
            height='450px'
            maxFiles={10}
            acceptedTypes={['image/*', 'video/*']}
            existingMedias={medias.filter((_, i) => !removedMediaIndexes.includes(i))}
            onRemoveExisting={(index) => {
              // Trouver l'index original dans le tableau medias non-filtré
              const filteredMedias = medias.filter((_, i) => !removedMediaIndexes.includes(i));
              const originalIndex = medias.indexOf(filteredMedias[index]);
              if (originalIndex !== -1) {
                onRemoveExistingMedia?.(originalIndex);
              }
            }}
            disabled={!isEditing}
            className='w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px]'
          />
        ) : loadingMedia ? (
          <div className='lg:w-[100%] lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] rounded-[12px] bg-c2 border-2 border-c3 flex flex-col items-center justify-center gap-4'>
            <Spinner size='lg' />
            <span className='text-c5'>Chargement des médias...</span>
          </div>
        ) : medias && medias.length > 0 ? (
          <div className='flex flex-col gap-[10px]'>
            <MediaViewer
              src={medias[currentMediaIndex]}
              alt={`Média ${currentMediaIndex + 1}`}
              className='lg:w-[100%] lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] rounded-[12px] overflow-hidden'
              isVideo={medias[currentMediaIndex]?.includes('.mov') || medias[currentMediaIndex]?.includes('.mp4') || isValidYouTubeUrl(medias[currentMediaIndex])}
              seekTo={videoSeek ?? undefined}
            />
            {medias.length > 1 && (
              <Splide
                options={{
                  perPage: 3,
                  gap: '1rem',
                  pagination: false,
                  perMove: 1,
                  speed: 1000,
                  autoWidth: true,
                }}
                hasTrack={false}
                aria-label='Galerie de médias'
                className='flex w-full justify-between items-center gap-[25px]'>
                <SplideTrack className='w-full'>
                  {medias.map((media, index) => {
                    const isYouTube = isValidYouTubeUrl(media);
                    const thumbnailSrc = isYouTube ? getYouTubeThumbnailUrl(media) : media;
                    const isVideoFile = media.includes('.mov') || media.includes('.mp4');

                    return (
                      <SplideSlide key={index}>
                        <div className='relative'>
                          <button
                            onClick={() => setCurrentMediaIndex(index)}
                            className={`flex-shrink-0 w-[136px] h-[70px] rounded-[12px] overflow-hidden transition-all duration-200 ${
                              index === currentMediaIndex ? 'border-2 border-c6' : 'border-2 border-transparent hover:border-gray-300'
                            }`}>
                            {isVideoFile ? (
                              <video src={media} className='w-full h-full object-cover' />
                            ) : isYouTube ? (
                              <div className='relative w-full h-full'>
                                <img src={thumbnailSrc} alt={`Miniature ${index + 1}`} className='w-full h-full object-cover' />
                                <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
                                  <MovieIcon size={20} className='text-white' />
                                </div>
                              </div>
                            ) : (
                              <img src={media} alt={`Miniature ${index + 1}`} className='w-full h-full object-cover' />
                            )}
                          </button>
                          {isYouTube && <span className='absolute bottom-1 right-1 bg-red-600 text-white text-[8px] px-1 rounded z-10'>YT</span>}
                        </div>
                      </SplideSlide>
                    );
                  })}
                </SplideTrack>
                <div className='flex justify-between items-center'>
                  <div className='splide__arrows relative flex gap-[10px]'>
                    <Button
                      size='sm'
                      className='p-0 min-w-[32px] min-h-[32px] text-selected bg-action splide__arrow transform translate-y-0 splide__arrow--prev relative left-0 focus:outline-none'>
                      <ArrowIcon size={20} transform='rotate(180deg)' />
                    </Button>
                    <Button
                      size='sm'
                      className='p-0 min-w-[32px] min-h-[32px] text-selected bg-action splide__arrow transform translate-y-0 splide__arrow--next relative right-0 focus:outline-none'>
                      <ArrowIcon size={20} />
                    </Button>
                  </div>
                </div>
              </Splide>
            )}
          </div>
        ) : (
          <UnloadedCard />
        )}
      </motion.div>

      {/* Titre et métadonnées - Affiché uniquement en mode lecture */}
      {!isEditing && (
        <motion.div variants={itemVariants} className='w-full flex flex-col gap-[25px]'>
          {/* Conteneur principal du titre avec flexbox pour alignement horizontal */}
          <div className='flex items-center gap-[15px]'>
            <h1 className='font-medium text-c6 text-[24px]'>{title}</h1>
            {/* Badge affichant le type de ressource si disponible */}
            {(type || resourceType) && (
              <span className='text-[14px] text-c5 px-[10px] py-[5px] bg-c2 rounded-[8px] border border-c3 whitespace-nowrap'>
                {getResourceConfigByType(type || resourceType)?.label || type || resourceType}
              </span>
            )}
          </div>

          {/* Personnes/Actants */}
          <div className='w-full flex flex-col gap-[10px]'>
            <div className='w-full flex justify-between gap-[10px] items-center'>
              <div className='w-fit flex flex-wrap justify-start gap-[10px] items-center'>
                {Array.isArray(personnes) && personnes.length > 0 && personnes[0]?.id != null && (
                  <Link href={getPersonRoute(personnes[0])} className='w-fit flex justify-start gap-[10px] items-center'>
                    {getPersonPicture(personnes[0]) ? (
                      <img src={getPersonPicture(personnes[0]) ?? ''} alt='Avatar' className='w-9 h-9 rounded-[7px] object-cover' />
                    ) : (
                      <UserIcon size={22} className='text-default-500' />
                    )}
                    <div className='flex flex-col items-start gap-0.5'>
                      <h3 className='text-c6 font-medium text-[16px]'>{getPersonDisplayName(personnes[0])}</h3>
                    </div>
                  </Link>
                )}

                {Array.isArray(personnes) && personnes.length > 1 && (
                  <Dropdown>
                    <DropdownTrigger className='p-0'>
                      <Button size='sm' className='text-[14px] h-auto min-h-0 min-w-0 px-3 py-1.5 rounded-[8px] text-c6 gap-1 border-2 border-c6 bg-c1 hover:bg-c2'>
                        <h3 className='text-c6 font-medium text-[14px]'>+ {personnes.length - 1}</h3>
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label='Autres contributeurs' className='p-[10px] bg-c2 rounded-[12px]'>
                      {personnes.slice(1).map((person, index) => (
                        <DropdownItem key={person.id || `person-${index}`} className='p-0' href={getPersonRoute(person)}>
                          <div className='flex items-center gap-[15px] w-full px-[15px] py-[10px] rounded-[8px] hover:bg-c3 text-c6'>
                            {getPersonPicture(person) ? (
                              <img src={getPersonPicture(person) ?? ''} alt='Avatar' className='w-9 h-9 rounded-[7px] object-cover' />
                            ) : (
                              <UserIcon size={22} className='text-default-500' />
                            )}
                            <span className='text-[16px]'>{getPersonDisplayName(person)}</span>
                          </div>
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                )}
              </div>

              {/* Boutons d'action */}
              <div className='w-fit flex justify-between gap-[10px] items-center'>
                <Button
                  size='md'
                  className='text-[16px] h-auto px-[10px] py-[5px] rounded-[8px] text-c6 gap-2 bg-c2 hover:bg-c3'
                  onPress={() => {
                    copyToClipboard();
                    addToast({
                      title: 'Lien copié',
                      classNames: { base: cn(['text-c6', 'mb-4']) },
                    });
                  }}>
                  <ShareIcon size={12} />
                  Partager
                </Button>
                {fullUrl && (
                  <Button
                    as={Link}
                    href={fullUrl}
                    isExternal
                    size='md'
                    className='text-[16px] h-auto px-[10px] py-[5px] rounded-[8px] text-c6 gap-2 bg-c2 hover:bg-c3'>
                    Voir plus
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Barre de progression - Affiché uniquement en mode lecture */}
      {!isEditing && percentage > 0 && (
        <motion.div variants={itemVariants} className='w-full flex justify-between items-center flex-row gap-[20px]'>
          <div className='w-full'>
            <div className='grid grid-cols-5 gap-2'>
              {Array.from({ length: totalSegments }).map((_, index) => {
                const segmentStart = index * segmentSpan;
                const segmentEnd = (index + 1) * segmentSpan;
                const segmentProgress = Math.max(0, Math.min(1, (clampedPercentage - segmentStart) / (segmentEnd - segmentStart)));
                return (
                  <div key={index} className='w-full h-2 bg-c3 rounded-[8px] overflow-hidden'>
                    <div className='h-full bg-action rounded-[8px]' style={{ width: `${segmentProgress * 100}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className='flex flex-row justify-end items-center gap-[10px]'>
            {status && <span className='text-c6 font-medium text-[16px] whitespace-nowrap'>{status}</span>}
            <span className='text-c6 font-medium text-[16px] whitespace-nowrap'>{clampedPercentage}%</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ========================================
// SimpleDetailsCard
// Combine le titre, les métadonnées et les détails en un seul bloc unifié (mode édition)
// ========================================

export const SimpleDetailsCard: React.FC<SimpleDetailsProps> = ({
  fields,
  resourceType,
  itemDetails,
  resourceCache: propResourceCache,
  isEditing = false,
  onFieldChange,
  onAddResource,
  onResourcesSelected,
  onRemoveContributor,
  contributorTemplateIds = [96, 72],
  type,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [isContributorModalOpen, setIsContributorModalOpen] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number | null>(null);

  // Utiliser resourceCache depuis itemDetails si pas fourni en prop
  const resourceCache = propResourceCache || itemDetails?.resourceCache || {};

  const headerFields = getHeaderFields(fields);
  const overviewFields = getOverviewFields(fields);
  const detailsFields = getDetailsFields(fields);

  // === Champs du header ===
  const titleField = headerFields.find((f) => f.type === 'title');
  const title = titleField ? getOmekaValue(itemDetails, titleField.property) : itemDetails?.title;

  // === Champs de l'overview (personnes/contributeurs) ===
  const overviewResourceField = overviewFields.find((f) => f.type === 'resource');

  // Vérifier si personnes est déjà au format ResourceInfo[] (depuis formData en mode édition)
  const directPersonnes = itemDetails?.personnes;
  const isAlreadyResolved =
    Array.isArray(directPersonnes) &&
    directPersonnes.length > 0 &&
    typeof directPersonnes[0] === 'object' &&
    directPersonnes[0].id !== undefined &&
    !directPersonnes[0].value_resource_id;

  const rawPersonnes = isAlreadyResolved
    ? directPersonnes
    : overviewResourceField
      ? getResourceIds(itemDetails, overviewResourceField.property)
          .map((id) => resourceCache[id])
          .filter(Boolean)
      : itemDetails?.actants || [];

  const personnes: ResourceInfo[] = Array.isArray(rawPersonnes) ? rawPersonnes : [];

  const overviewPercentageField = overviewFields.find((f) => f.type === 'percentage' || f.type === 'slider');
  const overviewPercentage = overviewPercentageField ? Number(getOmekaValue(itemDetails, overviewPercentageField.property)) || 0 : itemDetails?.percentage || 0;

  // === Champs des détails ===
  const dateField = detailsFields.find((f) => f.type === 'date');
  const date = dateField ? (getOmekaValue(itemDetails, dateField.property) as string) : itemDetails?.date;

  const descriptionField = detailsFields.find((f) => f.type === 'textarea');
  // Combine all textarea fields (purpose, application, description, etc.) into a single description
  const allTextareaFields = detailsFields.filter((f) => f.type === 'textarea');
  const description = allTextareaFields.length > 1
    ? allTextareaFields
        .map((f) => {
          const val = getOmekaValue(itemDetails, f.property) as string;
          if (!val) return '';
          return f.label ? `<strong>${f.label}:</strong> ${val}` : val;
        })
        .filter(Boolean)
        .join('<br><br>')
    : descriptionField ? (getOmekaValue(itemDetails, descriptionField.property) as string) : itemDetails?.description;

  const detailsPercentageField = detailsFields.find((f) => f.type === 'slider' || f.type === 'percentage');
  // Utiliser le pourcentage de l'overview si pas de champ spécifique dans details
  const percentage = detailsPercentageField ? Number(getOmekaValue(itemDetails, detailsPercentageField.property)) || 0 : overviewPercentage;
  const percentageField = detailsPercentageField || overviewPercentageField;

  const detailsResourceField = detailsFields.find((f) => f.type === 'resource');
  const rawActants = detailsResourceField
    ? getResourceIds(itemDetails, detailsResourceField.property)
        .map((id) => resourceCache[id])
        .filter(Boolean)
    : itemDetails?.actants || [];

  // Normaliser actants pour s'assurer que c'est toujours un tableau
  const actants: ResourceInfo[] = Array.isArray(rawActants) ? rawActants : [];

  const urlField = detailsFields.find((f) => f.type === 'url');
  const fullUrl = urlField ? (getOmekaValue(itemDetails, urlField.property) as string) : itemDetails?.url || '';

  // Parse date for DatePicker
  const parsedDate: DateValue | null = date
    ? (() => {
        try {
          const d = new Date(date);
          if (!isNaN(d.getTime())) {
            return parseDate(d.toISOString().split('T')[0]) as DateValue;
          }
          return null;
        } catch {
          return null;
        }
      })()
    : null;

  const toggleExpansion = () => {
    if (!isEditing) {
      setExpanded(!expanded);
    }
  };

  const hasContent = isEditing || date || description || (actants && actants.length > 0);
  if (!hasContent && !isEditing) return null;

  if (isEditing) {
    return (
      <motion.div className='w-full flex flex-col gap-[25px]' initial='hidden' animate='visible' variants={containerVariants}>
        <motion.div variants={itemVariants} className='flex flex-col bg-c2 p-[25px] rounded-[12px] gap-[20px]'>
          {/* === Section Titre === */}
          {titleField && (
            <div className='flex flex-col gap-2'>
              <label className='text-[14px] text-c5 font-medium'>{titleField.label || 'Titre'}</label>
              <div className='flex items-center gap-[15px]'>
                <Textarea
                  value={String(title || '')}
                  onChange={(e) => onFieldChange?.(titleField.property, e.target.value)}
                  placeholder={titleField.placeholder || 'Titre'}
                  classNames={{
                    inputWrapper: 'bg-c1 border border-c3 rounded-[8px]',
                    input: 'text-c6 !text-[20px] font-medium',
                  }}
                  minRows={1}
                  size='lg'
                />
                {/* Badge de type */}
                {(type || resourceType) && <span className='text-[14px] text-c5 px-[10px] py-[5px] bg-c3 rounded-[8px] border border-c3 whitespace-nowrap'>{type || resourceType}</span>}
              </div>
            </div>
          )}

          {/* === Section Contributeurs/Personnes === */}
          {overviewResourceField && (
            <div className='flex flex-col gap-2'>
              <label className='text-[14px] text-c5 font-medium'>{overviewResourceField.label || 'Contributeurs'}</label>
              <div className='flex flex-wrap gap-2 items-center'>
                {personnes.map((person, index) => (
                  <span key={person.id || index} className='flex items-center gap-2 px-3 min-h-[60px] py-1.5 bg-c3 text-c6 rounded-[8px] text-[14px]'>
                    {getPersonPicture(person) && <img src={getPersonPicture(person) ?? ''} alt='Avatar' className='w-6 h-6 rounded-full object-cover' />}
                    {getPersonDisplayName(person)}
                    {/* Bouton de suppression */}
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        if (person.id && onRemoveContributor) {
                          onRemoveContributor(person.id);
                        }
                      }}
                      className='ml-1 p-0.5 hover:bg-red-500/20 rounded-full transition-colors'>
                      <CrossIcon size={12} className='text-c4 hover:text-red-500' />
                    </button>
                  </span>
                ))}
                <button
                  type='button'
                  onClick={() => setIsContributorModalOpen(true)}
                  className='px-4 py-2 border-2 border-dashed border-c4 rounded-[12px] text-c5 text-[14px] hover:border-action hover:bg-c2 transition-all duration-200'>
                  Ajouter un contributeur
                </button>
              </div>
            </div>
          )}

          {/* === Section Date === */}
          {dateField && (
            <div className='flex flex-col gap-2'>
              <label className='text-[14px] text-c5 font-medium'>{dateField.label}</label>
              <DatePicker
                aria-label={dateField.label}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value={parsedDate as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(value: any) => onFieldChange?.(dateField.property, value ? value.toString() : null)}
                classNames={{
                  base: 'w-full',
                  inputWrapper: 'bg-c1 border border-c3 rounded-[8px]',
                  input: 'text-c6',
                }}
              />
            </div>
          )}

          {/* === Section Description === */}
          {descriptionField && (
            <div className='flex flex-col gap-2'>
              <label className='text-[14px] text-c5 font-medium'>{descriptionField.label}</label>
              <Textarea
                aria-label={descriptionField.label}
                value={String(description || '')}
                onValueChange={(value) => onFieldChange?.(descriptionField.property, value)}
                placeholder={descriptionField.placeholder || 'Description...'}
                minRows={4}
                classNames={{
                  inputWrapper: 'bg-c1 border border-c3 rounded-[8px]',
                  input: 'text-c6 text-[16px]',
                }}
              />
            </div>
          )}

          {/* === Section Slider d'avancement === */}
          {percentageField && (
            <div className='flex flex-col gap-2'>
              <div className='flex justify-between items-center'>
                <label className='text-[14px] text-c5 font-medium'>{percentageField.label}</label>
                <span className='text-[14px] text-c6 font-semibold'>{sliderValue ?? percentage}%</span>
              </div>
              <Slider
                aria-label={percentageField.label}
                size='md'
                step={percentageField.step || 5}
                minValue={percentageField.min || 0}
                maxValue={percentageField.max || 100}
                value={sliderValue ?? percentage}
                onChange={(value) => setSliderValue(value as number)}
                onChangeEnd={(value) => {
                  setSliderValue(value as number);
                  onFieldChange?.(percentageField.property, value as number);
                }}
                classNames={{
                  track: 'bg-c3',
                  filler: 'bg-action',
                  thumb: 'bg-action',
                }}
              />
            </div>
          )}

          {/* === Section Actants supplémentaires (details) === */}
          {detailsResourceField && (
            <div className='flex flex-col gap-2'>
              <label className='text-[14px] text-c5 font-medium'>{detailsResourceField.label}</label>
              <div className='flex flex-wrap gap-2 items-center'>
                {actants.map((actant, index) => (
                  <span key={actant.id || index} className='px-3 py-1 bg-c3 text-c6 rounded-[8px] text-[14px]'>
                    {getPersonDisplayName(actant)}
                  </span>
                ))}
                <Button
                  size='sm'
                  isIconOnly
                  className='bg-c3 text-c6 hover:bg-action hover:text-selected rounded-full'
                  onPress={() => onAddResource?.(detailsResourceField.property)}>
                  <PlusIcon size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* === Autres champs texte === */}
          {detailsFields
            .filter((f) => f.type === 'text' && f !== dateField && f !== descriptionField)
            .map((field) => (
              <div key={field.property} className='flex flex-col gap-2'>
                <label className='text-[14px] text-c5 font-medium'>{field.label}</label>
                <Input
                  value={String(getOmekaValue(itemDetails, field.property) || '')}
                  onChange={(e) => onFieldChange?.(field.property, e.target.value)}
                  placeholder={field.placeholder}
                  classNames={{
                    inputWrapper: 'bg-c1 border border-c3 rounded-[8px]',
                    input: 'text-c6',
                  }}
                />
              </div>
            ))}

          {/* === Section URL externe === */}
          {urlField && (
            <div className='flex flex-col gap-2'>
              <label className='text-[14px] text-c5 font-medium'>{urlField.label}</label>
              <Input
                value={String(fullUrl || '')}
                onChange={(e) => onFieldChange?.(urlField.property, e.target.value)}
                placeholder={urlField.placeholder || 'Lien externe'}
                classNames={{
                  inputWrapper: 'bg-c1 border border-c3 rounded-[8px]',
                  input: 'text-c6',
                }}
                startContent={<MovieIcon size={14} className='text-c5' />}
              />
            </div>
          )}
        </motion.div>

        {/* Modal de sélection des contributeurs */}
        {overviewResourceField && (
          <ResourceSelectionModal
            isOpen={isContributorModalOpen}
            onClose={() => setIsContributorModalOpen(false)}
            onSelect={(selectedResources) => {
              if (onResourcesSelected && overviewResourceField) {
                onResourcesSelected(overviewResourceField.property, selectedResources);
              }
              setIsContributorModalOpen(false);
            }}
            title='Sélectionner des contributeurs'
            resourceTemplateIds={contributorTemplateIds}
            excludeIds={personnes.map((p) => p.id).filter(Boolean)}
            multiSelect={true}
          />
        )}
      </motion.div>
    );
  }

  // Mode affichage
  return (
    <motion.div className='w-full flex flex-col gap-[25px]' initial='hidden' animate='visible' variants={containerVariants}>
      <motion.div
        variants={itemVariants}
        className='cursor-pointer flex flex-col bg-c2 hover:bg-c3 p-[25px] rounded-[8px] gap-[10px] transition-all ease-in-out duration-200'
        onClick={toggleExpansion}>
        {date && <h3 className='text-[16px] text-c5 font-medium'>{date}</h3>}
        {description && (
          <div
            className={`text-[16px] text-c4 font-extralight transition-all ease-in-out duration-200 gap-[10px] ${expanded ? '' : 'line-clamp-4'}`}
            style={{ lineHeight: '120%' }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
        {actants && actants.length > 0 && <p className='text-[14px] text-end text-c4 italic'>Ajouté par : {actants.map((a) => getPersonDisplayName(a)).join(', ')}</p>}
        {description && (
          <p className='text-[16px] text-c5 font-semibold transition-all ease-in-out duration-200'>
            {expanded ? 'affichez moins' : '...affichez plus'}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

// ========================================
// Skeletons
// ========================================

export const SimpleOverviewSkeleton: React.FC = () => (
  <div className='flex flex-col gap-[20px]'>
    <Skeleton className='rounded-[14px] lg:w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px]' />
    <div className='flex flex-col gap-[20px]'>
      <div className='flex flex-col gap-[5px]'>
        <Skeleton className='w-[100%] h-6 rounded-[8px]' />
        <Skeleton className='w-[80%] h-6 rounded-[8px]' />
      </div>
      <div className='flex justify-between items-center'>
        <Skeleton className='w-[50%] h-4 rounded-[8px]' />
        <Skeleton className='w-[30%] h-4 rounded-[8px]' />
      </div>
    </div>
  </div>
);


export const SimpleDetailsSkeleton: React.FC = () => (
  <div className='flex w-full p-[20px] bg-c3 rounded-[14px]'>
    <div className='flex w-full flex-col gap-[10px]'>
      <Skeleton className='w-[35%] h-4 rounded-[8px]' />
      <div className='flex flex-col gap-[5px]'>
        <Skeleton className='w-[100%] h-4 rounded-[8px]' />
        <Skeleton className='w-[100%] h-4 rounded-[8px]' />
        <Skeleton className='w-[100%] h-4 rounded-[8px]' />
      </div>
      <Skeleton className='w-[20%] h-4 rounded-[8px]' />
    </div>
  </div>
);

// ========================================
// UnloadedCard
// ========================================

export const UnloadedCard: React.FC = () => (
  <div className='lg:w-[100%] lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] flex flex-col items-center justify-center p-[20px] bg-c3 rounded-[14px] gap-[20px]'>
    <CameraIcon size={42} className='text-c4' />
    <div className='w-[80%] flex flex-col justify-center items-center gap-[10px]'>
      <h2 className='text-c5 text-[32px] font-semibold'>Oups !</h2>
      <p className='w-[400px] text-c5 text-[16px] text-regular text-center'>Aucun média n'est lié à ce contenu. Veuillez vérifier plus tard ou explorer d'autres sections.</p>
    </div>
  </div>
);
