import { FullCarrousel } from '@/components/ui/Carrousels';
import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { Edition } from '@/types/ui';
import { getSeasonOrder } from '@/lib/utils';

interface CorpusCarouselProps {
  editions: Edition[];
  loading?: boolean;
  title: string;
  basePath?: string;
}

// Card animation configuration
const cardVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (index: number) => ({
    opacity: 1,
    transition: {
      duration: 0.8,
      delay: 0.1 + index * 0.2,
      ease: "easeInOut"
    },
  }),
};

// Generic Edition Card Component
const EditionCard = ({ edition, basePath = '/corpus/seminaires' }: { edition: Edition, basePath?: string }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`${basePath}/edition/${edition.id}`);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      onClick={handleClick}
      data-testid="edition-card"
      className="border-c3 border-2 cursor-pointer p-8 rounded-3xl flex flex-col justify-between gap-4 bg-c1 hover:bg-c2/60 h-full transition-all ease-in-out duration-200"
    >
      <h2 className='text-2xl text-c6 font-medium'>{edition.title}</h2>
      <div className='flex flex-col items-start'>
        <p className="text-base text-c4">
          Édition {edition.season} {edition.year}
        </p>
        <p className="text-sm text-c4">
          {edition.conferences?.length ?? 0} conférences
        </p>
      </div>
    </motion.div>
  );
};

const EditionCardSkeleton = () => {
  return (
    <div className="border-c3 border-2 p-10 rounded-4xl flex flex-col gap-10 h-full animate-pulse">
      <div className="flex flex-col items-start gap-2">
        <div className="rounded-lg w-full h-8 bg-c3/50" />
        <div className="rounded-lg w-full h-8 bg-c3/50" />
        <div className="rounded-lg w-3/4 h-8 bg-c3/50" />
      </div>
      <div className="flex flex-col items-start gap-2">
        <div className="rounded-lg w-1/2 h-4 bg-c3/50" />
        <div className="rounded-lg w-1/4 h-4 bg-c3/50" />
      </div>
    </div>
  );
};

// Main Carousel Component
export const CorpusCarousel = ({ editions, loading = false, title, basePath = '/corpus/seminaires' }: CorpusCarouselProps) => {
  
  const sortedEditions = [...editions].sort((a, b) => {
    if (b.year !== a.year) return Number(b.year) - Number(a.year);
    return getSeasonOrder(b.season) - getSeasonOrder(a.season);
  });

  if (loading) {
     return (
        <div className="w-full max-w-full">
             <FullCarrousel
              title={title}
              data={[1,2,3]} // Dummy data for skeleton
              perPage={3}
              perMove={1}
              renderSlide={() => <EditionCardSkeleton />}
            />
        </div>
     )
  }

  if (!editions || editions.length === 0) return null;

  return (
    <div className="w-full max-w-full">
        <FullCarrousel
          title={title}
          data={sortedEditions}
          perPage={3}
          perMove={1}
          renderSlide={(edition, index) => <EditionCard edition={edition} basePath={basePath} key={index} />}
        />
    </div>
  );
};
