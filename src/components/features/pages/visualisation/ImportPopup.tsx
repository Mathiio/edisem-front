import { Button, Divider } from '@heroui/react';
import { Textarea } from '@heroui/react';
import { useRef, useState } from 'react';
import { FilterGroup } from './FilterPopup';

type ImportPopupProps = {
  onSelect: (groups: FilterGroup[]) => void; // Même interface que handleOverlaySelect
};

export default function ImportPopup({ onSelect }: ImportPopupProps) {
  const [importError, setImportError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleImport = () => {
    setImportError(null);
    const textValue = textareaRef.current?.value || '';

    try {
      const importedGroups = JSON.parse(textValue);

      // Validation simple pour vérifier que c'est un tableau
      if (Array.isArray(importedGroups)) {
        // Appeler onSelect qui est en fait handleOverlaySelect dans le parent
        onSelect(importedGroups);
      } else {
        setImportError('Format invalide. Veuillez entrer un tableau de groupes de filtres.');
      }
    } catch (e) {
      setImportError('Erreur de parsing JSON. Veuillez vérifier votre format.');
      console.error('Import error:', e);
    }
  };

  return (
    <div className='w-full flex flex-col gap-4 h-full overflow-hidden justify-between'>
      <div className='flex flex-col gap-4'>
        <div className='text-sm flex justify-start leading-[150%] w-full gap-2 rounded-none text-c6 bg-transparent'>
          Importer une recherche
        </div>
        <Divider />
        <Textarea
          ref={textareaRef}
          minRows={14}
          size='lg'
          placeholder='Coller votre recherche ici...'
          className='focus:bg-c3 bg-c3 h-full'
          classNames={{
            inputWrapper: 'bg-c3 !bg-c3 h-full text-c6',
            base: 'rounded-lg h-full',
            innerWrapper: 'focus:bg-c3 bg-c3 h-full',
          }}
        />
        {importError && <div className='text-red-500 text-xs'>{importError}</div>}
      </div>
      <div className='flex justify-end gap-2 mt-4'>
        <Button
          className='text-base h-auto px-2.5 py-1.5 rounded-lg text-selected gap-2 bg-action transition-all ease-in-out duration-200 disabled:opacity-50 disabled:hover:opacity-50 disabled:cursor-not-allowed'
          onClick={handleImport}>
          Lancer la recherche
        </Button>
      </div>
    </div>
  );
}
