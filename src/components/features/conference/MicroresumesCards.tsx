import React, { useState } from 'react';
import { Button, Link, Skeleton } from '@heroui/react';
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

interface MicroresumeCardProps {
  id: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  outils: {
    id: string;
    title: string;
    thumbnail: string;
  }[];
  onTimeChange: (time: number) => void;
}

export const MicroresumeCard: React.FC<MicroresumeCardProps> = ({ title, description, startTime, endTime, outils, onTimeChange }) => {
  const [expanded, setExpanded] = useState(false);
  const CHARACTER_LIMIT = 350;
  const shouldTruncate = description.length > CHARACTER_LIMIT;

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
    // Convertir en nombre si nécessaire
    const time = typeof startTime === 'string' ? parseInt(startTime, 10) : startTime;

    onTimeChange(time);
  };

  const toggleExpansion = () => {
    setExpanded(!expanded);
  };

  const displayText = expanded ? description : description.slice(0, CHARACTER_LIMIT);

  return (
    <div className='w-full flex flex-row justify-start border-2 p-6 border-c3 rounded-xl items-start gap-2.5 transition-transform-colors-opacity overflow-hidden'>
      <div className='flex flex-col gap-6 min-w-0 w-full'>
        <div className='w-full flex justify-between items-center gap-2.5'>
          <div className='flex flex-col gap-2'>
            <Button
              onClick={handleClick}
              className='self-start px-2.5 py-1.5 h-auto text-base rounded-md text-c6 hover:text-c6 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200 whitespace-nowrap'>
              {formatTime(startTime) + ' - ' + formatTime(endTime)}
            </Button>
            {title && <h3 className='text-c6 text-base font-medium break-words'>{title}</h3>}
          </div>
        </div>

        <div className='text-sm text-c4 font-normal transition-all ease-in-out duration-200 break-words overflow-hidden'>
          {displayText}
          {shouldTruncate && (
            <div className='mt-2 w-full flex justify-start'>
              <button onClick={toggleExpansion} className='text-base text-c6 font-medium cursor-pointer transition-all ease-in-out duration-200'>
                {expanded ? 'afficher moins' : '...afficher plus'}
              </button>
            </div>
          )}
        </div>
        {outils && outils.length > 0 && (
          <div className='w-full flex flex-row justify-start items-center gap-2.5'>
            <Link
              href={'/corpus/outil/' + outils[0].id}
              className='shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-lg border-2 border-c3 p-2 text-base gap-2.5 text-c6 transition-all ease-in-out duration-200'>
              <img src={outils[0].thumbnail} alt={outils[0].title} className='w-8 object-cover rounded-md' />
              <p className='text-sm text-c6'>{outils[0].title}</p>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export const MicroresumeSkeleton: React.FC = () => {
  return (
    <div className='w-full flex flex-col justify-start rounded-xl bg-c3 items-start p-2.5 gap-1.5 transition-transform-colors-opacity'>
      <div className='w-full flex justify-start items-center gap-2.5'>
        <Skeleton className='w-[55%] h-4 rounded-md' />
      </div>
      <Skeleton className='w-full h-4 rounded-md' />
      <Skeleton className='w-full h-4 rounded-md' />
      <Skeleton className='w-full h-4 rounded-md' />
      <Skeleton className='w-full h-4 rounded-md' />
      <Skeleton className='w-full h-4 rounded-md' />
      <Skeleton className='w-full h-4 rounded-md' />
      <Skeleton className='w-[30%] h-4 rounded-md' />
    </div>
  );
};

interface MicroresumesProps {
  microresumes: {
    id: number;
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    outils: { id: string; title: string; thumbnail: string }[];
  }[];
  loading: boolean;
  onTimeChange: (time: number) => void;
}

export const Microresumes: React.FC<MicroresumesProps> = ({ microresumes, loading, onTimeChange }) => {
  // Si pas de microresumes et pas en chargement, ne rien afficher (cacher la vue)
  if (!loading && (!microresumes || microresumes.length === 0)) {
    return null;
  }

  return (
    <div className='w-full h-max flex flex-col gap-5'>
      <div className='flex flex-col gap-5 h-full overflow-y-auto scroll-container'>
        {loading
          ? Array.from({ length: 8 }, (_, i) => <MicroresumeSkeleton key={i} />)
          : microresumes.map((microresume, index) => (
              <motion.div key={microresume.id} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                <MicroresumeCard
                  key={index}
                  id={microresume.id}
                  startTime={microresume.startTime}
                  endTime={microresume.endTime}
                  title={microresume.title}
                  description={microresume.description}
                  outils={microresume.outils}
                  onTimeChange={onTimeChange}
                />
              </motion.div>
            ))}
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
