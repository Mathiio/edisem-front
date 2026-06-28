import { CorpusCarousel } from "@/components/features/corpus/CorpusCarousel";
import { Layouts } from "@/components/layout/Layouts";
import * as Items from "@/services/Items";
import { useEffect, useState } from 'react';
import { PageBanner } from '@/components/ui/PageBanner';
import { ColloqueIcon } from '@/components/ui/icons';
import { Edition } from '@/types/ui';


export const Colloques = () => {
  const [colloqueEditions, setColloqueEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const editions = await Items.getEditionsByType('colloque');
        setColloqueEditions(editions);
      } catch (error) {
        console.error('Error loading colloques editions', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalEditions = colloqueEditions.length;
  const totalConferences = colloqueEditions.reduce((acc, ed) => acc + (ed.conferences?.length || 0), 0);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<ColloqueIcon size={40} />}
        title="Colloques Edisem"
        description="Plongez au cœur des collections intellectuelles d'EdiSem, une fenêtre ouverte sur la diversité des savoirs et des pratiques qui nourrissent nos événements."
        stats={[
          { label: 'éditions', value: totalEditions || 0 },
          { label: 'conférences', value: totalConferences || 0 }
        ]}
        backgroundScale={0.80}
      />
      <CorpusCarousel editions={colloqueEditions} loading={loading} title="Tous nos colloques" basePath="/corpus/colloques" />
    </Layouts>
  );
};