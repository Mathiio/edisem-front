import React from 'react';
import { Button, outlineButtonClass, dangerOutlineButtonClass } from '@/theme/components/button';
import { TrashIcon } from '@/components/ui/icons';

interface AdminSelectionBarProps {
  count: number;
  itemLabel: string;
  onClearSelection: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  clearLabel?: string;
}

export const AdminSelectionBar: React.FC<AdminSelectionBarProps> = ({
  count,
  itemLabel,
  onClearSelection,
  onDelete,
  isDeleting = false,
  clearLabel = 'Annuler la sélection',
}) => {
  if (count <= 0) return null;

  const plural = count > 1;

  return (
    <div className='bg-c2/50 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3'>
      <span className='text-c6 font-medium'>
        {count} {itemLabel}
        {plural ? 's' : ''} sélectionné{plural ? 's' : ''}
      </span>
      <div className='flex items-center gap-2.5 flex-wrap'>
        <Button className={outlineButtonClass} onPress={onClearSelection}>
          {clearLabel}
        </Button>
        <Button
          className={dangerOutlineButtonClass}
          startContent={<TrashIcon size={16} />}
          onPress={onDelete}
          isLoading={isDeleting}>
          Supprimer ({count})
        </Button>
      </div>
    </div>
  );
};
