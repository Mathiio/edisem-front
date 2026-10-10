import React from 'react';

interface ViewLoaderProps {
  /** État de chargement */
  isLoading: boolean;
  /** Message d'erreur (si présent, affiche l'état d'erreur) */
  error?: string | null;
  /** Données vides (si true et pas de loading/error, affiche l'état vide) */
  isEmpty?: boolean;
  /** Icône à afficher (pour les états erreur et vide) */
  icon: React.ReactNode;
  /** Titre de la vue (affiché dans les états erreur et vide) */
  title: string;
  /** Message pour l'état vide */
  emptyMessage?: string;
  /** Placeholder pulse (structure proche du contenu chargé) */
  loadingSkeleton?: React.ReactNode;
  /** Contenu à afficher quand les données sont chargées */
  children: React.ReactNode;
}

/**
 * Composant réutilisable pour gérer les états de chargement, erreur et vide
 * des vues analytics. Harmonise l'UI entre tous les composants.
 */
export const ViewLoader: React.FC<ViewLoaderProps> = ({
  isLoading,
  error,
  isEmpty,
  icon,
  title,
  emptyMessage = 'Aucune donnée disponible.',
  loadingSkeleton,
  children,
}) => {
  if (isLoading) {
    return (
      <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-c1'>
        {loadingSkeleton ?? (
          <div className='flex flex-1 items-center justify-center p-6'>
            <div className='h-64 w-full max-w-lg animate-pulse rounded-xl bg-c3' />
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 bg-c1 py-12'>
        <div className='text-red-500'>{React.cloneElement(icon as React.ReactElement, { size: 42 })}</div>
        <div className='flex flex-col items-center justify-center gap-4'>
          <h2 className='text-xl font-medium text-c6'>Erreur</h2>
          <p className='max-w-md text-center text-sm text-c4'>{error}</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className='flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 bg-c1 py-12'>
        <div className='text-c4'>{React.cloneElement(icon as React.ReactElement, { size: 42 })}</div>
        <div className='flex flex-col items-center justify-center gap-4'>
          <h2 className='text-xl font-medium text-c6'>{title}</h2>
          <p className='max-w-md text-center text-sm text-c4'>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ViewLoader;
