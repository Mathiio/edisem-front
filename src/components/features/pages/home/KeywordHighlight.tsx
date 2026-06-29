import React from 'react';
import { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import * as Items from '@/services/Items';
import { Keyword } from '@/types/ui';


const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.15 },
  }),
};

export const KeywordHighlight: React.FC = () => {
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [filteredResources, setFilteredResources] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAndProcessData = async () => {
      try {
        const keywords = await Items.getKeywords();

        // Filter keywords by popularity directly from the API response
        const filteredKeywords = keywords.filter((k: any) => (k.popularity && k.popularity > 20) || (k.linkCount && k.linkCount > 20));
        
        if (filteredKeywords.length > 0) {
          const randomKeyword = filteredKeywords[Math.floor(Math.random() * filteredKeywords.length)];
          setSelectedKeyword(randomKeyword);

          // Use new backend endpoint to get diverse resource types
          const resources = await Items.getResourceCardsByKeyword(randomKeyword.id, 12);
          setFilteredResources(resources);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessData();
  }, []);

  if (!selectedKeyword) return null;

  return (
    <div data-testid="keyword-section" className='w-full justify-center flex items-center flex-col gap-6 overflow-visible'>
      <div className='py-12 gap-5 justify-between flex items-center flex-col'>
        <h2 className='z-[12] text-5xl text-c6 font-medium flex flex-col items-center transition-all ease-in-out duration-200 '>
          <span>Sujets autour de</span>
          <span className='text-center bg-gradient-to-t from-action to-action2 text-transparent bg-clip-text bg-[length:150%] bg-top font-[500]'>
            "{selectedKeyword?.title || ''}"
          </span>
        </h2>
      </div>
      <div className='grid grid-cols-4 w-full gap-6'>
        {loading
          ? Array.from({ length: 12 }).map((_, index) => <ResourceCardSkeleton key={index} />)
          : filteredResources.map((resource, index) => (
              <motion.div key={resource.id} data-testid="keyword-resource-card" initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                <ResourceCard item={resource} />
              </motion.div>
            ))}
      </div>
    </div>
  );
};
