import { BackgroundEllipse } from '@/assets/svg/BackgroundEllipse';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import { Layouts } from '@/components/layout/Layouts';
import { slugUtils } from '@/lib/utils';
import * as Items from '@/services/Items';
import { motion, Variants } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.1 },
  }),
};

export const RecitsByGenre: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [genreName, setGenreName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      
      const [
          recitsMediatiques, 
          docsScientifiques, 
          objetsTechno, 
          recitsCitoyens,
          recitsArtistiques
      ] = await Promise.all([
        Items.getRecitsMediatiquesCards(),
        Items.getRecitsScientifiquesCards(),
        Items.getRecitsTechnoCards(),
        Items.getRecitsCitoyensCards(),
        Items.getRecitsArtistiquesCards()
      ]);

      const allRecits = [
          ...recitsMediatiques, 
          ...docsScientifiques, 
          ...objetsTechno, 
          ...recitsCitoyens,
          ...recitsArtistiques
      ];

      // Filter by genre
      const filteredItems = allRecits.filter((item: any) => {
        if (!item.genres || !Array.isArray(item.genres)) return false;
        
        return item.genres.some((g: any) => {
          return slugUtils.matches(g.label, slug);
        });
      });

      // Extract genre name from the first match
      if (filteredItems.length > 0) {
         // Find the matching genre label
         const match = filteredItems[0].genres.find((g: any) => slugUtils.matches(g.label, slug));
         if (match) {
             setGenreName(match.label);
         } else {
             setGenreName(slugUtils.toTitle(slug));
         }
      } else {
        setGenreName(slugUtils.toTitle(slug));
      }

      // Sort by date (newest first)
      const sortedItems = filteredItems.sort((a: any, b: any) => {
        const dateA = parseInt(a.date) || 0;
        const dateB = parseInt(b.date) || 0;
        return dateB - dateA;
      });

      setItems(sortedItems);
    } catch (error) {
      console.error('❌ Error fetching items by genre:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayTitle = genreName || slugUtils.toTitle(slug || '') || 'Genre';

  return (
    <Layouts className='col-span-10 flex flex-col gap-24'>
      {/* Header section */}
      <div className='pt-24 justify-center flex items-center flex-col gap-5 relative'>
        <div className='gap-2.5 justify-between flex items-center flex-col'>
          {/* Title and description */}
          <h1 className='z-[12] text-6xl text-c6 font-medium flex text-center flex-col items-center max-w-[850px]'>
            {displayTitle}
          </h1>
          <p className='text-c5 text-base z-[12] text-center max-w-[600px]'>
            Découvrez les {items.length} {items.length === 1 ? 'élément' : 'éléments'} en lien avec ce thème
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
      {/* Items grid */}
      <div className='grid grid-cols-4 grid-rows-auto gap-5'>
        {loading
          ? Array.from({ length: 8 }).map((_, index) => <ResourceCardSkeleton key={index} />)
          : items.map((item, index) => (
            <motion.div initial='hidden' animate='visible' variants={fadeIn} key={item.id} custom={index}>
              <ResourceCard item={item} />
            </motion.div>
          ))}
      </div>
      {/* No items found message */}
      {!loading && items.length === 0 && (
        <div className='flex flex-col items-center justify-center py-24 gap-5'>
          <div className='flex flex-col gap-2.5 text-center'>
            <h3 className='text-2xl font-medium text-c6'>Aucun élément trouvé</h3>
            <p className='text-base text-c4'>Il n'y a pas encore d'éléments dans la catégorie "{displayTitle}".</p>
          </div>
        </div>
      )}
    </Layouts>
  );
};
