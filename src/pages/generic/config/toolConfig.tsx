import React from 'react';
import { Skeleton } from '@heroui/react';
import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { SimplifiedDetailConfig } from '../simplifiedConfig';
import { convertToGenericConfig } from '../simplifiedConfigAdapter';
import { getOmekaValue, getAllOmekaValues } from '../simplifiedConfigAdapter';
import { Link } from '@heroui/react';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { ResourceCard } from '@/components/features/corpus/ResourceCard';
import { ThumbnailIcon } from '@/components/ui/icons';
import MediaViewer from '@/components/features/conference/MediaViewer';
import { getResourceDetails } from '@/services/resourceDetails';
import * as Items from '@/services/Items';

// ========================================
// Custom Overview Component
// ========================================

interface ToolOverviewProps {
  title: string;
  logo: string | null;
  medias: string[];
  release: string | null;
  homepage: string | null;
  usageCount: number;
}

const CustomToolOverview: React.FC<ToolOverviewProps> = ({
  title,
  logo,
  medias,
  release,
  homepage,
  usageCount,
}) => {
  return (
    <div className='flex flex-col items-center gap-50'>
      <div className='gap-20 text-c6 w-full flex flex-col items-center'>
        {logo ? (
          <img className='w-100 h-100 object-cover rounded-18' src={logo} alt={title} />
        ) : (
          <div className='w-100 h-100 rounded-18 object-cover flex items-center justify-center bg-c3'>
            <div className='text-c6 text-4xl font-bold opacity-30'>{title?.charAt(0)}</div>
          </div>
        )}
        <h1 className='text-64 font-medium text-c6 leading-none'>{title}</h1>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-25 w-2/3'>
        <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-25 rounded-20 flex flex-col gap-1.5 h-full'>
          <div className='flex items-center gap-10 border-b-2 border-c3 pb-2'>
            <h3 className='text-16 font-medium text-c6 w-full text-center'>Date De Publication</h3>
          </div>
          <div className='flex flex-col gap-10'>
            <p className='text-14 text-c5 py-3 w-full text-center'>{release}</p>
          </div>
        </div>

        <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-25 rounded-20 flex flex-col gap-1.5 h-full'>
          <div className='flex items-center gap-10 border-b-2 border-c3 pb-2'>
            <h3 className='text-16 font-medium text-c6 w-full text-center'>Lien Externe</h3>
          </div>
          <div className='flex flex-col gap-10'>
            <a
              href={homepage || '#'}
              className='text-14 text-c5 py-3 px-4 hover:bg-c2 w-full text-center transition-all duration-300 ease-in-out rounded-8 cursor-pointer'>
              Page de l'outil
            </a>
          </div>
        </div>

        <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-25 rounded-20 flex flex-col gap-1.5 h-full'>
          <div className='flex items-center gap-10 border-b-2 border-c3 pb-2'>
            <h3 className='text-16 font-medium text-c6 w-full text-center'>Popularit&eacute;</h3>
          </div>
          <div className='flex flex-col gap-10'>
            <p className='text-14 text-c5 py-3 w-full text-center'>
              Utilis&eacute; dans {usageCount} ressource{usageCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Media Gallery — exclude the logo image to avoid duplication */}
      {medias && medias.length > 0 && (
        <div className={`mx-auto mt-10 gap-6 ${medias.length === 1 ? 'w-2/3' : 'w-full grid grid-cols-1 md:grid-cols-2'}`}>
          {medias.map((media: string, index: number) => (
            <div key={index} className='rounded-18 overflow-hidden relative shadow-lg'>
              <MediaViewer src={media} alt={title} className='w-full h-full object-cover' />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomToolOverviewSkeleton: React.FC = () => (
  <div className='flex flex-col items-center gap-50'>
    <div className='gap-20 w-full flex flex-col items-center'>
      <Skeleton className='rounded-18 w-100 h-100 bg-c2' />
      <Skeleton className='w-[400px] h-60 rounded-10 bg-c3' />
    </div>
    <div className='grid grid-cols-1 md:grid-cols-3 gap-25 w-2/3'>
      {[0, 1, 2].map((i) => (
        <div key={i} className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-25 rounded-20 flex flex-col gap-1.5 h-full'>
          <Skeleton className='h-6 w-full rounded-8 bg-c2' />
          <Skeleton className='h-6 w-full rounded-8 bg-c2 mt-4' />
        </div>
      ))}
    </div>
  </div>
);

// ========================================
// SimpleToolCard (same UI as Tool.tsx)
// ========================================

const SimpleToolCard = ({ outil }: { outil: any }) => {
  const media = outil.associatedMedia && outil.associatedMedia.length > 0 ? outil.associatedMedia[0] : null;
  const imageSrc = outil.logo || outil.thumbnail || (media ? (media.thumbnail || media.url) : null);

  return (
    <Link
      href={`/corpus/outil/${outil.id}`}
      className='group shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 cursor-pointer py-40 px-20 rounded-18 justify-between flex flex-col gap-4 hover:bg-c2 h-full transition-all ease-in-out duration-300 relative'>
      {imageSrc ? (
        <div className='w-60 h-60 rounded-10 overflow-hidden bg-c3 flex-shrink-0'>
          <img alt={outil.title} className='w-full h-full object-cover' src={imageSrc} />
        </div>
      ) : (
        <div className='w-60 h-60 rounded-8 flex items-center justify-center bg-c3 flex-shrink-0'>
          <ThumbnailIcon className='text-c4/20' size={40} />
        </div>
      )}
      <p className='text-c6 text-16'>{outil.title}</p>
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
      <div className='w-2/3 mx-auto flex flex-col mt-10 border-t border-c3'>
        {description && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-18 font-bold text-c6 mb-2'>Descriptif g&eacute;n&eacute;ral</h3>
            <div className='text-c5 text-16 leading-relaxed whitespace-pre-wrap'>{description}</div>
          </div>
        )}

        {category && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-18 font-bold text-c6 mb-2'>Type de l'outil</h3>
            <p className='text-c5 text-16'>{category}</p>
          </div>
        )}

        {purpose && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-18 font-bold text-c6 mb-2'>Fonction</h3>
            <p className='text-c5 text-16'>{purpose}</p>
          </div>
        )}

        {os.length > 0 && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-18 font-bold text-c6 mb-2'>Syst&egrave;mes d'exploitation</h3>
            <p className='text-c5 text-16'>{os.join(', ')}</p>
          </div>
        )}

        {license && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-18 font-bold text-c6 mb-2'>License</h3>
            <p className='text-c5 text-16'>{license}</p>
          </div>
        )}

        {fileRelease.length > 0 && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-18 font-bold text-c6 mb-2'>Format de fichier</h3>
            <p className='text-c5 text-16'>{fileRelease.join(', ')}</p>
          </div>
        )}

        {programmingLanguages.length > 0 && (
          <div className='border-b-2 border-c3 py-6'>
            <h3 className='text-18 font-bold text-c6 mb-2'>Langage de programmation de l'outil</h3>
            <p className='text-c5 text-16'>{programmingLanguages.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Carousel: Resources using this tool */}
      {!loadingUsedBy && usedBy.length > 0 && (
        <div className='w-full flex flex-col items-center gap-50 mt-20'>
          <div className='w-full'>
            <FullCarrousel
              title='Ressources utilisant cet outil'
              data={usedBy}
              perPage={4}
              perMove={1}
              renderSlide={(resource: any) => <ResourceCard item={resource} className='h-full' key={resource.id} />}
            />
          </div>
        </div>
      )}

      {/* Carousel: Related Tools (SimpleToolCard - same UI as Tool.tsx) */}
      <div className='w-full'>
        {loadingRelated ? (
          <div className='w-full h-[200px] flex items-center justify-center'>
            <Skeleton className='w-full h-full bg-c3 rounded-xl' />
          </div>
        ) : relatedTools.length > 0 ? (
          <FullCarrousel
            title="D'autres Outils \u00e0 D\u00e9couvrir"
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
  <div className='w-2/3 mx-auto flex flex-col mt-10 border-t border-c3'>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className='border-b-2 border-c3 py-6'>
        <Skeleton className='h-6 w-1/4 rounded-8 bg-c2 mb-2' />
        <Skeleton className='h-4 w-full rounded-8 bg-c2' />
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

export const toolConfigSimplified: SimplifiedDetailConfig = {
  resourceType: RESOURCE_TYPES.outil.type,
  templateId: 114,

  fields: {
    title: { property: 'dcterms:title', type: 'title', zone: 'header' },
    description: { property: 'dcterms:description', type: 'textarea', zone: 'details' },
    date: { property: 'DOAP:release', type: 'date', zone: 'details' },
    contributors: { property: 'dcterms:contributor', type: 'resource', zone: 'overview' },
    externalLink: { property: 'DOAP:homepage', type: 'url', zone: 'details' },
  },

  views: [], // No views -> full width, no right column

  customOverviewComponent: CustomToolOverview,
  customOverviewSkeleton: CustomToolOverviewSkeleton,
  customDetailsComponent: CustomToolDetails,
  customDetailsSkeleton: CustomToolDetailsSkeleton,

  customMapOverviewProps: (itemDetails: any, _currentVideoTime: number) => {
    const title = itemDetails['o:title'] || getOmekaValue(itemDetails, 'dcterms:title') || '';
    const logo = getToolLogo(itemDetails);
    // Exclude the logo from medias to avoid duplication (compare by storage hash)
    const allMedias: string[] = itemDetails.associatedMedia || [];
    const getFileHash = (url: string) => url.split('/').pop()?.split('.')[0] || '';
    const logoHash = logo ? getFileHash(logo) : '';
    const medias = logoHash ? allMedias.filter((m: string) => getFileHash(m) !== logoHash) : allMedias;
    const release = getOmekaValue(itemDetails, 'DOAP:release');
    const homepage = getOmekaValue(itemDetails, 'DOAP:homepage');

    // Count usedBy from PHP backend data if available, otherwise 0
    const usageCount = itemDetails.usedBy?.length || itemDetails.usageCount || 0;

    return {
      title,
      logo,
      medias,
      release: typeof release === 'string' ? release : null,
      homepage: typeof homepage === 'string' ? homepage : null,
      usageCount,
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
  showRecommendations: false, // Recommendations handled inside CustomToolDetails (SimpleToolCard carousel)
  showComments: true,
  formEnabled: true,
};

export const toolConfig = convertToGenericConfig(toolConfigSimplified);
