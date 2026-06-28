import React from 'react';
import { FullCarrousel } from '@/components/ui/Carrousels';
import { CorpusNavCard, type CorpusNavCardData } from '@/components/features/corpus/CorpusNavCard';
import { ColloqueIcon, PratiqueNarrativeIcon, SeminaireIcon, StudyDayIcon } from '@/components/ui/icons';

const corpusCards: CorpusNavCardData[] = [
  {
    id: 'seminaires',
    icon: SeminaireIcon,
    title: 'Séminaires',
    description: "Toutes les séances du séminaire Arcanes, de 2021 à aujourd'hui.",
    path: '/corpus/seminaires',
  },
  {
    id: 'PratiqueNarrative',
    icon: PratiqueNarrativeIcon,
    title: 'IA & Pratiques Narratives',
    description: "Réflexions autour des usages narratifs de l'intelligence artificielle.",
    path: '/corpus/pratiques-narratives',
  },
  {
    id: 'StudyDayIcon',
    icon: StudyDayIcon,
    title: "Journées d'études",
    description: 'Journées de recherche et de présentation de travaux académiques.',
    path: '/corpus/journees-etudes',
  },
  {
    id: 'colloques',
    icon: ColloqueIcon,
    title: 'Colloques',
    description: 'Des rencontres scientifiques et conférences académiques.',
    path: '/corpus/colloques',
  },
];

export const CorpusSection: React.FC = () => (
  <FullCarrousel
    title='Explorer le corpus'
    perPage={3}
    perMove={1}
    data={corpusCards}
    renderSlide={(card, index) => (
      <CorpusNavCard card={card} index={index} testId='corpus-section-card' key={card.id} />
    )}
  />
);
