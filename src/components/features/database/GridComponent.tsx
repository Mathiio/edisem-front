import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ConferenceIcon,
  EditionIcon,
  SeanceIcon,
  KeywordIcon,
  UserIcon,
  SunIcon,
  ThemeIcon,
  CollectionIcon,
  CitationIcon,
  LaboritoryIcon,
  SchoolIcon,
  CountryIcon,
  UniversityIcon,
  OtherIcon,
  ImageIcon,
} from '@/components/ui/icons';
import { columnConfigs } from '@/pages/database';

interface GridProps {
  handleCardClick: (cardName: string, cardId: number, RTId: number, configKey: string, columnsConfig: any[]) => void;
  initializePropertiesLoading: () => void;
}

const GridComponent: React.FC<GridProps> = ({ handleCardClick, initializePropertiesLoading }) => {
  useEffect(() => {
    initializePropertiesLoading();
  }, []);
  return (
    <div className='flex flex-col gap-25'>
      <h1 className='text-24 font-medium text-c6'>Base de données</h1>
      <div className='grid grid-cols-12 grid-rows-8 gap-25 font-medium text-c6'>
        <Link
          to='#'
          className='col-span-4 row-span-3 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 gap-10 flex-col p-25'
          onClick={() => handleCardClick('Conférences', 71, 71, 'conferences', columnConfigs.conferences)}>
          <ConferenceIcon size={24} className='text-action' />
          Conférences
        </Link>
        <Link
          to='#'
          onClick={() => handleCardClick('Citations', 80, 80, 'citations', columnConfigs.citations)}
          className='col-span-2 row-span-2 col-start-5 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 gap-10 flex-col p-25'>
          <CitationIcon size={24} className='text-action' />
          Citations
        </Link>
        <div className='col-span-4 row-span-2 col-start-7 flex justify-center items-center border-2 border-c3  transition-colors duration-300 rounded-8 gap-10 flex-col p-25'>
          <SunIcon size={24} className='text-c5' />
          Bibliographies
        </div>
        <div className='col-span-4 row-span-4 col-start-5 row-start-3 rounded-8 gap-10 flex justify-center items-center border-2 border-c3 p-50'>
          <h2 className='col-span-4 row-span-2 col-start-7 text-32 text-c6 font-bold'>
            <span className='col-span-4 row-span-2 col-start-7 text-action'>Sélectionnez </span>
            la donnée que vous souhaitez
            <span className='col-span-4 row-span-2 col-start-7 text-action'> mettre à jour</span>
          </h2>
        </div>
        <Link
          to='#'
          onClick={() => handleCardClick('Conférenciers', 72, 72, 'conferenciers', columnConfigs.conferenciers)}
          className='col-span-2 row-span-3 col-start-11 row-start-1 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 gap-10 flex-col p-25'>
          <UserIcon size={24} className='text-action' />
          Conférenciers
        </Link>
        <Link
          to='#'
          onClick={() =>
            handleCardClick('Écoles doctorales', 74, 74, 'ecolesdoctorales', columnConfigs.ecolesdoctorales)
          }
          className='col-span-2 row-span-2 col-start-9 row-start-3 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <SchoolIcon size={24} className='text-action' />
          Écoles doctorales
        </Link>
        <Link
          to='#'
          onClick={() => handleCardClick('Laboratoires', 91, 91, 'laboratoire', columnConfigs.laboratoire)}
          className='col-span-2 col-start-9 row-start-5 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <LaboritoryIcon size={24} className='text-action' />
          Laboratoires
        </Link>
        <Link
          to='#'
          onClick={() => handleCardClick('Universités', 73, 73, 'universites', columnConfigs.universites)}
          className='col-span-2 row-span-2 col-start-11 row-start-4 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <UniversityIcon size={24} className='text-action' />
          Universités
        </Link>
        <Link
          to='#'
          onClick={() => handleCardClick('Pays', 94, 94, 'pays', columnConfigs.pays)}
          className='col-span-4 col-start-9 row-start-6 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <CountryIcon size={24} className='text-action' />
          Pays
        </Link>
        <div className='col-span-2 row-span-2 col-start-3 row-start-4 flex justify-center items-center border-2 border-c3  transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <OtherIcon size={24} className='text-c5' />
          Annexes
        </div>
        <div className='col-span-2 row-span-2 col-start-1 row-start-4 flex justify-center items-center border-2 border-c3  transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <ImageIcon size={24} className='text-c5' />
          Médiagraphies
        </div>
        <Link
          to='#'
          onClick={() => handleCardClick('Concept et mots-clés', 34, 34, 'motcles', columnConfigs.motcles)}
          className='col-span-4 col-start-1 row-start-6 flex justify-center items-center border-2 border-c3 hover:border-c4 transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <KeywordIcon size={24} className='text-action' />
          Mots clés
        </Link>
        <div className='col-span-3 row-span-2 col-start-1 row-start-7 flex justify-center items-center border-2 border-c3  transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <ThemeIcon size={24} className='text-c5' />
          Thèmes
        </div>
        <div className='col-span-2 row-span-2 col-start-4 row-start-7 flex justify-center items-center border-2 border-c3 transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <CollectionIcon size={24} className='text-c5' />
          Collections
        </div>
        <div className='col-span-2 row-span-2 col-start-6 row-start-7 flex justify-center items-center border-2 border-c3  transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <EditionIcon size={24} className='text-c5' />
          Éditions
        </div>
        <div className='col-span-5 row-span-2 col-start-8 row-start-7 flex justify-center items-center border-2 border-c3  transition-colors duration-300 rounded-8 flex-col gap-10 p-25'>
          <SeanceIcon size={24} className='text-c5' />
          Séances
        </div>
      </div>
    </div>
  );
};

export default GridComponent;
