import { FC } from 'react';
// import { ArrowIcon } from '@/components/utils/icons';
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';
import { dropdownContentClassNames, dropdownMenuClassNames } from '@/theme/components/dropdown';
import { ITEM_TYPES } from './FilterPopup';

interface MasquesProps {
  groupId: string;
  visibleTypes: string[];

  availableTypes: string[];
  availableControl: boolean;
}

const Masques: FC<MasquesProps> = ({ groupId, visibleTypes = [], availableTypes, availableControl }) => {
  return (
    <div
      className={` p-4 rounded-full transition-opacity duration-300 ${
        availableControl ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
      <Dropdown classNames={dropdownContentClassNames}>
        <DropdownTrigger>
          <Button size='lg' className='px-4 py-4 flex justify-between gap-2 text-c6 rounded-lg bg-c2'>
            Masquage {groupId}
          </Button>
        </DropdownTrigger>
        <DropdownMenu variant='flat' className='p-2 gap-1.5' classNames={dropdownMenuClassNames}>
          {Object.entries(ITEM_TYPES)
            .filter(([, type]) => availableTypes.includes(type))
            .map(([label, type]) => {
              const isActive = visibleTypes.includes(type);
              return (
                <DropdownItem
                  key={type}
                  className='cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'>
                  <div
                    className='flex items-center justify-start gap-0.5 transition-opacity duration-150'
                    style={{ opacity: isActive ? 1 : 0.3 }}>
                    <img src={`/bulle-${type}.png`} alt={label} className='w-7' />
                    <p className='text-c6 text-sm'>{label.charAt(0).toUpperCase() + label.slice(1)}</p>
                  </div>
                </DropdownItem>
              );
            })}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};

export default Masques;
