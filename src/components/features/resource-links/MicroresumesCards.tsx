import React, { useState } from 'react';
import { Button, Link } from '@heroui/react';

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
    <div className='w-full flex flex-row justify-start border-2 p-4 border-c3 rounded-xl items-start gap-2 transition-transform-colors-opacity overflow-hidden'>
      <div className='flex flex-col gap-6 min-w-0 w-full'>
        <div className='w-full flex justify-between items-center gap-2'>
          <Button
            onClick={handleClick}
            className='px-2 py-1.5 text-sm rounded-lg text-c6 hover:text-c6 bg-c2 border-2 border-c3 hover:bg-c3 transition-all ease-in-out duration-200 whitespace-nowrap'>
            {formatTime(startTime) + ' - ' + formatTime(endTime)}
          </Button>
          {outils && outils.length > 0 && (
            <Link
              href={'/corpus/outil/' + outils[0].id}
              className='flex items-center cursor-pointer bg-c2 rounded-lg border-2 border-c3 p-2 text-base gap-2 text-c6 transition-all ease-in-out duration-200'>
              <img src={outils[0].thumbnail} alt={outils[0].title} className='w-6 object-cover rounded-md' />
              <p className='text-sm text-c6'>{outils[0].title}</p>
            </Link>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          {title && <h3 className='text-c6 text-base font-medium break-words'>{title}</h3>}
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
        </div>
      </div>
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
  if (loading) return null;

  if (!microresumes || microresumes.length === 0) {
    return null;
  }

  return (
    <div className='w-full flex flex-col gap-5'>
      <div className='flex flex-col gap-5'>
        {microresumes.map((microresume) => (
          <MicroresumeCard
            key={microresume.id}
            id={microresume.id}
            startTime={microresume.startTime}
            endTime={microresume.endTime}
            title={microresume.title}
            description={microresume.description}
            outils={microresume.outils}
            onTimeChange={onTimeChange}
          />
        ))}
      </div>
    </div>
  );
};

