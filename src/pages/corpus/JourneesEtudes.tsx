import { CorpusCarousel } from "@/components/features/corpus/CorpusCarousel";
import { Layouts } from "@/components/layout/Layouts";
import * as Items from "@/services/Items";
import { useEffect, useState } from 'react';
import { Edition } from '@/types/ui';
import { PageBanner } from '@/components/ui/PageBanner';
import { StudyDayIcon } from '@/components/ui/icons';


export const JourneesEtudes = () => {
  const [studyDayEditions, setStudyDayEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const totalEditions = studyDayEditions.length;
  const totalConferences = studyDayEditions.reduce((acc, ed) => acc + (ed.conferences?.length || 0), 0);

  useEffect(() => {
    (async () => {
      try {
        const editions = await Items.getEditionsByType('journee_etudes');
        setStudyDayEditions(editions);
      } catch (error) {
        console.error('Error loading study day editions', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<StudyDayIcon size={40} />}
        title="Journées d'études Edisem"
        description="Plongez au cœur des collections intellectuelles d'EdiSem, une fenêtre ouverte sur la diversité des savoirs et des pratiques qui nourrissent nos événements."
        stats={[
          { label: 'éditions', value: totalEditions || 0 },
          { label: 'conférences', value: totalConferences || 0 }
        ]}
        backgroundScale={0.80}
      />
      <CorpusCarousel editions={studyDayEditions} loading={loading} title="Toutes nos Journées d'études" basePath="/corpus/journees-etudes" />
    </Layouts>
  );
};