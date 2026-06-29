import { CorpusCarousel } from "@/components/features/shared/corpus/CorpusCarousel";
import { Layouts } from "@/components/layout/Layouts";
import * as Items from "@/services/Items";
import { useEffect, useState } from 'react';
import { SeminaireIcon } from "@/components/ui/icons";
import { PageBanner } from "@/components/ui/PageBanner";
import { Edition } from '@/types/ui';


export const Seminaires = () => {
  const [seminarEditions, setSeminarEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const totalEditions = seminarEditions.length;
  const totalConferences = seminarEditions.reduce((acc, ed) => acc + (ed.conferences?.length || 0), 0);

  useEffect(() => {
    (async () => {
      try {
        const editions = await Items.getEditionsByType('seminaire');
        setSeminarEditions(editions);
      } catch (error) {
        console.error('Error loading seminars & editions', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<SeminaireIcon size={40} />}
        title="Séminaires Edisem"
        description="Plongez au cœur des collections intellectuelles d'EdiSem, une fenêtre ouverte sur la diversité des savoirs et des pratiques qui nourrissent nos événements."
        stats={[
          { label: 'éditions', value: totalEditions || 0 },
          { label: 'conférences', value: totalConferences || 0 }
        ]}
        backgroundScale={0.80}
      />
      <CorpusCarousel editions={seminarEditions} loading={loading} title="Tous nos séminaires" />
    </Layouts>
  );
};