import React from 'react';
import { Conference } from '@/types/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';

interface IntervenantInterventionsProps {
  interventions: Conference[];
  loading?: boolean;
}

export const IntervenantInterventions: React.FC<IntervenantInterventionsProps> = ({ interventions, loading }) => {

  if (loading) {
    return (
      <div className='w-full flex flex-col items-center gap-12'>
        <div className='flex flex-col gap-2 justify-center items-center animate-pulse'>
          <div className='w-48 h-9 rounded-xl bg-c3/50' />
          <div className='w-72 h-5 rounded-lg bg-c3/50' />
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full'>
          {Array.from({ length: 8 }).map((_, j) => (
            <ResourceCardSkeleton key={j} />
          ))}
        </div>
      </div>
    );
  }

  if (interventions.length === 0) return null;

  return (
    <div className='w-full flex flex-col items-center gap-12'>
      <div className='flex flex-col gap-2 justify-center items-center'>
        <h2 className='text-c6 text-3xl transition-all ease-in-out'>Interventions</h2>
        <p className='text-base text-c5'>Retrouvez toutes les participations de cet intervenant</p>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full'>
        {interventions.map((item, i) => (
          <ResourceCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
};
