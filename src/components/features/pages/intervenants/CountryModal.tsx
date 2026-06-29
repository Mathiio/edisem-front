import React from 'react';
import { IntervenantLongCard } from '@/components/features/pages/intervenants/IntervenantCards';
import { getFrCountryName } from '@/components/features/pages/intervenants/CountryUtils';
import { Modal, ModalBody, ModalContent, ModalHeader, modalCloseButtonClasses } from '@/theme/components';
import { Actant, University } from '@/types/ui';

export interface UniversityWithIntervenants {
  university: University;
  intervenants: Actant[];
  [x: string]: any;
}

interface CountryModalProps {
  selectedCountry: string | null;
  universityGroups: any[];
  onClose: () => void;
}

const MODAL_MOTION_PROPS = {
  variants: {
    enter: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  },
};

export const CountryModal: React.FC<CountryModalProps> = ({ selectedCountry, universityGroups, onClose }) => {
  const countryLabel = selectedCountry ? getFrCountryName(selectedCountry) : 'Pays';

  return (
    <Modal
      backdrop='blur'
      size='2xl'
      isOpen={!!selectedCountry}
      onClose={onClose}
      scrollBehavior='inside'
      classNames={{ closeButton: modalCloseButtonClasses }}
      motionProps={MODAL_MOTION_PROPS as any}>
      <ModalContent>
        <ModalHeader className='flex flex-col gap-px py-4'>
          <h2 className='text-c6 text-lg font-semibold'>Intervenants – {countryLabel}</h2>
        </ModalHeader>
        <ModalBody className='flex flex-col gap-6 py-4'>
          {universityGroups.length > 0 ? (
            universityGroups.map((group) => (
              <div key={group.university.name} className='flex flex-col gap-3'>
                <h3 className='text-base font-medium text-c6'>{group.university.name}</h3>
                <div className='flex flex-col gap-2'>
                  {group.intervenants.map((intervenant: any) => (
                    <IntervenantLongCard key={intervenant.id} {...intervenant} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className='text-c5 text-sm'>Aucun intervenant répertorié.</p>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
