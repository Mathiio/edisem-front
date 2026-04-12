import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layouts } from "@/components/layout/Layouts";
import * as Items from '@/services/Items';
import { motion, Variants } from 'framer-motion';
import { BackgroundEllipse } from '@/assets/svg/BackgroundEllipse';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/corpus/ResourceCard';
import { getResourceConfigByCollectionUrl } from '@/config/resourceConfig';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { slugUtils } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Animation variants
const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.1 },
  }),
};

// Map resource types to their fetcher functions
const FETCHER_MAP: Record<string, () => Promise<any[]>> = {
  'recit_scientifique': Items.getRecitsScientifiquesCards,
  'recit_techno_industriel': Items.getRecitsTechnoCards,
  'recit_citoyen': Items.getRecitsCitoyensCards,
  'recit_mediatique': Items.getRecitsMediatiquesCards,
  'recit_artistique': Items.getRecitsArtistiquesCards,
};

// Genre type
interface Genre {
  id: string | number;
  name: string;
  count: number;
  items: any[];
}

const GenreCard = ({ genre, basePath }: { genre: Genre, basePath: string }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const slug = slugUtils.toSlug(genre.name);
    navigate(`${basePath}/${slug}`, { state: { genreId: genre.id } });
  };

  return (
    <div
      onClick={handleClick}
      className="shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 cursor-pointer p-10 rounded-4xl flex flex-col gap-8 hover:bg-c2 h-full transition-all ease-in-out duration-200 group"
    >
      <div className="flex flex-col gap-5">
        <h2 className='text-3xl text-c6 font-medium transition-colors duration-200'>
          {genre.name}
        </h2>
        <p className="text-lg text-c4">
          {genre.count} {genre.count === 1 ? 'récit' : 'récits'}
        </p>
      </div>
    </div>
  );
};


export const RecitsByType: React.FC = () => {
    const location = useLocation();
    const [recits, setRecits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [genres, setGenres] = useState<Genre[]>([]);
    
    // Get config from RESOURCE_TYPES using collection URL
    const config = getResourceConfigByCollectionUrl(location.pathname);
    const fetcher = config ? FETCHER_MAP[config.type] : null;

    useEffect(() => {
        const loadData = async () => {
            if (!config || !fetcher) return;
            
            setLoading(true);
            try {
                const data = await fetcher();
                setRecits(data);
            } catch (error) {
                console.error(`Failed to load data for ${config.label}`, error);
                setRecits([]);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
        loadData();
    }, [config, fetcher]);

    useEffect(() => {
        if (!loading && recits.length > 0) {
          const genreMap: { [key: string]: Genre } = {};
    
          recits.forEach((item) => {
            if (!item.genres || !Array.isArray(item.genres)) return;
    
            item.genres.forEach((genreItem: any) => {
                const genreId = String(genreItem.id);
                const genreName = genreItem.label || genreItem.name; // Fallback to name if label missing
                
                if (!genreMap[genreId]) {
                    genreMap[genreId] = { 
                        id: genreItem.id,
                        name: genreName, 
                        count: 0, 
                        items: [] 
                    };
                }
                
                // Avoid duplicates
                if (!genreMap[genreId].items.some(i => i.id === item.id)) {
                    genreMap[genreId].items.push(item);
                    genreMap[genreId].count++;
                }
            });
          });
    
          const formattedGenres = Object.values(genreMap)
            .sort((a, b) => b.count - a.count);
    
          setGenres(formattedGenres);
        } else if (recits.length === 0) {
            setGenres([]);
        }
      }, [recits, loading]);

    if (!config) {
        return (
            <Layouts className='col-span-10 flex flex-col items-center justify-center min-h-[50vh]'>
                <p className="text-c4">Type de récit non trouvé.</p>
            </Layouts>
        );
    }

    const Icon = config.icon;

    return (
        <Layouts className='col-span-10 flex flex-col gap-24'>
             {/* Header section */}
            <div className='pt-24 justify-center flex items-center flex-col gap-5 relative'>
                <div className='gap-2.5 justify-between flex items-center flex-col'>
                    {/* Icon with custom color */}
                    {Icon && <Icon size={40} style={{ color: config.color }} />}

                    {/* Title and description */}
                    <h1 className='z-[12] text-6xl text-c6 font-medium flex text-center flex-col items-center max-w-[850px] leading-tight'>
                        {config.collectionLabel || config.label}
                    </h1>
                    <p className='text-c5 text-base z-[12] text-center max-w-[600px]'>
                        Découvrez les {recits.length} éléments dans cette collection.
                    </p>

                    {/* Background ellipse */}
                    <motion.div
                        className='top-[-50px] absolute z-[-1]'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, ease: 'easeIn' }}
                    >
                        <div className='opacity-20 dark:opacity-30'>
                            <BackgroundEllipse />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Carousel */}
             <div className="w-full pb-12">
            {/* Carousel */}
            {!loading && genres.length > 0 && (
             <div className="w-full pb-12">
                <FullCarrousel
                    title="Filtrer par genres"
                    data={genres}
                    perPage={3}
                    perMove={1}
                    renderSlide={(genre, index) => <GenreCard genre={genre} key={`${genre.id}-${index}`} basePath={`/corpus/genre`} />}
                />
            </div>
            )}
            </div>

            {/* Grid of Recits */}
            <div className='grid grid-cols-4 grid-rows-auto gap-5 pb-24'>
                {loading
                    ? Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="h-full">
                            <ResourceCardSkeleton />
                        </div>
                    ))
                    : recits.map((recit, index) => (
                        <motion.div 
                            initial='hidden' 
                            animate='visible' 
                            variants={fadeIn} 
                            key={recit.id || index} 
                            custom={index}
                        >
                            <ResourceCard item={recit} />
                        </motion.div>
                    ))
                }
            </div>
            
            {!loading && recits.length === 0 && (
                <div className='flex flex-col items-center justify-center py-5 gap-5'>
                  <div className='flex flex-col gap-2.5 text-center'>
                    <h3 className='text-2xl font-medium text-c6'>Aucun récit trouvé</h3>
                    <p className='text-base text-c4'>Il n'y a pas encore d'éléments dans cette collection.</p>
                  </div>
                </div>
            )}
        </Layouts>
    );
};