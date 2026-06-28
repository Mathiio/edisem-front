/**
 * Composants génériques pour les pages de détail simplifiées
 *
 * Ces composants rendent automatiquement les champs basés sur la configuration
 * SimpleDetailConfig, sans avoir à créer de composants React personnalisés.
 */

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Spinner, Input, Textarea, Slider, Button, Link, cn } from '@heroui/react';
import { addToast } from '@/theme/components';
import { FormAutoResizeTextareaInput, FormDateInput } from '@/components/features/forms/FormFields';
import { formatFlexibleDateDisplay } from '@/lib/flexibleDate';
import { Splide, SplideTrack, SplideSlide } from '@splidejs/react-splide';
import { carouselArrowButtonClass } from '@/components/ui/Carrousels';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { UserIcon, ShareIcon, MovieIcon, ArrowIcon, AddIcon } from '@/components/ui/icons';
import MediaViewer from '@/components/features/conference/MediaViewer';
import { MediaDropzone, MediaFile } from '@/components/features/forms/MediaDropzone';
import { InternalFieldConfig, getOverviewFields, getDetailsFields, getHeaderFields, VocabGroupField } from './simplifiedConfig';
import { fetchCustomVocabTerms } from '@/utils/customVocab';
import { getOmekaValue, getResourceIds } from './simplifiedConfigAdapter';
import { isValidYouTubeUrl, getYouTubeThumbnailUrl } from '@/lib/utils';
import { getFormOnlyExternalUrl } from '@/lib/resourceUtils';
import { isFormOnlyResourceType } from '@/config/resourceConfig';
import { Select, SelectItem } from '@/theme/components/select';
import {
  Dropdown as ThemeDropdown,
  DropdownTrigger as ThemeDropdownTrigger,
  DropdownMenu as ThemeDropdownMenu,
  DropdownItem as ThemeDropdownItem,
  dropdownContentClassNames,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
  dropdownTriggerButtonClass,
} from '@/theme/components/dropdown';

const fieldLabelClass = 'text-sm text-c5 font-medium';
const inputWrapperClass = 'bg-c1 border-2 border-c3 rounded-lg';

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
  /** Propriétés Omeka des contributeurs (ex. depuis contributorButtons) pour le mode lecture */
  contributorProperties?: string[];
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
  mediaUploadMode?: 'gallery' | 'photo' | 'none';
}

