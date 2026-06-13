import React, { useState, useEffect } from 'react';
import { DotsIcon } from '@/components/ui/icons';
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Card, Skeleton, Button } from '@heroui/react';
import { dropdownContentClassNames, dropdownMenuClassNames } from '@/theme/components/dropdown';
import { getResearchByActant } from '@/services/api';
import { FilterGroup, NodePosition } from '@/components/features/datavisualisation/FilterPopup';
import { LibraryBig, History, Trash2 } from 'lucide-react';

interface Recherche {
  id: string;
  title: string;
  created: string;
  imageUrl: string;
  config: string;
}

interface RechercheCardProps {
  recherche: Recherche;
  onSelect: (config: FilterGroup[], nodePositions?: NodePosition[]) => void;
}

const RechercheCard: React.FC<RechercheCardProps> = ({ recherche, onSelect }) => {
  const [notification, setNotification] = useState<string | null>(null);

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

  const handleSaveImage = () => {
    const link = document.createElement('a');
    link.href = recherche.imageUrl;
    link.download = `recherche-${recherche.id}-${recherche.title.slice(0, 10).toLowerCase().replace(/\s/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClick = () => {
    try {
      const config = JSON.parse(recherche.config);

      // Support ancien format (array de FilterGroup) et nouveau format ({ filters, nodePositions })
      if (Array.isArray(config)) {
        // Ancien format: juste un array de FilterGroup
        onSelect(config);
      } else if (config.filters && Array.isArray(config.filters)) {
        // Nouveau format: { filters: FilterGroup[], nodePositions?: NodePosition[] }
        onSelect(config.filters, config.nodePositions);
      } else {
        console.error('Format de config invalide:', config);
      }
    } catch (e) {
      console.error('Erreur de parsing config:', e);
    }
  };

  const handleDropdownTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className='relative rounded-xl overflow-hidden border-2 border-c3 h-full bg-c2 hover:border-c4 transition-all cursor-pointer '>
      {notification && <div className='absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-px rounded-md z-10'>{notification}</div>}

      <div className='flex flex-col h-full'>
        <div onClick={handleClick} className='w-full h-full overflow-hidden '>
          <img src={recherche.imageUrl || '/rechercheDefaultImage.png'} alt={recherche.title} className='w-full h-full object-cover aspect-video' />
        </div>
        <div className='p-5 flex flex-col flex-grow'>
          <div className='flex justify-between items-start'>
            <div className='flex flex-col gap-4' onClick={handleClick}>
              <h3 className='text-sm font-medium text-c6'>{recherche.title}</h3>
              <span className='text-xs text-c4'>{recherche.created}</span>
            </div>
            <Dropdown classNames={dropdownContentClassNames}>
              <DropdownTrigger className='cursor-pointer text-c6' onClick={handleDropdownTriggerClick}>
                <div className='p-4 hover:bg-c3 rounded-md'>
                  <DotsIcon size={16} />
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
                  className='gap-2 cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                  onPress={handleClick}>
                  Charger la recherche
                </DropdownItem>
                <DropdownItem
                  key='Share'
                  className='gap-2 cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                  onPress={handleShare}>
                  Partager la recherche
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
};

const RechercheSkeletonCard: React.FC = () => (
  <Card className='h-full w-full space-y-3 p-0 overflow-hidden bg-c2' radius='lg'>
    <Skeleton className='rounded-t-12'>
      <div className='h-10 rounded-t-12 bg-c3' />
    </Skeleton>
    <div className='p-2.5 space-y-3'>
      <Skeleton className='w-4/5 rounded-lg'>
        <div className='h-16 w-4/5 rounded-lg bg-c3' />
      </Skeleton>
      <Skeleton className='w-2/5 rounded-lg'>
        <div className='h-3 w-2/5 rounded-lg bg-c3' />
      </Skeleton>
    </div>
  </Card>
);

const EmptyState: React.FC = () => (
  <div className='w-full h-full flex flex-col justify-center items-center gap-8 py-12'>
    <div className='max-w-lg flex flex-col justify-center items-center gap-4'>
      <LibraryBig size={42} className='text-c4' />
      <div className='flex flex-col justify-center items-center gap-3'>
        <h2 className='text-c6 text-xl font-medium'>Aucune recherche</h2>
        <p className='text-c4 text-sm text-center'>Vous n'avez pas encore de recherches enregistrées. Effectuez une recherche et sauvegardez-la pour la retrouver ici.</p>
      </div>
    </div>
  </div>
);

interface SearchHistoryItem {
  id: number;
  title: string;
  timestamp: string;
  filters: FilterGroup[];
  nodePositions?: NodePosition[];
}

interface CahiersViewProps {
  onSelectConfig: (filters: FilterGroup[], nodePositions?: NodePosition[]) => void;
}

export const CahiersView: React.FC<CahiersViewProps> = ({ onSelectConfig }) => {
  const userString = localStorage.getItem('user');
  const user: { id: string } | null = userString ? JSON.parse(userString) : null;

  const [recherches, setRecherches] = useState<Recherche[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);

  // Charger l'historique depuis le localStorage
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      setHistoryItems(history);
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error);
      setHistoryItems([]);
    }
  }, []);

  // Effacer tout l'historique
  const handleClearHistory = () => {
    localStorage.removeItem('searchHistory');
    setHistoryItems([]);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await getResearchByActant(user.id);
        setRecherches(result);
      } catch (error) {
        console.error('Erreur chargement recherches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- user recréé chaque render ; on se base sur user?.id
  }, [user?.id]);

  if (!user) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <p className='text-c4'>Connectez-vous pour voir vos recherches</p>
      </div>
    );
  }

  const renderSkeletons = () =>
    Array(6)
      .fill(0)
      .map((_, index) => <RechercheSkeletonCard key={`skeleton-${index}`} />);

  const hasRecherches = recherches.length > 0;
  const hasHistory = historyItems.length > 0;

  return (
    <div className='flex-1 w-full h-full overflow-auto p-5 bg-c1 '>
      <div className='flex flex-col gap-6'>
        {/* Section Cahiers de recherche */}
        <section>
          <div className='flex items-center gap-8 mb-4'>
            <LibraryBig size={18} className='text-c5' />
            <h2 className='text-c6 font-medium'>Cahiers de recherche</h2>
            {hasRecherches && <span className='text-c4 text-sm'>({recherches.length})</span>}
          </div>
          {isLoading ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>{renderSkeletons()}</div>
          ) : hasRecherches ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              {recherches
                .sort((b, a) => a.created.localeCompare(b.created))
                .map((recherche) => (
                  <RechercheCard key={recherche.id} recherche={recherche} onSelect={onSelectConfig} />
                ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        {/* Section Historique de recherche */}
        {hasHistory && (
          <section className='max-w-[50%]'>
            <div className='flex items-center justify-between mb-4 '>
              <div className='flex items-center gap-8'>
                <History size={18} className='text-c5' />
                <h2 className='text-c6 font-medium'>Historique des recherches</h2>
                <span className='text-c4 text-sm'>({historyItems.length})</span>
              </div>
              <Button size='sm' variant='light' className='text-c4 gap-4' onPress={handleClearHistory}>
                <Trash2 size={14} />
                <span className='text-xs'>Effacer</span>
              </Button>
            </div>
            <div className='flex flex-col gap-2.5'>
              {historyItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectConfig(item.filters, item.nodePositions)}
                  className='px-4 py-2.5 bg-c2 rounded-lg border border-c3 hover:border-c4 hover:bg-c3 transition-all text-left'>
                  <span className='text-c6 text-sm'>{item.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
