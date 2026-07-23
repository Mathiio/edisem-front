import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as Items from '@/services/Items';
import {
  fieldValue,
  getItemPage,
  ItemPageCard,
  ItemPageData,
  ItemPageView,
} from '@/services/itemPage';
import { resolveOmekaThumbnail, mapToResourceCardItem } from '@/lib/resourceUtils';
import { Layouts } from '@/components/layout/Layouts';
import { DynamicBreadcrumbs } from '@/components/layout/DynamicBreadcrumbs';
import { Link, Skeleton } from '@heroui/react';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { ResourceCard } from '@/components/features/shared/corpus/ResourceCard';
import { ThumbnailIcon } from '@/components/ui/icons';
import MediaViewer from '@/components/features/resource-links/MediaViewer';

// Interfaces based on backend response
interface ToolDetails {
  id: number | string;
  title: string;
  description?: string;
  purpose?: string;
  category?: string;
  release?: string;
  fileRelease?: string[]; // Array of strings
  license?: string;
  homepage?: string;
  repository?: string;
  bugDatabase?: string;
  os?: string[]; // Array of strings
  programmingLanguages?: any[];
  isPartOf?: any[];
  contributors?: any[];
  associatedMedia?: any[];
  usedBy?: any[]; // Resources using this outil
  usageCount?: number;
  logo?: string;
}

function categoryValues(view: ItemPageView | undefined, key: string): string[] {
  if (!view || view.type !== 'categories') return [];
  return view.values[key]?.values ?? [];
}

function mapUsedByCard(card: ItemPageCard) {
  return mapToResourceCardItem(card);
}

function mapItemPageToToolDetails(page: ItemPageData): ToolDetails {
  const caracteristiques = page.views.caracteristiques;
  const specifications = page.views.specifications;
  const liens = page.views.liens;
  const usedByView = page.views.usedBy;

  const associatedMedia = page.associatedMedia.map((media, index) => {
    if (typeof media === 'string') {
      return { id: index, url: media, thumbnail: media };
    }
    return {
      id: media.id,
      url: media.url,
      thumbnail: media.thumbnail ?? media.url,
      title: media.title,
    };
  });

  const usedBy =
    usedByView?.type === 'usedBy'
      ? usedByView.items.map(mapUsedByCard).filter(Boolean)
      : [];

  const programmingLanguages = categoryValues(specifications, 'programmingLanguage').map((title) => ({ title }));

  return {
    id: page.id,
    title: page.title,
    description: fieldValue(page.fields.description) ?? undefined,
    purpose: categoryValues(caracteristiques, 'purpose')[0] ?? fieldValue(page.fields.purpose) ?? undefined,
    category: categoryValues(caracteristiques, 'category')[0] ?? fieldValue(page.fields.category) ?? undefined,
    release: fieldValue(page.fields.date) ?? undefined,
    fileRelease: categoryValues(specifications, 'fileRelease'),
    license: categoryValues(caracteristiques, 'license')[0],
    homepage:
      categoryValues(liens, 'homepage')[0] ??
      fieldValue(page.fields.externalLink) ??
      undefined,
    repository: categoryValues(liens, 'repository')[0],
    bugDatabase: categoryValues(liens, 'bugDatabase')[0],
    os: categoryValues(caracteristiques, 'operatingSystem'),
    programmingLanguages,
    associatedMedia,
    usedBy,
    usageCount: usedBy.length,
    logo: resolveOmekaThumbnail(page.thumbnail ?? undefined) ?? undefined,
  };
}

const SimpleToolCard = ({ outil }: { outil: any }) => {
    // Get image from associatedMedia or use default
    // Check if associatedMedia is array and has items
    const media = outil.associatedMedia && outil.associatedMedia.length > 0 ? outil.associatedMedia[0] : null;
    const imageSrc = outil.logo || outil.thumbnail || (media ? (media.thumbnail || media.url) : null);
    
    return (
      <Link href={`/corpus/outil/${outil.id}`} className="group shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 cursor-pointer py-10 px-5 rounded-2xl justify-between flex flex-col gap-4 hover:bg-c2 h-full transition-all ease-in-out duration-300 relative">
            {imageSrc ? (
               <div className="w-14 h-14 rounded-lg overflow-hidden bg-c3 flex-shrink-0">
                  <img
                    alt={outil.title}
                    className="w-full h-full object-cover"
                    src={imageSrc}
                  />
               </div>
            ) : (
                <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-c3 flex-shrink-0">
                    <ThumbnailIcon className="text-c4/20" size={40} />
                </div>
            )}
            <p className="text-c6 text-base">{outil.title}</p>
      </Link>
    );
};


