import React from 'react';
import { motion, Variants } from 'framer-motion';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 10 } },
};

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};

interface SearchHelperProps {
  onSearchItemClick: (filterConfig?: any) => void;
}

const SEARCH_CONFIGURATIONS = [
  {
    title: 'Rechercher tous les actants liés au mot clés "trucage"',
    config: [
      {
        name: 'Groupe 1',
        isExpanded: true,
        itemType: 'actant',
        conditions: [
          {
            property: 'firstname',
            operator: 'contains',
            value: 're',
          },
        ],
      },
    ],
  },
  {
    title: 'Rechercher tous les colloques liés au "art trompeur"',
    config: [
      {
        name: 'Groupe 1',
        isExpanded: true,
        itemType: 'colloque',
        conditions: [
          {
            property: 'title',
            operator: 'contains',
            value: 'art trompeur',
          },
        ],
      },
    ],
  },
  {
    title: 'Rechercher tous les mots clés liés à "Renée Bourassa"',
    config: [
      {
        name: 'Groupe 1',
        isExpanded: true,
        itemType: 'keyword',
        conditions: [
          {
            property: 'title',
            operator: 'contains',
            value: 'Renée Bourassa',
          },
        ],
      },
    ],
  },
  {
    title: 'Rechercher tous les items liés à "Jean Marc Larrue"',
    config: [
      {
        name: 'Groupe 1',
        isExpanded: true,
        itemType: 'actant',
        conditions: [
          {
            property: 'firstname',
            operator: 'contains',
            value: 'Jean Marc Larrue',
          },
        ],
      },
    ],
  },
  {
    title: 'Rechercher toutes les bibliographies liées au mot clés "tromperie"',
    config: [
      {
        name: 'Groupe 1',
        isExpanded: true,
        itemType: 'bibliography',
        conditions: [
          {
            property: 'title',
            operator: 'contains',
            value: 'tromperie',
          },
        ],
      },
    ],
  },
  {
    title: "Rechercher toutes les citations liées à l'intelligence artificielle",
    config: [
      {
        name: 'Groupe 1',
        isExpanded: true,
        itemType: 'citation',
        conditions: [
          {
            property: 'citation',
            operator: 'contains',
            value: 'intelligence artificielle',
          },
        ],
      },
    ],
  },
];

export const SearchHelper: React.FC<SearchHelperProps> = ({ onSearchItemClick }) => {
  const handleConfigClick = (config: any) => {
    onSearchItemClick(config);
  };

  const renderSearchItem = (item: (typeof SEARCH_CONFIGURATIONS)[0], index: number) => (
    <motion.div
      key={index}
      variants={itemVariants}
      onClick={() => handleConfigClick(item.config)}
      className='cursor-pointer flex-1 flex flex-col border-200 border-2 hover:bg-c3 p-6 rounded-lg gap-2.5 transition-all ease-in-out duration-200'>
      {item.title}
    </motion.div>
  );

  return (
    <div className='flex  justify-center flex-col items-center gap-12'>
      <div className='flex flex-col items-center gap-1.5'>
        <div className='text-sm'>Edisem - Datavisualisation</div>
        <div className='text-3xl font-medium'>Que recherchez vous ?</div>
      </div>
      <div className='flex flex-col gap-6 items-center'>
        <motion.div
          className='w-[80%] flex flex-row gap-6'
          initial='hidden'
          animate='visible'
          variants={containerVariants}>
          {SEARCH_CONFIGURATIONS.slice(0, 3).map(renderSearchItem)}
        </motion.div>
        <motion.div
          className='w-[80%] flex flex-row gap-6'
          initial='hidden'
          animate='visible'
          variants={containerVariants}>
          {SEARCH_CONFIGURATIONS.slice(3, 6).map(renderSearchItem)}
        </motion.div>
      </div>
    </div>
  );
};
