import React, { useCallback, useState } from 'react';
import { addToast } from '@/theme/components';
import { outlineButtonClass } from '@/theme/components/button';
import { FileIcon } from '@/components/ui/icons';
import { fetchLinkingExportCatalog } from '@/services/UserSpace';
import { downloadLinkingCatalogExcel } from '@/lib/linkingExport';

interface ExportLinkingCatalogButtonProps {
  className?: string;
}

export const ExportLinkingCatalogButton: React.FC<ExportLinkingCatalogButtonProps> = ({ className }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchLinkingExportCatalog();
      if (items.length === 0) {
        addToast({
          title: 'Export',
          description: 'Aucune ressource à exporter pour le moment.',
          color: 'warning',
        });
        return;
      }
      downloadLinkingCatalogExcel(items);
      addToast({
        title: 'Catalogue téléchargé',
        description: `${items.length} ressource${items.length > 1 ? 's' : ''} du site (conférences, récits, expérimentations chercheur) — prêt pour établir des liens.`,
        color: 'success',
      });
    } catch (error) {
      console.error('Linking export error:', error);
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Impossible d'exporter le catalogue.",
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <button
      type='button'
      onClick={handleExport}
      disabled={loading}
      className={`${outlineButtonClass} disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
      title='Télécharge un tableau des conférences, récits et expérimentations chercheur du site (ID, titre, mots-clés, type) pour faciliter les liens entre ressources'>
      <FileIcon size={14} className='text-c6 shrink-0' />
      <span>{loading ? 'Téléchargement…' : 'Exporter Liens'}</span>
    </button>
  );
};
