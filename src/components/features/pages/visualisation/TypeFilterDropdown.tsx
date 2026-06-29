import { useState } from 'react';
import { Button, Popover, PopoverTrigger, PopoverContent } from '@heroui/react';
import { SettingsIcon } from '@/components/ui/icons';

// Types disponibles avec leurs images et labels
const VISUAL_TYPES = [
  { key: 'actant', label: 'Actants', image: '/bulle-actant.png' },
  { key: 'colloque', label: 'Colloques', image: '/bulle-conference.png' },
  { key: 'seminaire', label: 'Séminaires', image: '/bulle-conference.png' },
  { key: 'journee_etudes', label: 'Journées d\'étude', image: '/bulle-conference.png' },
  { key: 'citation', label: 'Citations', image: '/bulle-citation.png' },
  { key: 'keyword', label: 'Mots-clés', image: '/bulle-keyword.png' },
  { key: 'bibliography', label: 'Bibliographies', image: '/bulle-bibliography.png' },
  { key: 'mediagraphie', label: 'Médiagraphies', image: '/bulle-mediagraphie.png' },
  { key: 'university', label: 'Universités', image: '/bulle-university.png' },
  { key: 'collection', label: 'Collections', image: '/bulle-collection.png' },
  { key: 'laboratory', label: 'Laboratoires', image: '/bulle-university.png' },
  { key: 'doctoralschool', label: 'Écoles doctorales', image: '/bulle-university.png' },
];

interface TypeFilterDropdownProps {
  visibleTypes: string[];
  onToggleType: (type: string) => void;
  typesInUse?: string[]; // Types présents dans les résultats actuels
  searchedTypes?: string[]; // Types de la recherche (toujours visibles, non affichés dans le dropdown)
}

export default function TypeFilterDropdown({ visibleTypes, onToggleType, typesInUse = [], searchedTypes = [] }: TypeFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filtrer pour n'afficher que les types présents dans les résultats
  const availableTypes = typesInUse.length > 0 ? VISUAL_TYPES.filter((t) => typesInUse.includes(t.key)) : VISUAL_TYPES;

  // Compter les types visibles parmi les types disponibles
  const visibleCount = visibleTypes.filter((t) => typesInUse.includes(t)).length;
  const totalCount = availableTypes.length;

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement='bottom-start'>
      <PopoverTrigger>
        <Button size='sm' variant='bordered' className='border-c3 text-c6 hover:bg-c3 gap-1.5 h-[32px]'>
          <SettingsIcon size={14} />
          <span className='text-xs'>
            Filtrer ({visibleCount}/{totalCount})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='bg-c2 border-2 border-c3 rounded-lg p-0 w-fit'>
        <div className='p-4'>
          <p className='text-[11px] text-c4 mb-4'>Types visibles</p>
          <div className='flex flex-col gap-2 '>
            {availableTypes.map((type) => {
              const isVisible = visibleTypes.includes(type.key);
              const isSearchedType = searchedTypes.includes(type.key);

              return (
                <button
                  key={type.key}
                  onClick={() => !isSearchedType && onToggleType(type.key)}
                  disabled={isSearchedType}
                  className={`
                    flex items-center gap-6 px-4 py-2 rounded-lg transition-all duration-200
                    ${isSearchedType ? 'bg-action/30 text-c6 cursor-not-allowed opacity-70' : isVisible ? 'bg-action/20 text-c6' : 'bg-transparent text-c4 hover:bg-c3 hover:text-c6'}
                  `}>
                  <img src={type.image} alt={type.label} className='w-[30px] h-[30px] object-contain' />
                  <span className='text-xs whitespace-nowrap'>{type.label}</span>
                  {isSearchedType && <span className='text-[10px] text-c5 ml-auto'>(recherché)</span>}
                </button>
              );
            })}
          </div>

          {/* Actions rapides */}
          <div className='flex gap-4 mt-4 pt-4 border-t border-c3'>
            <Button
              size='sm'
              variant='light'
              className='flex-1 text-[11px] text-c4 hover:text-c6 h-[24px] min-w-0'
              onPress={() => availableTypes.forEach((t) => !visibleTypes.includes(t.key) && onToggleType(t.key))}>
              Tout afficher
            </Button>
            <Button
              size='sm'
              variant='light'
              className='flex-1 text-[11px] text-c4 hover:text-c6 h-[24px] min-w-0'
              onPress={() => visibleTypes.forEach((t) => !searchedTypes.includes(t) && onToggleType(t))}>
              Tout masquer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
