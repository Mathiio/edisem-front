import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layouts } from '@/components/layout/Layouts';
import * as Items from '@/services/Items';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { PratiqueNarrativeIcon } from '@/components/ui/icons';
import { PageBanner } from '@/components/ui/PageBanner';
import { CorpusNavCard } from '@/components/features/shared/corpus/CorpusNavCard';
import { ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { slugUtils } from '@/lib/utils';

interface Domain {
  id: string | number;
  name: string;
  count: number;
}

const DomainCard = ({ domain }: { domain: Domain }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const slug = slugUtils.toSlug(domain.name);
    navigate(`/corpus/domaine/${slug}`, { state: { domainId: domain.id } });
  };

  return (
    <div
      onClick={handleClick}
      className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 cursor-pointer p-10 rounded-4xl flex flex-col gap-8 hover:bg-c2 h-full transition-all ease-in-out duration-200 group'>
      <div className='flex flex-col gap-5'>
        <h2 className='text-3xl text-c6 font-medium transition-colors duration-200'>{domain.name}</h2>
        <p className='text-lg text-c4'>
          {domain.count} {domain.count === 1 ? 'récit' : 'récits'}
        </p>
      </div>
    </div>
  );
};

export const MisesEnRecitsPage: React.FC = () => {
  const [recits, setRecits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRecits: 0,
    totalTypes: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [recitsMediatiques, docsScientifiques, objetsTechno, recitsCitoyens, recitsArtistiques] = await Promise.all([
          Items.getRecitsMediatiquesCards(),
          Items.getRecitsScientifiquesCards(),
          Items.getRecitsTechnoCards(),
          Items.getRecitsCitoyensCards(),
          Items.getRecitsArtistiquesCards(),
        ]);

        const allRecits = [...recitsMediatiques, ...docsScientifiques, ...objetsTechno, ...recitsCitoyens, ...recitsArtistiques];

        setRecits(allRecits);

        setMetrics({
          totalRecits: allRecits.length,
          totalTypes: 5,
        });
      } catch (error) {
        console.error('Failed to load Mises En Récits data', error);
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

    return types.map((config) => ({
      id: config.type,
      title: config.collectionLabel || config.label,
      description: config.description || '',
      path: config.collectionUrl || '#',
      icon: config.icon || PratiqueNarrativeIcon,
      color: config.color || '#cccccc',
    }));
  }, []);

  const domains = useMemo(() => {
    if (loading || recits.length === 0) return [];

    const domainMap: { [key: string]: Domain & { itemIds: Set<string> } } = {};

    recits.forEach((item) => {
      if (!item.subjects || !Array.isArray(item.subjects)) return;

      item.subjects.forEach((subject: any) => {
        const domainId = String(subject.id);
        const domainName = subject.label || subject.name;

        if (!domainMap[domainId]) {
          domainMap[domainId] = {
            id: subject.id,
            name: domainName,
            count: 0,
            itemIds: new Set(),
          };
        }

        const itemId = String(item.id);
        if (!domainMap[domainId].itemIds.has(itemId)) {
          domainMap[domainId].itemIds.add(itemId);
          domainMap[domainId].count++;
        }
      });
    });

    return Object.values(domainMap)
      .map(({ itemIds: _itemIds, ...domain }) => domain)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [recits, loading]);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<PratiqueNarrativeIcon size={40} />}
        title="Mises en Récits de l'IA"
        description="Explorez les récits qui façonnent les imaginaires sociotechniques de l'intelligence artificielle. Découvrez quelles sont les stratégies narratives qui orientent les usages de ces technologies"
        stats={[
          { label: 'Mises en Récits', value: metrics.totalRecits },
          { label: 'Types de récits', value: metrics.totalTypes },
        ]}
        backgroundScale={0.8}
      />

      <section className='w-full flex flex-col gap-24'>
        <FullCarrousel
          title='Explorer les Corpus'
          data={navCards}
          perPage={3}
          perMove={1}
          renderSlide={(card, index) => <CorpusNavCard card={card} index={index} key={card.id} />}
        />

        {loading ? (
          <div className='flex flex-col gap-5 w-full'>
            <div className='h-2.5 w-72 bg-c2 animate-pulse rounded-lg' />
            <div className='grid grid-cols-3 gap-5'>
              {Array.from({ length: 3 }).map((_, index) => (
                <ResourceCardSkeleton key={index} />
              ))}
            </div>
          </div>
        ) : (
          domains.length > 0 && (
            <FullCarrousel
              title='Explorer par domaines'
              data={domains}
              perPage={3}
              perMove={1}
              renderSlide={(domain, index) => <DomainCard domain={domain} key={`${domain.id}-${index}`} />}
            />
          )
        )}
      </section>
    </Layouts>
  );
};
