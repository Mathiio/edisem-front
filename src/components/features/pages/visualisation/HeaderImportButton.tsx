import { useState } from 'react';
import { Button, Popover, PopoverTrigger, PopoverContent, Textarea } from '@heroui/react';
import { ImportIcon } from '@/components/ui/icons';
import { FilterGroup, NodePosition } from './FilterPopup';

interface HeaderImportButtonProps {
  onImport: (groups: FilterGroup[], nodePositions?: NodePosition[]) => void;
}

export default function HeaderImportButton({ onImport }: HeaderImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [textValue, setTextValue] = useState('');

  const handleImport = () => {
    setImportError(null);

    if (!textValue.trim()) {
      setImportError('Veuillez coller une configuration.');
      return;
    }

    try {
      const imported = JSON.parse(textValue);

      // Support ancien format (array de FilterGroup) et nouveau format ({ filters, nodePositions })
      if (Array.isArray(imported)) {
        // Ancien format: juste un array de FilterGroup
        onImport(imported);
        setIsOpen(false);
        setTextValue('');
      } else if (imported.filters && Array.isArray(imported.filters)) {
        // Nouveau format: { filters: FilterGroup[], nodePositions?: NodePosition[] }
        onImport(imported.filters, imported.nodePositions);
        setIsOpen(false);
        setTextValue('');
      } else {
        setImportError('Format invalide. Veuillez entrer un tableau de groupes ou une configuration exportée.');
      }
    } catch (e) {
      setImportError('Erreur de parsing JSON.');
      console.error('Import error:', e);
    }
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement='bottom-end'>
      <PopoverTrigger>
        <Button size='sm' variant='bordered' className='border-c3 text-c6 hover:bg-c3 gap-1.5 h-[32px]'>
          <ImportIcon size={14} />
          <span className='text-xs'>Importer</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='bg-c2 border-2 border-c3 rounded-lg p-2 w-fit'>
        <div className='p-2.5 flex flex-col gap-2.5'>
          <p className='text-sm text-c6 font-medium'>Importer une recherche</p>
          <Textarea
            value={textValue}
            onValueChange={setTextValue}
            minRows={6}
            maxRows={10}
            size='sm'
            placeholder='Coller votre configuration JSON ici...'
            classNames={{
              inputWrapper: 'bg-c3 border-2 border-c3 hover:bg-c3 group-data-[focus=true]:bg-c3',
              input: 'text-c6 text-xs',
              base: 'rounded-md w-[280px]',
            }}
          />
          {importError && <p className='text-[11px] text-red-400'>{importError}</p>}
          <div className='flex justify-end'>
            <Button size='sm' className='bg-action !text-c6 h-[28px] w-fit px-4 text-xs' onPress={handleImport}>
              Lancer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
