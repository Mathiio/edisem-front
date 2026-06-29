import React from 'react';
import { InfiniteCarousel } from '@/components/ui/InfiniteCarousel';
import { IntervenantCard, IntervenantSkeleton } from '@/components/features/pages/intervenants/IntervenantCards';
import { Actant } from '@/types/ui';

type IntervenantsCarouselProps = {
  intervenants: Actant[];
  loading?: boolean;
};

export const IntervenantsCarousel: React.FC<IntervenantsCarouselProps> = ({ 
  intervenants, 
  loading
}) => {

  return (
    <div className='relative w-full'>
      <InfiniteCarousel
        items={intervenants}
        loading={loading}
        renderItem={(intervenant) => <IntervenantCard {...intervenant} />}
        renderSkeleton={() => <IntervenantSkeleton />}
        skeletonCount={12}
        itemWidth={250}
        gap={20}
        speed={40}
        hoverSpeed={0}
        ariaLabel="Carrousel des intervenants"
      />
    </div>
  );
};