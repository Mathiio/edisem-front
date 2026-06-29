import React, { useEffect, useState, useMemo } from 'react';
import { Layouts } from "@/components/layout/Layouts";
import * as Items from '@/services/Items';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { PratiqueNarrativeIcon } from '@/components/ui/icons';
import { PageBanner } from '@/components/ui/PageBanner';
import { CorpusNavCard } from '@/components/features/shared/corpus/CorpusNavCard';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import { RESOURCE_TYPES } from '@/config/resourceConfig';


export const MisesEnRecitsPage: React.FC = () => {
  const [recits, setRecits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRecits: 0,
    totalTypes: 0
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [
            recitsMediatiques, 
            docsScientifiques, 
            objetsTechno, 
            recitsCitoyens,
            recitsArtistiques
        ] = await Promise.all([
          Items.getRecitsMediatiquesCards(),
          Items.getRecitsScientifiquesCards(),
          Items.getRecitsTechnoCards(),
          Items.getRecitsCitoyensCards(),
          Items.getRecitsArtistiquesCards()
        ]);

        const allRecits = [
            ...recitsMediatiques, 
            ...docsScientifiques, 
            ...objetsTechno, 
            ...recitsCitoyens,
            ...recitsArtistiques
        ];

        setRecits(allRecits);

        setMetrics({
          totalRecits: allRecits.length,
          totalTypes: 5 
        });

      } catch (error) {
        console.error("Failed to load Mises En Récits data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const navCards = useMemo(() => {
     const types = [
        RESOURCE_TYPES.recit_artistique,
        RESOURCE_TYPES.recit_scientifique,
        RESOURCE_TYPES.recit_techno_industriel,
        RESOURCE_TYPES.recit_citoyen,
        RESOURCE_TYPES.recit_mediatique,
     ];

     return types.map(config => ({
        id: config.type,
        title: config.collectionLabel || config.label,
        description: config.description || '',
        path: config.collectionUrl || '#',
        icon: config.icon || PratiqueNarrativeIcon,
        color: config.color || '#cccccc'
     }));
  }, []);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<PratiqueNarrativeIcon size={40} />}
        title="Mises en Récits de l'IA"
        description="Explorez les récits qui façonnent les imaginaires sociotechniques de l'intelligence artificielle. Découvrez quelles sont les stratégies narratives qui orientent les usages de ces technologies"
        stats={[
          { label: 'Mises en Récits', value: metrics.totalRecits },
          { label: 'Types de récits', value: metrics.totalTypes }
        ]}
        backgroundScale={0.80}
      />

      <section className="w-full flex flex-col gap-24">
        <FullCarrousel
          title="Explorer les Corpus"
          data={navCards}
          perPage={3}
          perMove={1}
          renderSlide={(card, index) => <CorpusNavCard card={card} index={index} key={card.id} />}
        />

        <SubjectCarousels 
            items={recits} 
            loading={loading} 
        />
      </section>
    </Layouts>
  );
};

const SubjectCarousels = ({ items, loading }: { items: any[], loading: boolean }) => {
  const groupedSubjects = useMemo(() => {
    if (loading || items.length === 0) return [];

    const subjectMap: { [key: string]: { id: string, label: string, items: any[] } } = {};

    items.forEach((item) => {
      if (!item.subjects || !Array.isArray(item.subjects)) return;

      item.subjects.forEach((subject: any) => {
        const subjectId = String(subject.id);
        
        if (!subjectMap[subjectId]) {
            subjectMap[subjectId] = { 
                id: subject.id,
                label: subject.label, 
                items: []
            };
        }
        
        // Avoid duplicates
        if (!subjectMap[subjectId].items.some(i => i.id === item.id)) {
            subjectMap[subjectId].items.push(item);
        }
      });
    });

    return Object.values(subjectMap)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [items, loading]);

  if (loading) {
    return (
        <div className="flex flex-col gap-24 w-full">
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-5">
                    <div className="h-2.5 w-72 bg-c2 animate-pulse rounded-lg" />
                    <div className="grid grid-cols-4 gap-5">
                         {Array.from({ length: 4 }).map((_, j) => (
                            <ResourceCardSkeleton key={j} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
  }

  if (groupedSubjects.length === 0) return null;

  return (
    <div className="flex flex-col gap-24 w-full">
      {groupedSubjects.map((subject) => (
        <FullCarrousel
          key={subject.id}
          title={"Récits sur le domaine : " + subject.label}
          data={subject.items}
          perPage={4}
          perMove={1}
          renderSlide={(item) => (
             <ResourceCard item={item} />
          )}
        />
      ))}
    </div>
  );
};