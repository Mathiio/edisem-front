import React from 'react';
import { motion, Variants } from 'framer-motion';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 10 } },
};

type KeywordsCardProps = {
  word?: string;
  onSearchClick?: (searchTerm: string) => void;
};

export const KeywordsCard: React.FC<KeywordsCardProps> = ({ word, onSearchClick }) => {
  const handleClick = () => {
    if (word && onSearchClick) {
      onSearchClick(word);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className='border-2 border-c3 h-full rounded-xl flex items-center justify-start p-2.5 cursor-pointer hover:border-c4 transition-all ease-in-out duration-200'
      onClick={handleClick}>
      <p className='text-sm text-c4 font-normal'>{word}</p>
    </motion.div>
  );
};

export const KeywordsSkeleton: React.FC<{ className?: string }> = ({ className = 'w-28' }) => (
  <div className={`h-10 rounded-lg shrink-0 bg-c3 animate-pulse ${className}`} />
);

export const KeywordsCarouselSkeleton: React.FC = () => (
  <div className='flex w-full justify-between items-center gap-6'>
    <div className='flex gap-4 flex-1 min-w-0'>
      <KeywordsSkeleton className='w-32' />
      <KeywordsSkeleton className='w-36' />
      <KeywordsSkeleton className='w-24' />
      <KeywordsSkeleton className='w-40' />
    </div>
    <div className='flex gap-2.5 shrink-0'>
      <div className='w-10 h-10 rounded-lg shrink-0 bg-c3 animate-pulse' />
      <div className='w-10 h-10 rounded-lg shrink-0 bg-c3 animate-pulse' />
    </div>
  </div>
);
