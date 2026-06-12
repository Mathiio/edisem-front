import React, { useEffect, useState } from 'react';
import { Button, Divider, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Link } from '@heroui/react';
import { ArrowIcon, CrossIcon, AddIcon } from '@/components/ui/icons';
import { ITEM_TYPES } from './FilterPopup';

type Masque = {
  itemType: string;
  displayType: string;
};

interface HidePopupProps {
  onHide: () => void;
}

const getDisplayKeyByValue = (value: string): string => {
  return Object.entries(ITEM_TYPES).find(([_, val]) => val === value)?.[0] || value;
};

const getInitialMasques = (): Masque[] => {
  const savedMasques = localStorage.getItem('hideGroups');
  if (savedMasques) {
    try {
      const parsedMasques = JSON.parse(savedMasques);
      return parsedMasques.map((masque: any) => ({
        itemType: masque.itemType,
        displayType: getDisplayKeyByValue(masque.itemType),
      }));
    } catch (e) {
      console.error('Error parsing saved masques:', e);
    }
  }
  return [];
};

const updateLocalStorage = (masques: Masque[]) => {
  const masquesToSave = masques.map(({ itemType }) => ({ itemType }));
  localStorage.setItem('hideGroups', JSON.stringify(masquesToSave));
};

const HidePopup: React.FC<HidePopupProps> = ({ onHide }) => {
  const [filterGroups, setFilterGroups] = useState<Masque[]>(getInitialMasques());

  useEffect(() => {
    updateLocalStorage(filterGroups);
  }, [filterGroups]);

  useEffect(() => {
    const savedMasques = getInitialMasques();
    if (savedMasques.length > 0) {
      setFilterGroups(savedMasques);
    }
  }, []);

  const addMasque = () => {
    const newMasques = [
      ...filterGroups,
      {
        itemType: '',
        displayType: '',
      },
    ];
    setFilterGroups(newMasques);
    updateLocalStorage(newMasques);
  };

  const removeMasque = (index: number) => {
    const newMasques = filterGroups.filter((_, i) => i !== index);
    setFilterGroups(newMasques);
    updateLocalStorage(newMasques);
  };

  const applyMasques = () => {
    updateLocalStorage(filterGroups);
    onHide();
  };

  const resetMasques = () => {
    setFilterGroups([]);
    localStorage.removeItem('hideGroups');
    onHide();
  };

  const handleSelectionChange = (index: number, displayType: string) => {
    const itemType = ITEM_TYPES[displayType as keyof typeof ITEM_TYPES];
    const updatedMasques = [...filterGroups];
    updatedMasques[index] = {
      itemType,
      displayType,
    };
    setFilterGroups(updatedMasques);
    updateLocalStorage(updatedMasques);
  };

  return (
    <div className='w-full flex flex-col justify-between gap-5 h-full overflow-hidden'>
      <div className='flex flex-col gap-4'>
        <Link
          onClick={addMasque}
          underline='none'
          size='sm'
          className='text-sm flex justify-start w-full gap-2 rounded-none text-c6 bg-transparent cursor-pointer'>
          <AddIcon size={12} />
          Ajouter un masque
        </Link>
        <Divider />
      </div>

      <div className='flex flex-col justify-start h-full gap-2 overflow-y-auto'>
        {filterGroups.map((masque, index) => (
          <div key={index} className='flex flex-row items-center gap-2'>
            <Dropdown
              className='w-full'
              classNames={{
                content:
                  'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3',
              }}>
              <DropdownTrigger className='w-full'>
                <Button className='text-sm text-c6 px-2 py-2 flex bg-transparent justify-between gap-2.5 bg-c4 border-2 rounded-lg w-full'>
                  {masque.displayType || 'Sélectionner un type'}
                  <ArrowIcon size={12} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                className='p-2 w-full'
                classNames={{ base: 'bg-transparent shadow-none border-0', list: 'bg-transparent' }}
                aria-label="Sélectionner un type d'item"
                selectionMode='single'
                selectedKeys={[masque.displayType]}
                onSelectionChange={(keys) => {
                  const displayType = Array.from(keys)[0] as string;
                  handleSelectionChange(index, displayType);
                }}>
                {Object.entries(ITEM_TYPES).map(([key, _]) => (
                  <DropdownItem
                    className='w-full min-w-0 cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                    key={key}>
                    {key}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            <Button size='sm' isIconOnly onClick={() => removeMasque(index)}>
              <CrossIcon size={14} className='text-c6' />
            </Button>
          </div>
        ))}
      </div>

      <div className='flex justify-end gap-2 mt-4'>
        <Button className='px-2.5 py-1.5 rounded-lg bg-transparent' variant='flat' onClick={resetMasques}>
          Réinitialiser
        </Button>
        <Button className='px-2.5 py-1.5 rounded-lg bg-action text-selected' color='primary' onClick={applyMasques}>
          Appliquer
        </Button>
      </div>
    </div>
  );
};

export default HidePopup;
