import { useCallback, useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { addToast } from '@heroui/react';
import { Layouts } from '@/components/layout/Layouts';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/corpus/ResourceCard';
import { PageBanner } from '@/components/ui/PageBanner';
import { BookMarkIcon } from '@/components/ui/icons';
import { getWatchlistCards, type WatchlistCard } from '@/services/StudentSpace';
import { useWatchlist } from '@/hooks/useWatchlist';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.1 },
  }),
};

export const ListeLecture = () => {
  const { refresh: refreshWatchlistIds } = useWatchlist();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WatchlistCard[]>([]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getWatchlistCards();
      setItems(result.items ?? []);
      await refreshWatchlistIds();
    } catch (error) {
      console.error('Erreur chargement liste de lecture', error);
      addToast({
        title: 'Erreur',
        description: 'Impossible de charger votre liste de lecture.',
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [refreshWatchlistIds]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleToggle = useCallback(
    async (saved: boolean) => {
      if (!saved) {
        await loadItems();
      }
    },
    [loadItems],
  );

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<BookMarkIcon size={40} />}
        title='Liste de lecture'
        description='Retrouvez ici les ressources que vous avez sauvegardées pour les consulter plus tard.'
      />

      <div className='grid grid-cols-4 w-full gap-6'>
        {loading
          ? Array.from({ length: 8 }).map((_, index) => <ResourceCardSkeleton key={index} />)
          : items.length === 0
            ? (
              <div className='col-span-4 rounded-3xl border-2 border-c3 bg-c2/50 p-10 text-center'>
                <BookMarkIcon size={32} className='mx-auto mb-4 text-c4' />
                <p className='text-lg text-c6 font-medium'>Aucune ressource sauvegardée</p>
                <p className='text-sm text-c5 mt-2'>
                  Parcourez le corpus et cliquez sur l&apos;icône en bas à droite d&apos;une carte pour l&apos;ajouter ici.
                </p>
              </div>
            )
            : items.map((item, index) => (
              <motion.div key={item.id} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                <ResourceCard
                  title={item.title}
                  thumbnailUrl={item.thumbnail ?? undefined}
                  type={item.type}
                  item={{ ...item, id: Number(item.id) }}
                  onWatchlistToggle={handleToggle}
                />
              </motion.div>
            ))}
      </div>
    </Layouts>
  );
};
