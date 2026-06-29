import { Button, Divider, Select, SelectItem, SelectedItems } from '@heroui/react';
import { useState } from 'react';

export const ITEM_TYPES = {
  Citations: { type: 80, image: 'citation', config: 'citations' },
  Colloques: { type: 71, image: 'conference', config: 'conferences' },
  Séminaires: { type: 75, image: 'conference', config: 'conferences' },
  'Journées d\'étude': { type: 76, image: 'conference', config: 'conferences' },
  Conférencier: { type: 72, image: 'actant', config: 'conferenciers' },
  'Mots clés': { type: 34, image: 'keyword', config: 'motcles' },
  Pays: { type: 94, image: 'university', config: 'pays' },
  Université: { type: 73, image: 'university', config: 'universites' },
  Laboratoire: { type: 91, image: 'university', config: 'laboratoire' },
  'Écoles doctorales': { type: 74, image: 'university', config: 'ecolesdoctorales' },
};

// Type pour les items du select
type ItemType = {
  type: number;
  image: string;
  config: string;
  label: string;
};

interface AnnotatePopupProps {
  onCreateItem: (typeNumber: number, config: string) => void;
}

export default function AddPopup({ onCreateItem }: AnnotatePopupProps) {
  const [selectedItem, setSelectedItem] = useState<{ type: number; config: string } | null>(null);

  // Convertir ITEM_TYPES en array avec les labels
  const itemsArray = Object.entries(ITEM_TYPES).map(([label, config]) => ({
    ...config,
    label,
  }));

  const handleSelectionChange = (keys: any) => {
    const selectedKey = Array.from(keys)[0] as string;
    const itemConfig = itemsArray.find((item) => item.type.toString() === selectedKey);
    if (itemConfig) {
      setSelectedItem(itemConfig);
    }
  };

  const handleCreateClick = () => {
    if (selectedItem) {
      onCreateItem(selectedItem.type, selectedItem.config);
    }
  };

  return (
    <div className='w-full flex flex-col gap-4 h-full overflow-hidden justify-between'>
      <div className='text-sm flex justify-start leading-[150%] w-full gap-2 rounded-none text-c6 bg-transparent'>
        Création de donnée
      </div>
      <Divider />

      <Select
        label='Type'
        labelPlacement='outside-left'
        placeholder='Sélectionnez le type de la ressource'
        variant='bordered'
        className='w-full'
        classNames={{
          trigger: 'h-[50px]',
          selectorIcon: 'text-c6',
        }}
        items={itemsArray}
        onSelectionChange={handleSelectionChange}
        renderValue={(items: SelectedItems<ItemType>) => {
          return items.map((item) => (
            <div key={item.key} className='flex items-center gap-2'>
              {item.data?.image && (
                <img src={`/bulle-${item.data.image}.png`} alt={item.data?.label || 'Item'} className='w-6 h-6' />
              )}
              <span className='text-c6'>
                {item.data?.label ? item.data.label.charAt(0).toUpperCase() + item.data.label.slice(1) : ''}
              </span>
            </div>
          ));
        }}>
        {(item) => (
          <SelectItem key={item.type} textValue={item.label}>
            <div className='flex items-center gap-2'>
              <img src={`/bulle-${item.image}.png`} alt={item.label} className='w-6 h-6' />
              <span className='text-c6'>{item.label.charAt(0).toUpperCase() + item.label.slice(1)}</span>
            </div>
          </SelectItem>
        )}
      </Select>

      <div className='flex justify-end gap-2 mt-4'>
        <Button
          className='text-base h-auto px-2.5 py-1.5 rounded-lg text-selected gap-2 bg-action disabled:opacity-50 disabled:hover:opacity-50 transition-all ease-in-out duration-200'
          color='primary'
          onClick={handleCreateClick}
          disabled={!selectedItem}>
          Créer
        </Button>
      </div>
    </div>
  );
}
