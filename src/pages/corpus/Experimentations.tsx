import { ResourceCard, ResourceCardSkeleton } from '@/components/features/corpus/ResourceCard';
import { Layouts } from '@/components/layout/Layouts';
import { ExperimentationIcon } from '@/components/ui/icons';
import { PageBanner } from '@/components/ui/PageBanner';
import { getExperimentationCards } from '@/services/Items';
import { motion, Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.15 },
  }),
};

export const Experimentations: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [experimentations, setExperimentations] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    const fetchAndProcessData = async () => {
      try {
        const data = await getExperimentationCards();
        setExperimentations(data);
      } catch (error) {
        console.error('Erreur lors du chargement des expérimentations', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAndProcessData();
  }, []);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<ExperimentationIcon size={40} />}
        title='Expérimentations Edisem'
        description="Plongez au cœur des collections intellectuelles d'EdiSem, une fenêtre ouverte sur la diversité des savoirs et des pratiques qui nourrissent nos événements."
        backgroundScale={0.80}
      />
      <div className='grid grid-cols-4 w-full gap-6'>
        {loading
          ? Array.from({ length: 8 }).map((_, index) => <ResourceCardSkeleton key={index} />)
          : experimentations.map((exp: any, index: number) => (
              <motion.div key={exp.id} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                <ResourceCard 
                  title={exp.title}
                  thumbnailUrl={exp.thumbnail}
                  authors={exp.authors}
                  subtitle={exp.subtitle}
                  type={exp.type}
                  item={{ ...exp }} 
                />
              </motion.div>
            ))}
      </div>
    </Layouts>
  );
};
