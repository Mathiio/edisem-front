import React, { useEffect, useState, useMemo } from 'react';
import { Layouts } from '@/components/layout/Layouts';
import * as Items from '@/services/Items';
import * as Analytics from '@/services/Analytics';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { PratiqueNarrativeIcon } from '@/components/ui/icons';
import { KeywordsBarChart } from '@/components/features/shared/corpus/KeywordsBarChart';
import { CorpusNavCard } from '@/components/features/shared/corpus/CorpusNavCard';
import { ResourceCard } from '@/components/features/shared/corpus/ResourceCard';
import { PageBanner } from '@/components/ui/PageBanner';
import { RESOURCE_TYPES } from '@/config/resourceConfig';

export const PratiquesNarratives: React.FC = () => {
  const [metrics, setMetrics] = useState({
    recits: 0,
    experimentations: 0
  });
  const [experimentationsData, setExperimentationsData] = useState<any[]>([]);
  const [keywordCounts, setKeywordCounts] = useState<{ label: string, value: number }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Use optimized backend stats from Analytics service
        const [stats, keywords, experimentations] = await Promise.all([
          Analytics.getNarrativePracticesStats(),
          Analytics.getNarrativeTopKeywords(8),
          Items.getExperimentationCards()
        ]);

        setMetrics({
          recits: stats.recits || 0,
          experimentations: stats.experimentations || 0
        });
        
        setExperimentationsData(experimentations);
        setKeywordCounts(keywords || []);

      } catch (error) {
        console.error("Failed to load Pratiques Narratives data", error);
      }
    };
    loadData();
  }, []);

  const navCards = useMemo(() => {
    const expConfig = RESOURCE_TYPES.experimentation;
    
    return [
      {
        id: 'exp',
        title: expConfig.collectionLabel || expConfig.label,
        description: 'Explorations interdisciplinaires et démarches expérimentales',
        path: expConfig.collectionUrl || expConfig.getUrl(''),
        icon: expConfig.icon
      },
      {
        id: 'recits',
        title: "Mises en récits de l'IA",
        description: 'Exploration des imaginaires et représentations médiatiques',
        path: '/corpus/mises-en-recits',
        icon: PratiqueNarrativeIcon
      }
    ];
  }, []);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<PratiqueNarrativeIcon size={40} />}
        title="IA et Pratiques Narratives"
        description="Explorez les récits qui façonnent les imaginaires sociotechniques de l'intelligence artificielle. Découvrez quelles sont les stratégies narratives qui orientent les usages de ces technologies"
        stats={[
          { label: 'Mises en Récits', value: metrics.recits },
          { label: 'Expérimentations', value: metrics.experimentations }
        ]}
        backgroundScale={0.80}
      />

      {/* Section 1: Navigation Carousel */}
      <section className="w-full">
        <FullCarrousel
          title="Explorer le Corpus"
          data={navCards}
          perPage={3}
          perMove={1}
          renderSlide={(card, index) => <CorpusNavCard card={card} index={index} key={card.id} />}
        />
      </section>

      {/* Section 3: Keyword Chart */}
      <KeywordsBarChart data={keywordCounts} />

      {/* Section 4: Latest Experimentations */}
      <section className="w-full flex flex-col gap-5">
        <h2 className="text-2xl font-medium text-c6">Dernières Expérimentations</h2>
        <div className="grid grid-cols-4 grid-rows-auto gap-5">
          {experimentationsData.slice(0, 5).map((exp) => (
            <ResourceCard 
              title={exp.title}
              thumbnailUrl={exp.thumbnail}
              authors={exp.authors}
              subtitle={exp.subtitle}
              type={exp.type}
              item={{ ...exp }}
              key={exp.id}
            />
          ))}
        </div>
      </section>
    </Layouts>
  );
};
