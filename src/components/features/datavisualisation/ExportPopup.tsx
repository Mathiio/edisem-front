import React from 'react';
import { Button, Checkbox, cn, Divider, Input } from '@heroui/react';
import { addToast } from '@/theme/components';
import { useState } from 'react';
import { GeneratedImage } from '@/pages/visualisation';
import { ShareIcon } from '@/components/ui/icons';
import { AlertModal } from '@/components/ui/AlertModal';

const STORAGE_KEY = 'filterGroups';

interface ExportPopupProps {
  generatedImage: GeneratedImage | null;
  handleExportClick: () => Promise<GeneratedImage>;
  exportEnabled: boolean; // ajout de la prop
}

export const ExportPopup: React.FC<ExportPopupProps> = ({ handleExportClick, generatedImage, exportEnabled }) => {
  const userString = localStorage.getItem('user');
  const user: Record<string, unknown> | null = userString ? JSON.parse(userString) : null;

  const [, setCopyConfirmation] = useState<string | null>(null);
  const [shouldExportImage, setShouldExportImage] = useState(true);
  const [, setIsExporting] = useState(false);
  const [title, setTitle] = useState('');

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  if (!user) {
    return null;
  }

  const handleExport = async (): Promise<void> => {
    if (!title.trim()) {
      setCopyConfirmation("Veuillez entrer un titre pour l'export");
      return;
    }

    setIsExporting(true);

    try {
      const image = await handleExportClick();
      if (!shouldExportImage || !image) {
        setCopyConfirmation('Export sans image sélectionnée');
        setIsExporting(false);
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');

      // const savedFilters = localStorage.getItem(STORAGE_KEY);
      // const configObject = {
      //   titre: title,
      //   config: savedFilters ? JSON.parse(savedFilters) : [],
      // };

      if (shouldExportImage && image) {
        const link = document.createElement('a');
        link.download = `visualisation_${timestamp}.png`;
        link.href = image.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setCopyConfirmation('Export réussi !');
    } catch (e) {
      setCopyConfirmation("Erreur lors de l'exportation de l'image");
    }

    setIsExporting(false);
    setTimeout(() => setCopyConfirmation(null), 3000);
  };

  const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const handleCopyConfig = () => {
    const savedFilters = localStorage.getItem(STORAGE_KEY);
    const configToCopy = savedFilters || 'Aucune configuration trouvée';

    navigator.clipboard
      .writeText(configToCopy)
      .then(() => {
        // Optionnel: Afficher un message de confirmation si la copie a réussi
      })
      .catch((error) => {
        console.error('Erreur lors de la copie:', error);
        showAlert('Erreur', 'Erreur lors de la copie de la configuration.', 'danger');
      });
  };

  return (
    <div className='w-full flex flex-col gap-4 h-full justify-between'>
      <div className='flex flex-col gap-4'>
        <div className='text-sm flex justify-start leading-[150%] w-full gap-2 rounded-none text-c6 bg-transparent'>
          Exporter une recherche
        </div>
        <Divider />

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size='lg'
          placeholder='Titre de la recherche...'
          className='focus:bg-c3 bg-c3 h-[50px] text-c6'
          classNames={{
            inputWrapper: 'bg-c3 !bg-c3 h-full',
            base: 'rounded-lg h-full ',
            innerWrapper: 'focus:bg-c3 bg-c3 h-full',
          }}
        />

        <Checkbox
          id='export-image-checkbox'
          isSelected={shouldExportImage}
          onValueChange={setShouldExportImage}
          radius='sm'
          color='secondary'
          classNames={{ wrapper: 'w-[16px] h-[16px]', icon: 'w-[10px] h-[10px]' }}>
          Exporter une image de la vue
        </Checkbox>
      </div>
      {generatedImage && (
        <div className='flex-1 flex flex-col aspect-video overflow-hidden rounded-b-8'>
          <div className='text-c6 text-xs'>Prévisualisation :</div>
          <img
            src={generatedImage.dataUrl}
            alt='Aperçu de la visualisation'
            className='flex-1 w-full h-full object-cover mt-2 rounded-lg'
          />
        </div>
      )}

      <div className='flex flex-row justify-between'>
        <div className='flex justify-end gap-2 mt-4 h-[30px]'>
          <Button
            size='md'
            className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
            onClick={handleCopyConfig}
            onPress={() => {
              addToast({
                title: 'Configuration copié',
                classNames: {
                  base: cn(['text-c6', 'mb-4']),
                  icon: 'w-6 h-6 fill-current text-c6',
                },
                severity: 'success',
              });
            }}>
            <ShareIcon size={12} />
            Copier la configuration
          </Button>
        </div>
        <div className='flex justify-end gap-2 mt-4'>
          <Button
            className='text-base h-auto px-2.5 py-1.5 rounded-lg text-selected gap-2 bg-action transition-all ease-in-out duration-200 disabled:opacity-50 disabled:hover:opacity-50 disabled:cursor-not-allowed'
            color='primary'
            onClick={() => {
              const exportPromise = handleExport();
              addToast({
                promise: exportPromise,
                title: 'Exportation en cours...',
                classNames: {
                  base: cn(['text-c6', 'mb-4']),
                  icon: 'w-6 h-6 fill-current text-c6',
                },
                severity: 'success',
              });
            }}
            disabled={!exportEnabled || !title.trim()}>
            Enregistrer
          </Button>
        </div>
      </div>

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        description={alertConfig.message}
        type={alertConfig.type}
        confirmLabel='Ok'
        onConfirm={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
