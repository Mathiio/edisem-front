import React, { useState, useEffect } from 'react';

import { Layouts } from '@/components/layout/Layouts';
import { DotsIcon, FileIcon } from '@/components/ui/icons';
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Card, Skeleton } from '@heroui/react';
import { dropdownContentClassNames, dropdownMenuClassNames } from '@/theme/components/dropdown';
import { getResearchByActant } from '@/services/api';

// Interface pour les propriétés de RechercheCard
interface RechercheCardProps {
  recherche: Recherche;
}

// Interface pour la structure d'une recherche
interface Recherche {
  id: string;
  title: string;
  created: string;
  imageUrl: string;
  config: string;
}

// Composant Card pour les recherches
const RechercheCard: React.FC<RechercheCardProps> = ({ recherche }) => {
  // État pour afficher le message de notification
  const [notification, setNotification] = useState<string | null>(null);

  // Fonction pour copier le lien de partage dans le presse-papier
  const handleShare = () => {
    navigator.clipboard
      .writeText(recherche.config)
      .then(() => {
        setNotification('Lien copié !');
        setTimeout(() => setNotification(null), 2000);
      })
      .catch((err) => {
        console.error('Erreur lors de la copie: ', err);
        setNotification('Erreur lors de la copie');
        setTimeout(() => setNotification(null), 2000);
      });
  };

  // Fonction pour enregistrer l'image
  const handleSaveImage = () => {
    // Créer un lien pour télécharger l'image
    const link = document.createElement('a');
    link.href = recherche.imageUrl;
    link.download = `recherche-${recherche.id}-${recherche.title.slice(0, 10).toLowerCase().replace(/\s/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Empêcher la propagation des clics sur le menu dropdown
  const handleDropdownTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className='relative rounded-lg overflow-hidden border border-gray-200 h-full'>
      {/* Notification */}
      {notification && <div className='absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-px rounded-md z-10'>{notification}</div>}

      <div className='flex flex-col h-full'>
        <a href={'/visualisation?config=' + encodeURIComponent(JSON.stringify(recherche.config))} className='w-full h-48 overflow-hidden'>
          <img src={recherche.imageUrl || '/rechercheDefaultImage.png'} alt={recherche.title} className='w-full h-full object-cover rounded-xl' />
        </a>
        <div className='pt-4 flex flex-col flex-grow'>
          <div className='flex justify-between items-start mb-2'>
            <div className='flex-1'>
              <h3 className='text-lg font-medium text-c6 mb-px'>{recherche.title}</h3>
              <div className='flex items-center text-c4 text-sm'>
                <span>{recherche.created}</span>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Dropdown classNames={dropdownContentClassNames}>
                <DropdownTrigger className='cursor-pointer text-c6 pt-[5px]' onClick={handleDropdownTriggerClick}>
                  <div className=''>
                    <DotsIcon className='mx-px' size={18} />
                  </div>
                </DropdownTrigger>

                <DropdownMenu aria-label='Menu de recherche' className='p-2 text-c6' classNames={dropdownMenuClassNames}>
                  <DropdownItem
                    key='Save'
                    className='gap-2 cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                    onPress={handleSaveImage}>
                    Enregistrer l'image
                  </DropdownItem>
                  <DropdownItem
                    key='See'
                    as='a'
                    href={recherche.config}
                    className='gap-2 cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'>
                    Visionner la recherche
                  </DropdownItem>
                  <DropdownItem
                    key='Share'
                    className='gap-2 cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                    onPress={handleShare}>
                    Partager le filtrage
                  </DropdownItem>
                  {/* <DropdownItem className='gap-2 text-red-500' onPress={handleDelete} key={'Delete'}>
                    Supprimer la recherche
                  </DropdownItem> */}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant Skeleton pour les recherches en cours de chargement
export const RechercheSkeletonCard: React.FC = () => {
  return (
    <Card className='h-full w-full space-y-3 p-0 overflow-hidden' radius='lg'>
      <Skeleton className='rounded-t-12 h-48' />
      <div className='p-4 space-y-3'>
        <Skeleton className='w-4/5 h-5 rounded-xl' />
        <Skeleton className='w-2/5 h-3 rounded-xl' />
      </div>
    </Card>
  );
};

export const UnloadedCard: React.FC = () => (
  <div className='w-full h-full flex flex-col justify-center items-center gap-8 mt-12'>
    <div className='max-w-lg flex flex-col justify-center items-center gap-1.5'>
      <FileIcon size={42} className='text-c4' />
      <div className='w-4/5 flex flex-col justify-center items-center gap-3'>
        <h2 className='text-c6 text-2xl font-medium'>Oups !</h2>
        <p className='text-c6 text-base text-center font-medium'>Aucune recherche disponible pour cette session...</p>
        <p className='text-c4 text-sm text-center'>
          Il n'existe actuellement aucune recherche d'enregistrée sur votre compte. Veuillez vérifier plus tard ou explorer la visualisation graphique pour sauvegarder vos
          recherches.
        </p>
      </div>
    </div>
  </div>
);

export const CahierRecherchePage: React.FC = () => {
  const userString = localStorage.getItem('user');
  const user: { id: string } | null = userString ? JSON.parse(userString) : null;

  const [recherches, setRecherches] = useState<Recherche[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const result = await getResearchByActant(user.id);
        setRecherches(result);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [user?.id]);

  if (!user) {
    return null;
  }

  // Fonction pour supprimer une recherche
  // const handleDelete = (id: number) => {
  //   setRecherches((prevRecherches) => prevRecherches.filter((recherche) => recherche.id !== id));
  // };

  // Générer des skeletons pour le chargement
  const renderSkeletons = () => {
    return Array(8)
      .fill(0)
      .map((_, index) => <RechercheSkeletonCard key={`skeleton-${index}`} />);
  };

  // Vérifier s'il y a des recherches à afficher
  const hasRecherches: boolean = recherches.length > 0;

  return (
    <Layouts className='flex flex-col col-span-10 justify-start gap-6 items-center p-6'>
      <div className='w-full flex flex-col'>
        <h1 className='text-c6 text-3xl font-medium mb-8'>Recherches enregistrées</h1>

        {isLoading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>{renderSkeletons()}</div>
        ) : hasRecherches ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {recherches.map((recherche) => (
              <RechercheCard key={recherche.id} recherche={recherche} />
            ))}
          </div>
        ) : (
          <UnloadedCard />
        )}
      </div>
    </Layouts>
  );
};
