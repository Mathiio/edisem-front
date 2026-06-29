import React from 'react';
import { Layouts } from '@/components/layout/Layouts';
import { HomeBanner } from '@/components/features/pages/home/HomeBanner';
import { KeywordHighlight } from '@/components/features/pages/home/KeywordHighlight';
import { LogoCarousel } from '@/components/features/pages/home/LogoCarousel';
import { IntervenantsSection } from '@/components/features/pages/home/IntervenantsSection';
import { CorpusSection } from '@/components/features/pages/home/CorpusSection';


export const Home: React.FC = () => {

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <HomeBanner />
      <LogoCarousel/>
      <CorpusSection />
      <IntervenantsSection/>
      <KeywordHighlight />
    </Layouts>
  );
};
