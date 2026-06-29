import { Divider } from '@heroui/react';
import { useState } from 'react';

interface AnnotatePopupProps {
  onViewToggle: (isActive: boolean) => void;
}

export default function AnnotatePopup({ onViewToggle }: AnnotatePopupProps) {
  const [isActive, setIsActive] = useState(false);

  const handleToggle = (value: boolean) => {
    setIsActive(value);
    onViewToggle(value);
  };

  return (
    <div className='w-full flex flex-col gap-4 h-full overflow-hidden justify-between'>
      <div className='text-sm flex justify-start leading-[150%] w-full gap-2 rounded-none text-c6 bg-transparent'>
        Annoter des données
      </div>
      <Divider />

      <div className='flex flex-row gap-4 items-center'>
        {/* Bouton False */}
        <button
          onClick={() => handleToggle(false)}
          className={`text-sm py-4 w-full bg-c3 text-c6 rounded-lg flex flex-col justify-center items-center transition-colors ${
            !isActive ? 'border-2 border-c6' : ' border-2 border-transparent'
          }`}>
          Voir les annotations
        </button>

        {/* Bouton True */}
        <button
          onClick={() => handleToggle(true)}
          className={`text-sm py-4 w-full bg-c3 text-c6 rounded-lg flex flex-col justify-center items-center transition-colors ${
            isActive ? 'border-2 border-c6' : ' border-2 border-transparent'
          }`}>
          Annoter
        </button>
      </div>
    </div>
  );
}
