import { Select, SelectItem } from '@/theme/components';
import type { RecitType } from '../hooks/useRecitsData';
import { TYPE_CONFIG, ALL_TYPES } from '../recitTypeConfig';

export function RecitTypesFilterSelect({
  activeTypes,
  onChange,
}: {
  activeTypes: Set<RecitType>;
  onChange: (next: Set<RecitType>) => void;
}) {
  return (
    <Select
      aria-label='Types de récits'
      selectionMode='multiple'
      placeholder='Types de récits'
      selectedKeys={activeTypes}
      onSelectionChange={(keys) => {
        if (keys === 'all') {
          onChange(new Set(ALL_TYPES));
          return;
        }
        const selected = Array.from(keys as Set<string>);
        if (selected.length === 0) return;
        onChange(new Set(selected as RecitType[]));
      }}
      className='w-52'
      classNames={{ trigger: 'rounded-xl' }}
      renderValue={(items) => {
        if (items.length === 0 || items.length === ALL_TYPES.length) {
          return <span className='text-c6'>Tous les types</span>;
        }
        return <span className='text-c6'>{items.length} types sélectionnés</span>;
      }}>
      {ALL_TYPES.map((t) => (
        <SelectItem key={t} textValue={TYPE_CONFIG[t].label}>
          <span className='flex items-center gap-2 text-c6'>
            <span
              className='w-2 h-2 rounded-full shrink-0'
              style={{ backgroundColor: TYPE_CONFIG[t].color }}
            />
            {TYPE_CONFIG[t].label}
          </span>
        </SelectItem>
      ))}
    </Select>
  );
}
