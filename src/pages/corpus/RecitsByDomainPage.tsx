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

export const RecitsByDomain: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [domainName, setDomainName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);

      const [recitsMediatiques, docsScientifiques, objetsTechno, recitsCitoyens, recitsArtistiques] = await Promise.all([
        Items.getRecitsMediatiquesCards(),
        Items.getRecitsScientifiquesCards(),
        Items.getRecitsTechnoCards(),
        Items.getRecitsCitoyensCards(),
        Items.getRecitsArtistiquesCards(),
      ]);

      const allRecits = [...recitsMediatiques, ...docsScientifiques, ...objetsTechno, ...recitsCitoyens, ...recitsArtistiques];

      const filteredItems = allRecits.filter((item: any) => {
        if (!item.subjects || !Array.isArray(item.subjects)) return false;

        return item.subjects.some((subject: any) => slugUtils.matches(subject.label, slug));
      });

      if (filteredItems.length > 0) {
        const match = filteredItems[0].subjects.find((subject: any) => slugUtils.matches(subject.label, slug));
        setDomainName(match?.label || slugUtils.toTitle(slug));
      } else {
        setDomainName(slugUtils.toTitle(slug));
      }

      const sortedItems = filteredItems.sort((a: any, b: any) => {
        const dateA = parseInt(a.date) || 0;
        const dateB = parseInt(b.date) || 0;
        return dateB - dateA;
      });

      setItems(sortedItems);
    } catch (error) {
      console.error('Error fetching items by domain:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayTitle = domainName || slugUtils.toTitle(slug || '') || 'Domaine';

  return (
    <Layouts className='col-span-10 flex flex-col gap-24'>
      <div className='pt-24 justify-center flex items-center flex-col gap-5 relative'>
        <div className='gap-2.5 justify-between flex items-center flex-col'>
          <h1 className='z-[12] text-6xl text-c6 font-medium flex text-center flex-col items-center max-w-[850px]'>
            {displayTitle}
          </h1>
          <p className='text-c5 text-base z-[12] text-center max-w-[600px]'>
            Découvrez les {items.length} {items.length === 1 ? 'récit' : 'récits'} en lien avec ce domaine
          </p>
          <motion.div
            className='top-[-50px] absolute z-[-1]'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeIn' }}>
            <div className='opacity-20 dark:opacity-30'>
              <BackgroundEllipse />
            </div>
          </motion.div>
        </div>
      </div>

      <div className='grid grid-cols-4 grid-rows-auto gap-5'>
        {loading
          ? Array.from({ length: 8 }).map((_, index) => <ResourceCardSkeleton key={index} />)
          : items.map((item, index) => (
              <motion.div initial='hidden' animate='visible' variants={fadeIn} key={item.id} custom={index}>
                <ResourceCard item={item} />
              </motion.div>
            ))}
      </div>

      {!loading && items.length === 0 && (
        <div className='flex flex-col items-center justify-center py-24 gap-5'>
          <div className='flex flex-col gap-2.5 text-center'>
            <h3 className='text-2xl font-medium text-c6'>Aucun récit trouvé</h3>
            <p className='text-base text-c4'>Il n'y a pas encore de récits dans le domaine « {displayTitle} ».</p>
          </div>
        </div>
      )}
    </Layouts>
  );
};
