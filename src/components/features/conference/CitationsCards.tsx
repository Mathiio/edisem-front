import React, { useState } from 'react';
import { Button, Skeleton } from '@heroui/react';
import { FileIcon } from '@/components/ui/icons';
import { motion, Variants } from 'framer-motion';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.15 },
  }),
};

interface CitationCardProps {
  startTime: number;
  endTime: number;
  actant: any;
  id: number;
  citation: string;
  onTimeChange: (time: number) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({ id, startTime, endTime, actant, citation, onTimeChange }) => {
  const [expanded, setExpanded] = useState(false);
  const CHARACTER_LIMIT = 350;
  const shouldTruncate = citation.length > CHARACTER_LIMIT;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = secs.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

  const handleClick = () => {
    onTimeChange(startTime);
  };

  const toggleExpansion = () => {
    setExpanded(!expanded);
  };

  const displayText = expanded ? citation : citation.slice(0, CHARACTER_LIMIT);

  return (
    <div className='w-full flex flex-row justify-start border-2 p-6 border-c3 rounded-xl items-start gap-2.5 transition-transform-colors-opacity'>
      <div className='flex flex-col gap-6'>
        <div className='w-full flex justify-between items-center gap-2.5'>
          <div className='flex flex-row gap-2.5'>
            <Button onClick={handleClick} className='px-2.5 py-1.5 h-auto text-base rounded-md text-c6 hover:text-c6 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'>
              {formatTime(startTime) + ' - ' + formatTime(endTime)}
            </Button>
            <h3 className='text-c6 text-base font-medium'>{actant}</h3>
          </div>

        </div>

        <div className='text-base text-c4 font-normal transition-all ease-in-out duration-200'>
          {displayText}
          {shouldTruncate && (
            <div className='mt-2 w-full flex justify-start'>
              <button onClick={toggleExpansion} className='text-base text-c6 font-medium cursor-pointer transition-all ease-in-out duration-200'>
                {expanded ? 'afficher moins' : '...afficher plus'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CitationSkeleton: React.FC = () => {
  return (
    <div className='w-full flex flex-col justify-start rounded-xl bg-c3 items-start p-2.5 gap-1.5 transition-transform-colors-opacity'>
      <div className='w-full flex justify-start items-center gap-2.5'>
        <Skeleton className='w-[55%] h-4 rounded-md'/>
      </div>
      <Skeleton className='w-full h-4 rounded-md'/>
      <Skeleton className='w-full h-4 rounded-md'/>
      <Skeleton className='w-full h-4 rounded-md'/>
      <Skeleton className='w-full h-4 rounded-md'/>
      <Skeleton className='w-full h-4 rounded-md'/>
      <Skeleton className='w-full h-4 rounded-md'/>
      <Skeleton className='w-[30%] h-4 rounded-md'/>
    </div>
  );
};

interface CitationsProps {
  citations: { id: number; citation: string; actant: any; startTime: number; endTime: number }[];
  loading: boolean;
  onTimeChange: (time: number) => void;
}

export const Citations: React.FC<CitationsProps> = ({ citations, loading, onTimeChange }) => {

  return (
    <div className='w-full h-max flex flex-col gap-5'>
      <div className='flex flex-col gap-5 h-full overflow-y-auto scroll-container'>
        {loading ? (
          Array.from({ length: 8 }, (_, i) => <CitationSkeleton key={i} />)
        ) : citations.length === 0 ? (
          <UnloadedCard />
        ) : (
          citations.map((citation, index) => (
            <motion.div key={citation.id} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
              <CitationCard
                key={index}
                id={citation.id}
                startTime={citation.startTime}
                endTime={citation.endTime}
                actant={citation.actant.firstname + ' ' + citation.actant.lastname}
                citation={citation.citation}
                onTimeChange={onTimeChange}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export const UnloadedCard: React.FC = () => {
  return (
    <div className='w-full h-full flex flex-col justify-center items-center gap-5 mt-12'>
      <FileIcon size={42} className='text-c6' />
      <div className='w-[80%] flex flex-col justify-center items-center gap-2.5'>
        <h2 className='text-c6 text-3xl font-medium'>Oups !</h2>
        <p className='text-c5 text-base text-regular text-center'>
          Aucune citation n'est liée au contenu de cette conférence. Veuillez vérifier plus tard ou explorer d'autres sections de notre site.
        </p>
      </div>
    </div>
  );
};
