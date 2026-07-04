import React, { useState } from 'react';
import { Button } from '@heroui/react';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';

interface CitationCardProps {
  startTime: number;
  endTime: number;
  actant: any;
  id: number;
  citation: string;
  onTimeChange: (time: number) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({ id: _id, startTime, endTime, actant, citation, onTimeChange }) => {
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
    <div className='w-full flex flex-row justify-start border-2 p-4 border-c3 rounded-xl items-start gap-2.5 transition-transform-colors-opacity overflow-hidden'>
      <div className='flex flex-col gap-6 min-w-0 w-full'>
        <div className='w-full flex justify-between items-center gap-2.5'>
          <div className='flex items-center gap-2'>
            <Button onClick={handleClick} className='px-2 py-1.5 text-sm rounded-lg text-c6 hover:text-c6 bg-c2 border-2 border-c3 hover:bg-c3 transition-all ease-in-out duration-200'>
              {formatTime(startTime) + ' - ' + formatTime(endTime)}
            </Button>
            <h3 className='text-c6 text-base font-medium'>{actant}</h3>
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
      </div>
    </div>
  );
};

interface CitationsProps {
  citations: { id: number; citation: string; actant: any; startTime: number; endTime: number }[];
  loading: boolean;
  onTimeChange: (time: number) => void;
}

export const Citations: React.FC<CitationsProps> = ({ citations, loading, onTimeChange }) => {
  if (loading) return null;

  return (
    <div className='w-full flex flex-col gap-5'>
      <div className='flex flex-col gap-5'>
        {citations.length === 0 ? (
          <EmptyStateCard message="Aucune citation n'est liée au contenu de cette conférence." />
        ) : (
          citations.map((citation) => (
            <CitationCard
              key={citation.id}
              id={citation.id}
              startTime={citation.startTime}
              endTime={citation.endTime}
              actant={citation.actant.firstname + ' ' + citation.actant.lastname}
              citation={citation.citation}
              onTimeChange={onTimeChange}
            />
          ))
        )}
      </div>
    </div>
  );
};

