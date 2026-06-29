import { useState } from 'react';
import { Button, Popover, PopoverTrigger, PopoverContent, Input, Checkbox, cn } from '@heroui/react';
import { addToast } from '@/theme/components';
import { ExportIcon, ShareIcon } from '@/components/ui/icons';
import { GeneratedImage } from '@/pages/visualisation/types';
import { saveResearch } from '@/services/UserSpace';
import { FilterGroup, NodePosition } from '@/components/features/pages/visualisation/FilterPopup';

interface HeaderExportButtonProps {
  handleExportClick: () => Promise<GeneratedImage>;
  generatedImage: GeneratedImage | null;
  exportEnabled: boolean;
  filterGroups?: FilterGroup[];
  onNavigateToCahiers?: () => void;
  getNodePositions?: () => NodePosition[];
}

export default function HeaderExportButton({ handleExportClick, generatedImage, exportEnabled, filterGroups, onNavigateToCahiers, getNodePositions }: HeaderExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [shouldExportImage, setShouldExportImage] = useState(true);
  const [shouldSaveToDatabase, setShouldSaveToDatabase] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (): Promise<void> => {
    if (!title.trim()) return;

    setIsExporting(true);

    try {
      const image = await handleExportClick();

      // Sauvegarder dans Omeka S si demandé (avec l'image de la visualisation)
      if (shouldSaveToDatabase && filterGroups && filterGroups.length > 0) {
        try {
          // Capturer les positions actuelles des nodes pour les sauvegarder avec la recherche
          const nodePositions = getNodePositions ? getNodePositions() : [];
          const configWithPositions = {
            filters: filterGroups,
            nodePositions: nodePositions,
          };
          await saveResearch(title, configWithPositions, image?.dataUrl);
          addToast({
            title: 'Recherche sauvegardée',
            description: 'Votre recherche a été enregistrée dans votre cahier.',
            classNames: {
              base: cn(['text-c6', 'mb-4']),
              icon: 'w-6 h-6 fill-current text-c6',
            },
            severity: 'success',
            endContent: onNavigateToCahiers ? (
              <Button
                size='sm'
                variant='flat'
                className='text-action text-xs h-[24px]'
                onPress={() => {
                  onNavigateToCahiers();
                }}>
                Voir
              </Button>
            ) : undefined,
          });
        } catch (saveError: any) {
          console.error('Erreur sauvegarde Omeka:', saveError);
          addToast({
            title: 'Erreur de sauvegarde',
            description: saveError.message || 'Impossible de sauvegarder la recherche.',
            classNames: {
              base: cn(['text-c6', 'mb-4']),
              icon: 'w-6 h-6 fill-current text-c6',
            },
            severity: 'danger',
          });
        }
      }

      // Exporter l'image si demandé
      if (shouldExportImage && image) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
        const link = document.createElement('a');
        link.download = `visualisation_${timestamp}.png`;
        link.href = image.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setIsOpen(false);
      setTitle('');
    } catch (e) {
      console.error("Erreur lors de l'exportation:", e);
    }

    setIsExporting(false);
  };

  const handleCopyConfig = () => {
    // Capturer les positions actuelles des nodes
    const nodePositions = getNodePositions ? getNodePositions() : [];

    // Créer la configuration complète avec filtres et positions
    const configToCopy = JSON.stringify({
      filters: filterGroups || [],
      nodePositions: nodePositions,
    });

    navigator.clipboard
      .writeText(configToCopy)
      .then(() => {
        addToast({
          title: 'Configuration copiée',
          description: nodePositions.length > 0 ? `${nodePositions.length} positions de nœuds incluses` : undefined,
          classNames: {
            base: cn(['text-c6', 'mb-4']),
            icon: 'w-6 h-6 fill-current text-c6',
          },
          severity: 'success',
        });
      })
      .catch((error) => {
        console.error('Erreur lors de la copie:', error);
      });
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement='bottom-end'>
      <PopoverTrigger>
        <Button size='sm' variant='bordered' className='border-c3 text-c6 hover:bg-c3 gap-1.5 h-[32px]' isDisabled={!exportEnabled}>
          <ExportIcon size={14} />
          <span className='text-xs'>Exporter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='bg-c2 border-2 border-c3 rounded-lg p-0 w-[320px]'>
        <div className='p-2.5 flex flex-col gap-2.5'>
          <p className='text-sm text-c6 font-medium'>Exporter la recherche</p>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size='sm'
            placeholder='Titre de la recherche...'
            classNames={{
              inputWrapper: 'bg-c3 border-2 border-c3 hover:bg-c3 group-data-[focus=true]:bg-c3 h-[36px]',
              input: 'text-c6 text-xs',
            }}
          />

          <div className='flex flex-col gap-6'>
            <Checkbox
              isSelected={shouldSaveToDatabase}
              onValueChange={setShouldSaveToDatabase}
              radius='sm'
              size='sm'
              classNames={{
                wrapper: 'w-[14px] h-[14px]',
                icon: 'w-[8px] h-[8px]',
                label: 'text-xs text-c6',
              }}>
              Sauvegarder dans mon cahier
            </Checkbox>
            <Checkbox
              isSelected={shouldExportImage}
              onValueChange={setShouldExportImage}
              radius='sm'
              size='sm'
              classNames={{
                wrapper: 'w-[14px] h-[14px]',
                icon: 'w-[8px] h-[8px]',
                label: 'text-xs text-c6',
              }}>
              Télécharger l'image
            </Checkbox>
          </div>

          {generatedImage && shouldExportImage && (
            <div className='rounded-md overflow-hidden border-2 border-c3'>
              <img src={generatedImage.dataUrl} alt='Aperçu' className='w-full h-auto object-cover' />
            </div>
          )}

          <div className='flex items-center justify-between pt-1.5 border-t border-c3'>
            <Button size='sm' variant='light' className='text-c4 hover:text-c6 h-[28px] gap-4 text-[11px]' onPress={handleCopyConfig}>
              <ShareIcon size={10} />
              Copier config
            </Button>
            <Button
              size='sm'
              className='bg-action text-selected h-[28px] px-12 text-xs'
              onPress={() => {
                const exportPromise = handleExport();
                addToast({
                  promise: exportPromise,
                  title: 'Exportation...',
                  classNames: {
                    base: cn(['text-c6', 'mb-4']),
                    icon: 'w-6 h-6 fill-current text-c6',
                  },
                  severity: 'success',
                });
              }}
              isDisabled={!title.trim() || isExporting}>
              Enregistrer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