interface SimpleDetailsProps {
  fields: InternalFieldConfig[];
  resourceType: string;
  itemDetails: any;
  resourceCache?: Record<number, ResourceInfo>;
  isEditing?: boolean;
  onFieldChange?: (property: string, value: any) => void;
  onAddResource?: (property: string) => void;
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

const getPersonLinkHref = (person: any): string | null => {
  if (isFormOnlyResourceType(person?.type)) {
    return getFormOnlyExternalUrl(person);
  }
  if (!person?.id) return null;
  return getPersonRoute(person);
};

const PersonLink: React.FC<{ person: any; className?: string; children: React.ReactNode }> = ({ person, className, children }) => {
  const href = getPersonLinkHref(person);
  if (!href) {
    return <div className={className}>{children}</div>;
  }
  if (href.startsWith('http')) {
    return (
      <Link href={href} isExternal underline='none' className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
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

const resolveContributorPersonnes = (
  itemDetails: any,
  resourceCache: Record<number, ResourceInfo>,
  contributorProperties?: string[],
  resourceField?: InternalFieldConfig,
  directPersonnes?: any,
): ResourceInfo[] => {
  const isAlreadyResolved =
    Array.isArray(directPersonnes) &&
    directPersonnes.length > 0 &&
    typeof directPersonnes[0] === 'object' &&
    directPersonnes[0].id !== undefined &&
    !directPersonnes[0].value_resource_id;

  if (isAlreadyResolved) {
    return directPersonnes as ResourceInfo[];
  }

  const seen = new Set<number>();
  const result: ResourceInfo[] = [];

  const addFromProperty = (property: string) => {
    getResourceIds(itemDetails, property).forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      const cached = resourceCache[id];
      if (cached) result.push(cached);
    });
  };

  if (contributorProperties?.length) {
    contributorProperties.forEach(addFromProperty);
    if (result.length > 0) return result;
  }

  if (resourceField) {
    addFromProperty(resourceField.property);
    if (result.length > 0) return result;
  }

  const actants = itemDetails?.actants;
  if (Array.isArray(actants) && actants.length > 0) {
    return actants as ResourceInfo[];
  }

  return result;
};

// ========================================
// SimpleOverviewCard
// ========================================

export const SimpleOverviewCard: React.FC<SimpleOverviewProps> = ({
  fields,
  itemDetails,
  resourceCache: propResourceCache,
  contributorProperties,
  isEditing = false,
  onMediasChange,
  youtubeUrls = [],
  onYouTubeUrlsChange,
  mediaFiles = [],
  loadingMedia = false,
  removedMediaIndexes = [],
  onRemoveExistingMedia,
  currentVideoTime: _currentVideoTime,
  videoSeek,
  mediaUploadMode = 'gallery',
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
  const isPhotoMode = mediaUploadMode === 'photo';
  const isGalleryMode = mediaUploadMode === 'gallery';

  const personnes: ResourceInfo[] = resolveContributorPersonnes(
    itemDetails,
    resourceCache,
    contributorProperties,
    resourceField,
    itemDetails?.personnes,
  );

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
    <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
      {/* Médias */}
      {!(isEditing && mediaUploadMode === 'none') && (
      <motion.div variants={itemVariants} className='lg:w-full overflow-hidden relative'>
        {isEditing ? (
          <div className='flex flex-col gap-2'>
            {isPhotoMode && <label className='text-sm text-c5 font-medium'>Photo</label>}
            <MediaDropzone
              value={mediaFiles}
              onChange={(files) => onMediasChange?.(files)}
              youtubeUrls={isGalleryMode ? youtubeUrls : []}
              onYouTubeUrlsChange={isGalleryMode ? onYouTubeUrlsChange : undefined}
              height={isPhotoMode ? '220px' : '450px'}
              maxFiles={isPhotoMode ? 1 : 10}
              acceptedTypes={isPhotoMode ? ['image/*'] : ['image/*', 'video/*']}
              existingMedias={medias.filter((_, i) => !removedMediaIndexes.includes(i))}
              onRemoveExisting={(index) => {
                const filteredMedias = medias.filter((_, i) => !removedMediaIndexes.includes(i));
                const originalIndex = medias.indexOf(filteredMedias[index]);
                if (originalIndex !== -1) {
                  onRemoveExistingMedia?.(originalIndex);
                }
              }}
              disabled={!isEditing}
              className={
                isPhotoMode
                  ? 'w-full h-[220px]'
                  : 'w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px]'
              }
            />
          </div>
        ) : loadingMedia ? (
          <div className='lg:w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] rounded-xl bg-c2 border-2 border-c3 flex flex-col items-center justify-center gap-4'>
            <Spinner size='lg' />
            <span className='text-c5'>Chargement des médias...</span>
          </div>
        ) : medias && medias.length > 0 ? (
          <div className='flex flex-col gap-2.5'>
            <MediaViewer
              src={medias[currentMediaIndex]}
              alt={`Média ${currentMediaIndex + 1}`}
              className='lg:w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] rounded-xl overflow-hidden'
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
                className='flex w-full justify-between items-center gap-6'>
                <SplideTrack className='w-full'>
                  {medias.map((media, index) => {
                    const isYouTube = isValidYouTubeUrl(media);
                    const thumbnailSrc = isYouTube ? getYouTubeThumbnailUrl(media) : media;
                    const isVideoFile = media.includes('.mov') || media.includes('.mp4');

                    return (
                      <SplideSlide key={index}>
                        <button
                          onClick={() => setCurrentMediaIndex(index)}
                          className={`flex-shrink-0 w-[136px] h-[70px] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                            index === currentMediaIndex ? 'border-2 border-c5' : 'border-2 border-transparent hover:border-c3'
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
                      </SplideSlide>
                    );
                  })}
                </SplideTrack>
                <div className='flex justify-between items-center'>
                  <div className='splide__arrows relative flex gap-2.5'>
                    <Button
                      isIconOnly
                      className={`${carouselArrowButtonClass} splide__arrow--prev`}
                      aria-label='Média précédent'>
                      <ArrowIcon transform='rotate(180deg)' />
                    </Button>
                    <Button
                      isIconOnly
                      className={`${carouselArrowButtonClass} splide__arrow--next`}
                      aria-label='Média suivant'>
                      <ArrowIcon />
                    </Button>
                  </div>
                </div>
              </Splide>
            )}
          </div>
        ) : (
          <EmptyStateCard
            variant='media'
            icon='thumbnail'
            message="Aucune Image ou Vidéo n'est liée à ce contenu."
            className='rounded-2xl gap-4'
          />
        )}
      </motion.div>
      )}

      {/* Titre et métadonnées - Affiché uniquement en mode lecture */}
      {!isEditing && (
        <motion.div variants={itemVariants} className='w-full flex flex-col gap-6'>
          {/* Conteneur principal du titre avec flexbox pour alignement horizontal */}
          <div className='flex items-center gap-4'>
            <h1 className='font-medium text-c6 text-2xl'>{title}</h1>
          </div>

          {/* Personnes/Actants */}
          <div className='w-full flex flex-col gap-2.5'>
            <div className='w-full flex justify-between gap-2.5 items-center'>
              <div className='w-fit flex flex-wrap justify-start gap-2.5 items-center'>
                {Array.isArray(personnes) && personnes.length > 0 && personnes[0]?.id != null && (
                  <PersonLink person={personnes[0]} className='w-fit flex justify-start gap-2.5 items-center'>
                    {getPersonPicture(personnes[0]) ? (
                      <img src={getPersonPicture(personnes[0]) ?? ''} alt='Avatar' className='w-9 h-9 rounded-lg object-cover' />
                    ) : (
                      <UserIcon size={22} className='text-default-500' />
                    )}
                    <div className='flex flex-col items-start gap-0.5'>
                      <h3 className='text-c6 font-medium text-base'>{getPersonDisplayName(personnes[0])}</h3>
                    </div>
                  </PersonLink>
                )}

                {Array.isArray(personnes) && personnes.length > 1 && (
                  <ThemeDropdown classNames={dropdownContentClassNames}>
                    <ThemeDropdownTrigger className='p-0'>
                      <Button size='sm' className='text-sm h-auto min-h-0 min-w-0 px-3 py-1.5 rounded-lg text-c6 gap-1 border-2 border-c3 bg-c2 hover:bg-c3'>
                        <span className='text-c6 font-medium text-sm'>+ {personnes.length - 1}</span>
                      </Button>
                    </ThemeDropdownTrigger>
                    <ThemeDropdownMenu aria-label='Autres contributeurs' className='p-2' classNames={dropdownMenuClassNames}>
                      {personnes.slice(1).map((person, index) => {
                        const personHref = getPersonLinkHref(person);
                        return (
                          <ThemeDropdownItem
                            key={person.id || `person-${index}`}
                            className={dropdownMenuItemClass}
                            href={personHref?.startsWith('http') ? personHref : personHref || undefined}>
                            <div className={`flex items-center gap-4 w-full ${dropdownItemInnerPadding} rounded-lg hover:bg-c3 text-c6`}>
                              {getPersonPicture(person) ? (
                                <img src={getPersonPicture(person) ?? ''} alt='Avatar' className='w-9 h-9 rounded-lg object-cover' />
                              ) : (
                                <UserIcon size={18} className='text-c4' />
                              )}
                              <span className='text-base'>{getPersonDisplayName(person)}</span>
                            </div>
                          </ThemeDropdownItem>
                        );
                      })}
                    </ThemeDropdownMenu>
                  </ThemeDropdown>
                )}
              </div>

              {/* Boutons d'action */}
              <div className='w-fit flex justify-between gap-2.5 items-center'>
                <button
                  type='button'
                  className={dropdownTriggerButtonClass}
                  onClick={() => {
                    copyToClipboard();
                    addToast({
                      title: 'Lien copié',
                      classNames: { base: cn(['text-c6', 'mb-4']) },
                    });
                  }}>
                  <ShareIcon size={14} className='text-c4 shrink-0' />
                  <span>Partager</span>
                </button>
                {fullUrl && (
                  <Link href={fullUrl} isExternal underline='none' className={dropdownTriggerButtonClass}>
                    <span>Voir plus</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Barre de progression - Affiché uniquement en mode lecture */}
      {!isEditing && percentage > 0 && (
        <motion.div variants={itemVariants} className='w-full flex justify-between items-center flex-row gap-5'>
          <div className='w-full'>
            <div className='grid grid-cols-5 gap-2'>
              {Array.from({ length: totalSegments }).map((_, index) => {
                const segmentStart = index * segmentSpan;
                const segmentEnd = (index + 1) * segmentSpan;
                const segmentProgress = Math.max(0, Math.min(1, (clampedPercentage - segmentStart) / (segmentEnd - segmentStart)));
                return (
                  <div key={index} className='w-full h-2 bg-c3 rounded-lg overflow-hidden'>
                    <div className='h-full bg-action rounded-lg' style={{ width: `${segmentProgress * 100}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className='flex flex-row justify-end items-center gap-2.5'>
            {status && <span className='text-c6 font-medium text-base whitespace-nowrap'>{status}</span>}
            <span className='text-c6 font-medium text-base whitespace-nowrap'>{clampedPercentage}%</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ========================================
// ItemSetSelect
// Sélecteur dropdown peuplé depuis un item set Omeka S
// ========================================

const ItemSetSelect: React.FC<{
  itemSetId: number;
  selectedId?: number;
  label: string;
  onChange: (id: number, title: string) => void;
}> = ({ itemSetId, selectedId, label, onChange }) => {
  const [items, setItems] = useState<{ id: number; title: string }[]>([]);

  useEffect(() => {
    fetch(`/omk/api/items?item_set_id=${itemSetId}&per_page=100`)
      .then((r) => r.json())
      .then((data) =>
        setItems(
          data.map((item: any) => ({
            id: item['o:id'],
            title: item['o:title'] ?? `Item ${item['o:id']}`,
          }))
        )
      )
      .catch(console.error);
  }, [itemSetId]);

  return (
    <div className='flex flex-col gap-2'>
      <label className={fieldLabelClass}>{label}</label>
      <Select
        aria-label={label}
        selectedKeys={selectedId ? new Set([String(selectedId)]) : new Set()}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0] as string;
          const found = items.find((i) => String(i.id) === key);
          if (found) onChange(found.id, found.title);
        }}
        placeholder='Sélectionner...'>
        {items.map((item) => (
          <SelectItem key={String(item.id)} textValue={item.title}>{item.title}</SelectItem>
        ))}
      </Select>
    </div>
  );
};

// ========================================
// SimpleDetailsCard
// Combine le titre, les métadonnées et les détails en un seul bloc unifié (mode édition)
// ========================================

export const SimpleDetailsCard: React.FC<SimpleDetailsProps> = ({
  fields,
  itemDetails,
  resourceCache: propResourceCache,
  isEditing = false,
  onFieldChange,
  onAddResource,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number | null>(null);

  // Utiliser resourceCache depuis itemDetails si pas fourni en prop
  const resourceCache = propResourceCache || itemDetails?.resourceCache || {};

  const headerFields = getHeaderFields(fields);
  const overviewFields = getOverviewFields(fields);
  const detailsFields = getDetailsFields(fields);

  // === Champs du header ===
  const titleField = headerFields.find((f) => f.type === 'title');
  const title = titleField ? getOmekaValue(itemDetails, titleField.property) : itemDetails?.title;

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

  const toggleExpansion = () => {
    if (!isEditing) {
      setExpanded(!expanded);
    }
  };

  const hasContent = isEditing || date || description || (actants && actants.length > 0);
  if (!hasContent && !isEditing) return null;

  if (isEditing) {
    return (
      <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
        <motion.div variants={itemVariants} className='flex flex-col bg-c2 p-6 rounded-xl gap-5'>
          {/* === Section Titre === */}
          {titleField && (
            <div className='flex flex-col gap-2'>
              <label className={fieldLabelClass}>{titleField.label || 'Titre'}</label>
              <div className='flex items-center gap-4'>
                <Textarea
                  value={String(title || '')}
                  onChange={(e) => onFieldChange?.(titleField.property, e.target.value)}
                  placeholder={titleField.placeholder || 'Titre'}
                  classNames={{
                    inputWrapper: inputWrapperClass,
                    input: 'text-c6 !text-xl font-medium',
                  }}
                  minRows={1}
                  size='lg'
                />
              </div>
            </div>
          )}


          {/* === Section Date === */}
          {dateField && (
            <FormDateInput
              label={dateField.label}
              value={String(date || '')}
              onChange={(value) => onFieldChange?.(dateField.property, value || null)}
            />
          )}

          {/* === Section Description === */}
          {descriptionField && (
            <div className='flex flex-col gap-2'>
              <label className={fieldLabelClass}>{descriptionField.label}</label>
              <Textarea
                aria-label={descriptionField.label}
                value={String(description || '')}
                onValueChange={(value) => onFieldChange?.(descriptionField.property, value)}
                placeholder={descriptionField.placeholder || 'Description...'}
                minRows={4}
                classNames={{
                  inputWrapper: inputWrapperClass,
                  input: 'text-c6 text-base',
                }}
              />
            </div>
          )}

          {/* === Section Slider d'avancement === */}
          {percentageField && (
            <div className='flex flex-col gap-2'>
              <div className='flex justify-between items-center'>
                <label className={fieldLabelClass}>{percentageField.label}</label>
                <span className='text-sm text-c6 font-semibold'>{sliderValue ?? percentage}%</span>
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
              <label className={fieldLabelClass}>{detailsResourceField.label}</label>
              <div className='flex flex-wrap gap-2 items-center'>
                {actants.map((actant, index) => (
                  <span key={actant.id || index} className='px-3 py-1 bg-c3 text-c6 rounded-lg text-sm'>
                    {getPersonDisplayName(actant)}
                  </span>
                ))}
                <Button
                  size='sm'
                  isIconOnly
                  className='bg-c3 text-c6 hover:bg-action hover:text-selected rounded-full'
                  onPress={() => onAddResource?.(detailsResourceField.property)}>
                  <AddIcon size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* === Autres champs texte === */}
          {detailsFields
            .filter((f) => f.type === 'text' && f !== dateField && f !== descriptionField)
            .map((field) => (
              <div key={field.property} className='flex flex-col gap-2'>
                <label className={fieldLabelClass}>{field.label}</label>
                <Input
                  value={String(getOmekaValue(itemDetails, field.property) || '')}
                  onChange={(e) => onFieldChange?.(field.property, e.target.value)}
                  placeholder={field.placeholder}
                  classNames={{
                    inputWrapper: inputWrapperClass,
                    input: 'text-c6',
                  }}
                />
              </div>
            ))}

          {/* === Champs ItemSet (sélecteur) === */}
          {detailsFields
            .filter((f) => f.type === 'itemset' && f.itemSetId)
            .map((field) => {
              const currentIds = getResourceIds(itemDetails, field.property);
              const currentId = currentIds.length > 0 ? currentIds[0] : undefined;
              return (
                <ItemSetSelect
                  key={field.key}
                  itemSetId={field.itemSetId!}
                  selectedId={currentId}
                  label={field.label}
                  onChange={(id, title) => onFieldChange?.(field.property, [{ id, title }])}
                />
              );
            })}

          {/* === Section URL externe === */}
          {urlField && (
            <div className='flex flex-col gap-2'>
              <label className={fieldLabelClass}>{urlField.label}</label>
              <Input
                value={String(fullUrl || '')}
                onChange={(e) => onFieldChange?.(urlField.property, e.target.value)}
                placeholder={urlField.placeholder || 'Lien externe'}
                classNames={{
                  inputWrapper: inputWrapperClass,
                  input: 'text-c6',
                }}
                startContent={<MovieIcon size={14} className='text-c5' />}
              />
            </div>
          )}
        </motion.div>

      </motion.div>
    );
  }

  // Mode affichage
  return (
    <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
      <motion.div
        variants={itemVariants}
        className='cursor-pointer flex flex-col bg-c2 hover:bg-c3 p-6 rounded-lg gap-2.5 transition-all ease-in-out duration-200'
        onClick={toggleExpansion}>
        {date && <h3 className='text-base text-c5 font-medium'>{formatFlexibleDateDisplay(date)}</h3>}
        {description && (
          <div
            className={`text-sm text-c4 font-normal transition-all ease-in-out duration-200 break-words gap-2.5 ${expanded ? '' : 'line-clamp-4'}`}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
        {actants && actants.length > 0 && <p className='text-sm text-end text-c4 italic'>Ajouté par : {actants.map((a) => getPersonDisplayName(a)).join(', ')}</p>}
        {detailsFields
          .filter((f) => f.type === 'itemset')
          .map((field) => {
            const ids = getResourceIds(itemDetails, field.property);
            const resolved = ids.map((id) => resourceCache[id]).filter(Boolean);
            if (resolved.length === 0) return null;
            return (
              <p key={field.key} className='text-sm text-c5'>
                <span className='font-medium'>{field.label} : </span>
                {resolved.map((r: any) => r.title || r.name).join(', ')}
              </p>
            );
          })}
        {description && (
          <p className='text-base text-c5 font-semibold transition-all ease-in-out duration-200'>
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
  <div className='flex flex-col gap-5'>
    <div className='rounded-2xl lg:w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] bg-c3 animate-pulse' />
    <div className='flex flex-col gap-5'>
      <div className='flex flex-col gap-1.5'>
        <div className='w-full h-6 bg-c3 rounded-lg animate-pulse' />
        <div className='w-4/5 h-6 bg-c3 rounded-lg animate-pulse' />
      </div>
      <div className='flex justify-between items-center'>
        <div className='w-1/2 h-4 bg-c3 rounded-lg animate-pulse' />
        <div className='w-1/3 h-4 bg-c3 rounded-lg animate-pulse' />
      </div>
    </div>
  </div>
);


export const SimpleDetailsSkeleton: React.FC = () => (
  <div className='flex w-full flex-col p-5 bg-c2 rounded-xl gap-2.5'>
    <div className='w-1/3 h-4 bg-c3 rounded-lg animate-pulse' />
    <div className='flex flex-col gap-1.5'>
      <div className='w-full h-4 bg-c3 rounded-lg animate-pulse' />
      <div className='w-full h-4 bg-c3 rounded-lg animate-pulse' />
      <div className='w-full h-4 bg-c3 rounded-lg animate-pulse' />
    </div>
    <div className='w-1/5 h-4 bg-c3 rounded-lg animate-pulse' />
  </div>
);

// ========================================
// VocabGroupRenderer
// Section « Imaginaire de l'IA » : textarea + selects multi (custom vocab Omeka S)
// ========================================

interface VocabGroupRendererProps {
  fields: VocabGroupField[];
  itemDetails: any;
  formData?: any;
  isEditing: boolean;
  onFieldChange?: (property: string, value: any) => void;
}

const getSelectedVocabValues = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v: any) => (typeof v === 'string' ? v : v?.['@value'] ?? null))
      .filter((v): v is string => v !== null && v.trim() !== '');
  }
  return [];
};

const getTextareaValue = (raw: any): string => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string') return first;
    if (first?.['@value']) return String(first['@value']);
  }
  return '';
};

const VocabField: React.FC<{
  field: VocabGroupField;
  itemDetails: any;
  formData?: any;
  isEditing: boolean;
  onFieldChange?: (property: string, value: any) => void;
}> = ({ field, itemDetails, formData, isEditing, onFieldChange }) => {
  const [vocabTerms, setVocabTerms] = useState<string[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (field.type !== 'customVocab' || !field.vocabId) return;

    let cancelled = false;
    setLoadingTerms(true);
    setFetchError(null);

    fetchCustomVocabTerms(field.vocabId)
      .then((terms) => {
        if (!cancelled) setVocabTerms(terms);
      })
      .catch((e) => {
        console.error(`[VocabGroup] Erreur chargement vocab ${field.vocabId}:`, e);
        if (!cancelled) {
          setFetchError('Impossible de charger la liste complète');
          setVocabTerms([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTerms(false);
      });

    return () => {
      cancelled = true;
    };
  }, [field.vocabId, field.type]);

  const rawValue = formData?.[field.property] ?? itemDetails?.[field.property];

  if (field.type === 'textarea') {
    const text = getTextareaValue(rawValue);
    if (isEditing) {
      return (
        <FormAutoResizeTextareaInput
          label={field.label}
          value={text}
          placeholder={field.placeholder}
          onChange={(val) => onFieldChange?.(field.property, [{ value: val, dataPath: field.property }])}
        />
      );
    }
    return text ? (
      <div className='flex flex-col gap-1.5'>
        <span className='text-xs font-medium text-c5'>{field.label}</span>
        <p className='text-sm text-c6 whitespace-pre-wrap'>{text}</p>
      </div>
    ) : null;
  }

  // customVocab — select à choix multiples
  const selected = getSelectedVocabValues(rawValue);
  const existingEntries: any[] = Array.isArray(rawValue) ? rawValue : [];
  const existingEntry = existingEntries.find((v: any) => v?.property_id);
  const omekaType = `customvocab:${field.vocabId}`;
  const propertyId: number | undefined = existingEntry?.property_id ?? field.propertyId;

  const handleMultiSelectChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return;
    const nextTerms = Array.from(keys)
      .map((k) => String(k))
      .filter(Boolean);

    const entries = nextTerms.map((term) =>
      propertyId
        ? { type: omekaType, property_id: propertyId, '@value': term, is_public: true }
        : term,
    );
    onFieldChange?.(field.property, entries);
  };

  if (isEditing) {
    return (
      <div className='flex flex-col gap-2'>
        <span className={fieldLabelClass}>{field.label}</span>
        <Select
          size='sm'
          aria-label={field.label}
          selectionMode='multiple'
          placeholder={loadingTerms ? 'Chargement…' : 'Sélectionner…'}
          isDisabled={loadingTerms || vocabTerms.length === 0}
          selectedKeys={new Set(selected)}
          onSelectionChange={handleMultiSelectChange}
          className='w-full'>
          {vocabTerms.map((term) => (
            <SelectItem key={term} textValue={term} className='text-c6 hover:bg-c3'>
              {term}
            </SelectItem>
          ))}
        </Select>
        {fetchError && (
          <span className='text-xs text-amber-500 italic'>{fetchError}</span>
        )}
      </div>
    );
  }

  // view mode
  return selected.length > 0 ? (
    <div className='flex flex-col gap-1.5'>
      <span className='text-xs font-medium text-c5'>{field.label}</span>
      <div className='flex flex-wrap gap-1.5'>
        {selected.map((term) => (
          <span key={term} className='text-sm px-2 py-2 rounded-lg bg-c2 border border-c3 text-c6'>
            {term}
          </span>
        ))}
      </div>
    </div>
  ) : null;
};

export const VocabGroupRenderer: React.FC<VocabGroupRendererProps> = ({
  fields,
  itemDetails,
  formData,
  isEditing,
  onFieldChange,
}) => {
  const hasAnyContent = fields.some((f) => {
    const raw = formData?.[f.property] ?? itemDetails?.[f.property];
    if (f.type === 'textarea') return getTextareaValue(raw).trim() !== '';
    return getSelectedVocabValues(raw).length > 0;
  });

  if (!isEditing && !hasAnyContent) {
    return (
      <div className='flex flex-col items-center justify-center py-8 gap-2 text-c4'>
        <span className='text-sm'>Aucune donnée renseignée</span>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5 py-2'>
      {fields.map((field) => (
        <VocabField
          key={field.property}
          field={field}
          itemDetails={itemDetails}
          formData={formData}
          isEditing={isEditing}
          onFieldChange={onFieldChange}
        />
      ))}
    </div>
  );
};
