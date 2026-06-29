import React from 'react';
import { Skeleton } from '@heroui/react';
import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { getOmekaValue, getAllOmekaValues } from '../simplifiedConfigAdapter';
import { Link } from '@heroui/react';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { ResourceCard } from '@/components/features/shared/corpus/ResourceCard';
import { ThumbnailIcon } from '@/components/ui/icons';
import MediaViewer from '@/components/features/resource-links/MediaViewer';
import { MediaDropzone, MediaFile } from '@/components/features/forms/edit/MediaDropzone';
import { getResourceDetails } from '@/services/resourceDetails';
import * as Items from '@/services/Items';

// ========================================
// Custom Overview Component
// ========================================

interface ToolOverviewProps {
  title: string;
  logo: string | null;
  medias: string[];
  allMedias: string[];
  release: string | null;
  homepage: string | null;
  itemId: string | number | null;
  isEditing?: boolean;
  loadingMedia?: boolean;
  mediaFiles?: MediaFile[];
  onMediasChange?: (files: MediaFile[]) => void;
  youtubeUrls?: string[];
  onYouTubeUrlsChange?: (urls: string[]) => void;
  removedMediaIndexes?: number[];
  onRemoveExistingMedia?: (index: number) => void;
}

const CustomToolOverview: React.FC<ToolOverviewProps> = ({
  title,
  logo,
  medias,
  allMedias,
  release,
  homepage,
  itemId,
  isEditing = false,
  loadingMedia = false,
  mediaFiles = [],
  onMediasChange,
  youtubeUrls = [],
  onYouTubeUrlsChange,
  removedMediaIndexes = [],
  onRemoveExistingMedia,
}) => {
  const [usageCount, setUsageCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (isEditing || !itemId) {
      setUsageCount(isEditing ? null : 0);
      return;
    }
    let cancelled = false;
    getResourceDetails(itemId)
      .then((details: any) => { if (!cancelled) setUsageCount((details?.usedBy || []).length); })
      .catch(() => { if (!cancelled) setUsageCount(0); });
    return () => { cancelled = true; };
  }, [itemId, isEditing]);

  const existingMedias = allMedias.filter((_, i) => !removedMediaIndexes.includes(i));
  const handleRemove = (index: number) => {
    const originalIndex = allMedias.indexOf(existingMedias[index]);
    if (originalIndex !== -1) onRemoveExistingMedia?.(originalIndex);
  };

  // Mode édition : zone médias uniquement (titre, date, lien → formulaire unifié)
  if (isEditing) {
    return (
      <div className='w-full flex flex-col gap-2'>
        <label className='text-sm font-medium text-c5'>
          Images &amp; médias
          <span className='ml-1.5 text-xs text-c4 font-normal'>— La première image devient le logo</span>
        </label>
        {loadingMedia ? (
          <Skeleton className='w-full h-[350px] rounded-2xl bg-c3' />
        ) : (
          <MediaDropzone
            value={mediaFiles}
            onChange={(files) => onMediasChange?.(files)}
            youtubeUrls={youtubeUrls}
            onYouTubeUrlsChange={onYouTubeUrlsChange}
            height='350px'
            maxFiles={10}
            acceptedTypes={['image/*', 'video/*']}
            existingMedias={existingMedias}
            onRemoveExisting={handleRemove}
            disabled={false}
            className='w-full'
          />
        )}
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-12'>
      <div className='gap-5 text-c6 w-full flex flex-col items-center'>
        {logo ? (
          <img className='w-24 h-24 object-cover rounded-2xl' src={logo} alt={title} />
        ) : (
          <div className='w-24 h-24 rounded-2xl flex items-center justify-center bg-c3'>
            <div className='text-c6 text-4xl font-bold opacity-30'>{title?.charAt(0)}</div>
          </div>
        )}
        <h1 className='text-6xl font-medium text-c6 leading-none text-center'>{title}</h1>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 w-full'>
        <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-6 rounded-3xl flex flex-col gap-1.5 h-full'>
          <div className='flex items-center gap-2.5 border-b-2 border-c3 pb-2'>
            <h3 className='text-base font-medium text-c6 w-full text-center'>Date De Publication</h3>
          </div>
          <div className='flex flex-col gap-2.5'>
            <p className='text-sm text-c5 py-3 w-full text-center'>{release}</p>
          </div>
        </div>

        <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-6 rounded-3xl flex flex-col gap-1.5 h-full'>
          <div className='flex items-center gap-2.5 border-b-2 border-c3 pb-2'>
            <h3 className='text-base font-medium text-c6 w-full text-center'>Lien Externe</h3>
          </div>
          <div className='flex flex-col gap-2.5'>
            <a
              href={homepage || '#'}
              className='text-sm text-c5 py-3 px-4 hover:bg-c2 w-full text-center transition-all duration-300 ease-in-out rounded-lg cursor-pointer'>
              Page de l'outil
            </a>
          </div>
        </div>

        <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-6 rounded-3xl flex flex-col gap-1.5 h-full'>
          <div className='flex items-center gap-2.5 border-b-2 border-c3 pb-2'>
            <h3 className='text-base font-medium text-c6 w-full text-center'>Popularit&eacute;</h3>
          </div>
          <div className='flex flex-col gap-2.5'>
            <p className='text-sm text-c5 py-3 w-full text-center'>
              {usageCount === null ? (
                <span className='text-c4'>…</span>
              ) : (
                <>Utilis&eacute; dans {usageCount} ressource{usageCount > 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {medias.length > 0 && (
        <div className={`mx-auto mt-2.5 gap-6 w-full ${medias.length > 1 ? 'grid grid-cols-1 md:grid-cols-2' : ''}`}>
          {medias.map((media, index) => (
            <div key={index} className='rounded-2xl overflow-hidden relative shadow-lg'>
              <MediaViewer src={media} alt={title} className='w-full h-full object-cover' />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomToolOverviewSkeleton: React.FC = () => (
  <div className='flex flex-col items-center gap-12'>
    <div className='gap-5 w-full flex flex-col items-center'>
      <Skeleton className='rounded-2xl w-24 h-24 bg-c2' />
      <Skeleton className='w-96 h-14 rounded-lg bg-c3' />
    </div>
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6 w-full'>
      {[0, 1, 2].map((i) => (
        <div key={i} className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-6 rounded-3xl flex flex-col gap-3 h-full'>
          <Skeleton className='h-5 w-3/4 mx-auto rounded-lg bg-c2' />
          <Skeleton className='h-4 w-1/2 mx-auto rounded-lg bg-c2 mt-2' />
        </div>
      ))}
    </div>
  </div>
);

// ========================================
// SimpleToolCard (same UI as Tool.tsx)
// ========================================

const TOOL_CARD_SHELL =
  'group shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 cursor-pointer rounded-2xl hover:bg-c2 transition-all ease-in-out duration-300';

const SimpleToolCard = ({ outil }: { outil: any }) => {
  const media = outil.associatedMedia && outil.associatedMedia.length > 0 ? outil.associatedMedia[0] : null;
  const imageSrc = outil.logo || outil.thumbnail || (media ? (media.thumbnail || media.url) : null);

  return (
    <Link
      href={`/corpus/outil/${outil.id}`}
      className={`${TOOL_CARD_SHELL} p-4 flex flex-col gap-2.5 aspect-square w-full`}
      title={outil.title}>
      <div
        className={`flex-1 min-h-0 w-full rounded-xl overflow-hidden flex items-center justify-center ${
          imageSrc ? 'bg-cover bg-center' : 'bg-gradient-to-br from-c2 to-c3'
        }`}
        style={imageSrc ? { backgroundImage: `url(${imageSrc})` } : undefined}>
        {!imageSrc && <ThumbnailIcon className='text-c4/20' size={36} />}
      </div>
      <p className='text-sm text-c6 font-medium line-clamp-2 leading-snug text-center shrink-0'>
        {outil.title}
      </p>
    </Link>
  );
};

// ========================================
// Custom Details Component (with self-fetching usedBy + related tools)
// ========================================

interface ToolDetailsProps {
  description: string | null;
  category: string | null;
  purpose: string | null;
  os: string[];
  license: string | null;
  fileRelease: string[];
  programmingLanguages: string[];
  itemId: string | number | null;
}

const CustomToolDetails: React.FC<ToolDetailsProps> = ({
  description,
  category,
  purpose,
  os,
  license,
  fileRelease,
  programmingLanguages,
  itemId,
}) => {
  const [usedBy, setUsedBy] = React.useState<any[]>([]);
  const [loadingUsedBy, setLoadingUsedBy] = React.useState(true);
  const [relatedTools, setRelatedTools] = React.useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = React.useState(true);

  // Fetch usedBy from PHP backend
  React.useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    getResourceDetails(itemId)
      .then((details: any) => {
        if (!cancelled) setUsedBy(details?.usedBy || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingUsedBy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // Fetch related tools
  React.useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    Items.getOutilsCards()
      .then((allTools: any[]) => {
        if (!cancelled) {
          const filtered = allTools
            .filter((t: any) => String(t.id) !== String(itemId))
            .sort(() => 0.5 - Math.random())
            .slice(0, 10);
          setRelatedTools(filtered);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingRelated(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  return (
    <>
      {/* Detailed Info List */}
      <div className='w-full flex flex-col mt-2.5 border-t border-c3'>
        {description && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-lg font-bold text-c6 mb-2'>Descriptif g&eacute;n&eacute;ral</h3>
            <div className='text-c5 text-base leading-relaxed whitespace-pre-wrap'>{description}</div>
          </div>
        )}

        {category && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-lg font-bold text-c6 mb-2'>Type de l'outil</h3>
            <p className='text-c5 text-base'>{category}</p>
          </div>
        )}

        {purpose && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-lg font-bold text-c6 mb-2'>Fonction</h3>
            <p className='text-c5 text-base'>{purpose}</p>
          </div>
        )}

        {os.length > 0 && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-lg font-bold text-c6 mb-2'>Syst&egrave;mes d'exploitation</h3>
            <p className='text-c5 text-base'>{os.join(', ')}</p>
          </div>
        )}

        {license && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-lg font-bold text-c6 mb-2'>License</h3>
            <p className='text-c5 text-base'>{license}</p>
          </div>
        )}

        {fileRelease.length > 0 && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-lg font-bold text-c6 mb-2'>Format de fichier</h3>
            <p className='text-c5 text-base'>{fileRelease.join(', ')}</p>
          </div>
        )}

        {programmingLanguages.length > 0 && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-lg font-bold text-c6 mb-2'>Langage de programmation de l'outil</h3>
            <p className='text-c5 text-base'>{programmingLanguages.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Carousel: Resources using this tool */}
      {!loadingUsedBy && usedBy.length > 0 && (
        <div className='w-full flex flex-col items-center gap-12 mt-5'>
          <div className='w-full'>
            <FullCarrousel
              title='Ressources utilisant cet outil'
              data={usedBy}
              perPage={2}
              perMove={1}
              renderSlide={(resource: any) => <ResourceCard item={resource} className='h-full' key={resource.id} />}
            />
          </div>
        </div>
      )}

      {/* Carousel: Related Tools — petits carrés */}
      <div className='w-full mt-5'>
        {loadingRelated ? (
          <div className='w-full h-[120px] flex items-center justify-center'>
            <Skeleton className='w-full h-full bg-c3 rounded-xl' />
          </div>
        ) : relatedTools.length > 0 ? (
          <FullCarrousel
            title={"D'autres Outils à Découvrir"}
            data={relatedTools}
            perPage={6}
            perMove={1}
            renderSlide={(t: any) => <SimpleToolCard outil={t} key={t.id} />}
          />
        ) : null}
      </div>
    </>
  );
};

const CustomToolDetailsSkeleton: React.FC = () => (
  <div className='w-full flex flex-col mt-2.5 border-t border-c3'>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className='border-b-2 border-c3 py-6'>
        <div className='h-6 w-1/4 rounded-lg bg-c3 animate-pulse mb-2' />
        <div className='h-4 w-full rounded-lg bg-c3 animate-pulse' />
      </div>
    ))}
  </div>
);

// ========================================
// Simplified Config
// ========================================

// Helper: get logo from item data
const getToolLogo = (itemDetails: any): string | null => {
  const resourceCache = itemDetails.resourceCache || {};

  // 1. thumbnail_display_urls — most reliable source (Omeka generates these from attached media)
  if (itemDetails['thumbnail_display_urls']?.large) return itemDetails['thumbnail_display_urls'].large;
  if (itemDetails['thumbnail_display_urls']?.square) return itemDetails['thumbnail_display_urls'].square;

  // 2. schema:image — only if it's a linked resource with a thumbnail in the cache
  const schemaImageData = itemDetails['schema:image'];
  if (Array.isArray(schemaImageData) && schemaImageData.length > 0) {
    const entry = schemaImageData[0];
    if (entry.value_resource_id) {
      const cached = resourceCache[entry.value_resource_id];
      if (cached?.thumbnail || cached?.thumbnailUrl) {
        return cached.thumbnail || cached.thumbnailUrl;
      }
    }
  }

  // 3. First associated media URL
  if (itemDetails.associatedMedia && itemDetails.associatedMedia.length > 0) {
    return itemDetails.associatedMedia[0];
  }

  return null;
};

// Helper: extract programming language titles from resource cache
const getProgrammingLanguages = (itemDetails: any): string[] => {
  const propData = itemDetails['DOAP:programming-language'];
  if (!Array.isArray(propData)) return [];

  const resourceCache = itemDetails.resourceCache || {};
  const languages: string[] = [];

  for (const entry of propData) {
    // Literal value
    if (entry['@value']) {
      languages.push(entry['@value']);
    }
    // Linked resource
    else if (entry.value_resource_id) {
      const cached = resourceCache[entry.value_resource_id];
      if (cached?.title) {
        languages.push(cached.title);
      }
    }
    // display_title
    else if (entry.display_title) {
      languages.push(entry.display_title);
    }
  }

  return languages;
};

/** Templates Omeka S — même UI, création/sauvegarde selon le template de l'item */
export const TOOL_TEMPLATE_CHERCHEUR = 114;
export const TOOL_TEMPLATE_ETUDIANT = 129;

const sharedToolConfigBase: Omit<SimplifiedDetailConfig, 'resourceType' | 'templateId'> = {
  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    description: {
      property: 'dcterms:description',
      type: 'textarea',
      label: 'Description',
      placeholder: "Description de l'outil...",
      zone: 'details',
    },
    date: { property: 'DOAP:release', type: 'date', label: 'Date de sortie', zone: 'details' },
    category: { property: 'DOAP:category', type: 'text', label: "Type d'outil", zone: 'details' },
    purpose: { property: 'oa:hasPurpose', type: 'textarea', label: 'Fonction', zone: 'details' },
    contributors: {
      property: 'dcterms:contributor',
      type: 'resource',
      label: 'Contributeurs',
      resourceTemplateId: 96,
      multiSelect: true,
      zone: 'overview',
    },
    externalLink: {
      property: 'DOAP:homepage',
      type: 'url',
      label: 'Site web',
      placeholder: 'https://...',
      zone: 'details',
    },
  },

  views: [
    {
      key: 'caracteristiques',
      title: 'Caractéristiques',
      renderType: 'categories',
      editable: true,
      categories: [
        {
          key: 'general',
          title: 'Informations générales',
          subcategories: [
            { key: 'category', label: "Type d'outil", property: 'DOAP:category', allowMultipleInputs: false },
            { key: 'purpose', label: 'Fonction', property: 'oa:hasPurpose', allowMultipleInputs: false },
            { key: 'operatingSystem', label: "Systèmes d'exploitation", property: 'DOAP:os', allowMultipleInputs: false },
            { key: 'license', label: 'Licence', property: 'DOAP:license', allowMultipleInputs: false },
          ],
        },
      ],
    },
    {
      key: 'specifications',
      title: 'Spécifications',
      renderType: 'categories',
      editable: true,
      categories: [
        {
          key: 'technical',
          title: 'Spécifications techniques',
          subcategories: [
            { key: 'fileRelease', label: 'Formats de fichiers', property: 'DOAP:file-release', allowMultipleInputs: false },
            { key: 'programmingLanguage', label: 'Langage de programmation', property: 'DOAP:programming-language', allowMultipleInputs: false },
          ],
        },
      ],
    },
    {
      key: 'liens',
      title: 'Liens',
      renderType: 'categories',
      editable: true,
      categories: [
        {
          key: 'external',
          title: 'Liens externes',
          subcategories: [
            { key: 'homepage', label: 'Site web officiel', property: 'DOAP:homepage', allowMultipleInputs: false },
            { key: 'repository', label: 'Dépôt Git', property: 'DOAP:repository', allowMultipleInputs: false },
            { key: 'bugDatabase', label: 'Base de bugs', property: 'DOAP:bug-database', allowMultipleInputs: false },
          ],
        },
      ],
    },
  ],

  defaultView: 'caracteristiques',

  customOverviewComponent: CustomToolOverview,
  customOverviewSkeleton: CustomToolOverviewSkeleton,
  customDetailsComponent: CustomToolDetails,
  customDetailsSkeleton: CustomToolDetailsSkeleton,

  customMapOverviewProps: (itemDetails: any, _currentVideoTime: number) => {
    const title = itemDetails['o:title'] || getOmekaValue(itemDetails, 'dcterms:title') || '';
    const logo = getToolLogo(itemDetails);
    const allMedias: string[] = itemDetails.associatedMedia || [];
    const getFileHash = (url: string) => url.split('/').pop()?.split('.')[0] || '';
    const logoHash = logo ? getFileHash(logo) : '';
    const medias = logoHash ? allMedias.filter((m: string) => getFileHash(m) !== logoHash) : allMedias;
    const release = getOmekaValue(itemDetails, 'DOAP:release');
    const homepage = getOmekaValue(itemDetails, 'DOAP:homepage');
    const itemId = itemDetails['o:id'] || null;

    return {
      title,
      logo,
      medias,
      allMedias,
      release: typeof release === 'string' ? release : null,
      homepage: typeof homepage === 'string' ? homepage : null,
      itemId,
    };
  },

  customMapDetailsProps: (itemDetails: any) => {
    const description = getOmekaValue(itemDetails, 'dcterms:description');
    const category = getOmekaValue(itemDetails, 'DOAP:category');
    const purpose = getOmekaValue(itemDetails, 'oa:hasPurpose');
    const os = getAllOmekaValues(itemDetails, 'DOAP:os');
    const license = getOmekaValue(itemDetails, 'DOAP:license');
    const fileRelease = getAllOmekaValues(itemDetails, 'DOAP:file-release');
    const programmingLanguages = getProgrammingLanguages(itemDetails);
    const itemId = itemDetails['o:id'] || null;

    return {
      description: typeof description === 'string' ? description : null,
      category: typeof category === 'string' ? category : null,
      purpose: typeof purpose === 'string' ? purpose : null,
      os,
      license: typeof license === 'string' ? license : null,
      fileRelease,
      programmingLanguages,
      itemId,
    };
  },

  showKeywords: false,
  showRecommendations: false,
  showComments: true,
  formEnabled: true,
  editSingleColumn: true,
};

/** Outil chercheur (template 114) */
export const toolConfigSimplified: SimplifiedDetailConfig = {
  ...sharedToolConfigBase,
  resourceType: RESOURCE_TYPES.outil.type,
  templateId: TOOL_TEMPLATE_CHERCHEUR,
};

/** Outil étudiant (template 129) — même page, template différent à la création */
export const toolStudentConfigSimplified: SimplifiedDetailConfig = {
  ...sharedToolConfigBase,
  resourceType: RESOURCE_TYPES.outil_etudiant.type,
  templateId: TOOL_TEMPLATE_ETUDIANT,
};

export const toolConfig = convertToGenericConfig(toolConfigSimplified);
export const toolStudentConfig = convertToGenericConfig(toolStudentConfigSimplified);

/** Choisit la config de sauvegarde selon le template Omeka de l'item */
export function getToolConfigForTemplateId(templateId?: number | string | null) {
  return Number(templateId) === TOOL_TEMPLATE_ETUDIANT ? toolStudentConfig : toolConfig;
}