export const Tool: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Use any to avoid strict type checking issues with backend data
  const [outil, setTool] = useState<ToolDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedTools, setRelatedTools] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  
  // Fetch outil details
  const fetchToolData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const page = await getItemPage(id);
      if (!page?.supported) {
        setTool(null);
        return;
      }
      setTool(mapItemPageToToolDetails(page));
    } catch(e) {
        console.error("Error fetching outil details", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch other tools for the carousel
  const fetchRelatedTools = useCallback(async () => {
      setLoadingRelated(true);
      try {
          const allTools = await Items.getOutilsCards(); // Retrieve all tools
          // Filter out current outil and maybe randomize
          const filtered = allTools
              .filter((t: any) => String(t.id) !== id) // Exclude current
              .sort(() => 0.5 - Math.random()) // Shuffle
              .slice(0, 10); // Take 10
          setRelatedTools(filtered);
      } catch (e) {
          console.error("Error fetching related tools", e);
      } finally {
          setLoadingRelated(false);
      }
  }, [id]);

  useEffect(() => {
    fetchToolData();
    fetchRelatedTools();
  }, [id, fetchToolData, fetchRelatedTools]);

  // Main Image
  const mainImage = useMemo(() => {
      if (outil?.logo) return outil.logo;
      if (outil?.associatedMedia && outil.associatedMedia.length > 0) {
          return outil.associatedMedia[0].thumbnail || outil.associatedMedia[0].url;
      }
      return null;
  }, [outil]);

  if (!loading && !outil) return <div>Outil non trouvé</div>;

  return (
    <Layouts className='col-span-12 flex flex-col gap-24'>
      <DynamicBreadcrumbs itemTitle={outil?.title || ''} />

      <div className='flex flex-col items-center gap-12'>      
        <div className='gap-5 text-c6 w-full flex flex-col items-center'>
            {loading ? 
                <div className='gap-5 w-full flex flex-col items-center'>
                    <Skeleton className="rounded-2xl w-24 h-24 bg-c2" />
                    <Skeleton className="w-[400px] h-14 rounded-lg bg-c3" />
                </div>
            : 
            <>
            {mainImage ? (
               <img className='w-24 h-24 object-cover rounded-2xl' src={mainImage} alt={outil?.title} />
            ) : (
               <div className='w-24 h-24 rounded-2xl object-cover flex items-center justify-center bg-c3'>
                  <div className="text-c6 text-4xl font-bold opacity-30">{outil?.title?.charAt(0)}</div>
               </div>
            )}
            <h1 className='text-6xl font-medium text-c6 leading-none'>{outil?.title}</h1>
            </>
            }
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 w-2/3'>
            <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-6 rounded-3xl flex flex-col gap-1.5 h-full'>
                <div className='flex items-center gap-2.5 border-b-2 border-c3 pb-2'>
                    <h3 className='text-base font-medium text-c6 w-full text-center'>Date De Publication</h3>
                </div>
                
                <div className='flex flex-col gap-2.5'>
                    {loading ? (
                    <div className="flex flex-col gap-2.5">
                        <Skeleton className="h-6 w-full rounded-lg" />
                    </div>
                    ) : (
                        <p className='text-sm text-c5 py-3 w-full text-center'>{outil?.release}</p>
                    )}
                </div>
            </div>

            <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-6 rounded-3xl flex flex-col gap-1.5 h-full'>
                <div className='flex items-center gap-2.5 border-b-2 border-c3 pb-2'>
                    <h3 className='text-base font-medium text-c6 w-full text-center'>Lien Externe</h3>
                </div>
                
                <div className='flex flex-col gap-2.5'>
                    {loading ? (
                    <div className="flex flex-col gap-2.5">
                        <Skeleton className="h-6 w-full rounded-lg" />
                    </div>
                    ) : (
                        <a href={outil?.homepage} className='text-sm text-c5 py-3 px-4 hover:bg-c2 w-full text-center transition-all duration-300 ease-in-out rounded-lg cursor-pointer'>Page de l’outil</a>
                    )}
                </div>
            </div>

            <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 p-6 rounded-3xl flex flex-col gap-1.5 h-full'>
                <div className='flex items-center gap-2.5 border-b-2 border-c3 pb-2'>
                    <h3 className='text-base font-medium text-c6 w-full text-center'>Popularité</h3>
                </div>
                
                <div className='flex flex-col gap-2.5'>
                    {loading ? (
                    <div className="flex flex-col gap-2.5">
                        <Skeleton className="h-6 w-full rounded-lg" />
                    </div>
                    ) : (
                        <p className='text-sm text-c5 py-3 w-full text-center'>Utilisé dans {outil?.usageCount} ressource{Number(outil?.usageCount) > 1 ? 's' : ''}</p>
                    )}
                </div>
            </div>
        </div>
      </div>

        {/* Thumbnails Gallery */}
        {outil?.associatedMedia && outil.associatedMedia.length > 0 && (
            <div className={`mx-auto mt-2.5 gap-6 ${outil.associatedMedia.length === 1 ? 'w-2/3' : 'w-full grid grid-cols-1 md:grid-cols-2'}`}>
                {outil.associatedMedia.map((media: any) => (
                    <div key={media.id} className="rounded-2xl overflow-hidden relative shadow-lg">
                        <MediaViewer
                            src={media.thumbnail || media.url}
                            alt={media.title || outil.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
            </div>
        )}

          {/* Detailed Info List */}
          <div className="w-2/3 mx-auto flex flex-col mt-2.5 border-t border-c3">
               {/* Descriptif général */}
               {outil?.description && (
                   <div className="border-b-2 border-c3 py-6">
                       <h3 className="text-lg font-bold text-c6 mb-2">Descriptif général</h3>
                       <div className="text-c5 text-base leading-relaxed whitespace-pre-wrap">
                           {outil.description}
                       </div>
                   </div>
               )}

               {/* Type de l'outil */}
               {outil?.category && (
                   <div className="border-b-2 border-c3 py-6">
                       <h3 className="text-lg font-bold text-c6 mb-2">Type de l'outil</h3>
                       <p className="text-c5 text-base">{outil.category}</p>
                   </div>
               )}

               {/* Fonction */}
               {outil?.purpose && (
                   <div className="border-b-2 border-c3 py-6">
                       <h3 className="text-lg font-bold text-c6 mb-2">Fonction</h3>
                       <p className="text-c5 text-base">{outil.purpose}</p>
                   </div>
               )}

               {/* Systèmes d'exploitation */}
               {outil?.os && outil.os.length > 0 && (
                   <div className="border-b-2 border-c3 py-6">
                       <h3 className="text-lg font-bold text-c6 mb-2">Systèmes d'exploitation</h3>
                       <p className="text-c5 text-base">{outil.os.join(', ')}</p>
                   </div>
               )}

               {/* License */}
               {outil?.license && (
                   <div className="border-b-2 border-c3 py-6">
                       <h3 className="text-lg font-bold text-c6 mb-2">License</h3>
                       <p className="text-c5 text-base">{outil.license}</p>
                   </div>
               )}

               {/* Format de fichier */}
               {outil?.fileRelease && outil.fileRelease.length > 0 && (
                   <div className="border-b-2 border-c3 py-6">
                       <h3 className="text-lg font-bold text-c6 mb-2">Format de fichier</h3>
                       <p className="text-c5 text-base">{outil.fileRelease.join(', ')}</p>
                   </div>
               )}

               {/* Langage de programmation de l'outil */}
               {outil?.programmingLanguages && outil.programmingLanguages.length > 0 && (
                   <div className="border-b-2 border-c3 py-6">
                       <h3 className="text-lg font-bold text-c6 mb-2">Langage de programmation de l'outil</h3>
                       <p className="text-c5 text-base">
                           {outil.programmingLanguages.map((lang: any) => lang.title).join(', ')}
                       </p>
                   </div>
               )}
          </div>

      {/* Carousel 1: Resources using this outil (usedBy) */}
      {outil?.usedBy && outil.usedBy.length > 0 && (
          <div className="w-full flex flex-col items-center gap-12 mt-5">
              <div className="w-full">
                  <FullCarrousel
                    title="Ressources utilisant cet outil"
                    data={outil.usedBy}
                    perPage={4}
                    perMove={1}
                    renderSlide={(resource: any) => (
                          <ResourceCard 
                             item={resource} 
                             className="h-full"
                             key={resource.id}
                          />
                    )}
                  />
              </div>
          </div>
      )}
      
      {/* Carousel 2: Related Tools (Simple Cards) */}
        <div className="w-full">
            {loadingRelated ? (
                <div className="w-full h-[200px] flex items-center justify-center">
                    <Skeleton className="w-full h-full bg-c3 rounded-full"/>
                </div>
            ) : (
                <FullCarrousel
                    title="D'autres Outils à Découvrir"
                    data={relatedTools}
                    perPage={6}
                    perMove={1}
                    renderSlide={(t: any) => (
                        <SimpleToolCard outil={t} key={t.id}/>
                    )}
                />
            )}
        </div>

    </Layouts>
  );
};