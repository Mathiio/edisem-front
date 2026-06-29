import React from 'react';
import { Conference } from '@/types/ui';
import { ResourceCard } from '@/components/features/shared/corpus/ResourceCard';

interface IntervenantInterventionsProps {
  interventions: Conference[];
}

export const IntervenantInterventions: React.FC<IntervenantInterventionsProps> = ({ interventions }) => {

  // Helper to filter by type
  const getInterventionsByType = (type: string) => {
    return interventions.filter(item => item.type === type);
  };

  const studyDays = getInterventionsByType('journee_etudes');
  const colloques = getInterventionsByType('colloque');
  const seminars = getInterventionsByType('seminaire');
  const experimentations = getInterventionsByType('experimentation');

  const categories = [
    { title: "Journées d'études", items: studyDays },
    { title: "Colloques", items: colloques },
    { title: "Séminaires", items: seminars },
    { title: "Expérimentations", items: experimentations }
  ];

  // Only render categories with items
  const activeCategories = categories.filter(cat => cat.items.length > 0);

  if (activeCategories.length === 0) return null;

  return (
    <div className='w-full flex flex-col items-center gap-12'>
        <div className='flex flex-col gap-2 justify-center items-center'>
            <h2 className='text-c6 text-3xl transition-all ease-in-out'>Interventions</h2>
            <p className='text-base text-c5'>Retrouvez les participations classées par catégorie</p>
        </div>

        <div className="w-full flex flex-col gap-12">
            {activeCategories.map((category, index) => (
                <div key={index} className="flex flex-col gap-6">
                    <h3 className="text-2xl text-c6 font-regular">{category.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {category.items.map((item, i) => (
                            <ResourceCard 
                                key={i}
                                item={item}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
