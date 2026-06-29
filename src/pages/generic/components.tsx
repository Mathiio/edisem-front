import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { getYouTubeThumbnailUrl, isValidYouTubeUrl } from '@/lib/utils';
import { AddResourceCard } from '@/components/features/forms/edit/AddResourceCard';
import { ThumbnailIcon } from '@/components/ui/icons';
import { ModalCloseIcon, modalCloseButtonClasses } from '@/theme/components';
import { canEditLinkedResource, canUnlinkLinkedResource, shouldHardDeleteLinkedResource } from '@/pages/generic/resourceHelpers';

/**
 * Composants réutilisables pour les viewOptions
 *
 * Évite de copier-coller le même code dans chaque config!
 */

const removeButtonClass = [modalCloseButtonClasses, 'inline-flex items-center justify-center shrink-0 p-1 text-sm'].join(' ');

// ========================================
// ToolItem - Composant de base pour afficher un item avec image, titre, description
// ========================================

export interface ToolItemData {
  id: string | number;
  title: string;
  url?: string;
  uri?: string; // Certains items utilisent uri au lieu de url
  thumbnail?: string;
  description?: string;
  associatedMedia?: string | string[]; // Peut être une string ou un tableau
  ownerId?: number;
}

interface ToolItemProps {
  tool: ToolItemData;
  onNavigate?: (url: string) => void; // Callback pour navigation avec animation
  animationDelay?: number; // Délai en ms avant navigation (pour laisser l'animation jouer)
  onEdit?: (id: string | number) => void; // Callback pour édition (ouvre un onglet)
  disableNavigation?: boolean; // En mode édition : outil non modifiable → aucune action au clic
}

export const ToolItem: React.FC<ToolItemProps> = ({
  tool,
  onNavigate,
  onEdit,
  disableNavigation = false,
  animationDelay = 450,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  const itemUrl = tool.url || tool.uri || '#';

  // Complètement verrouillé : ni édition possible, ni navigation
  const isLocked = disableNavigation && !onEdit;

  const handleClick = (e: React.MouseEvent) => {
    if (onEdit) {
      e.preventDefault();
      onEdit(tool.id);
      return;
    }
    if (disableNavigation || !itemUrl || itemUrl === '#') {
      e.preventDefault();
      return;
    }
    if (itemUrl.startsWith('http')) return;
    e.preventDefault();
    setIsNavigating(true);
    if (onNavigate) {
      onNavigate(itemUrl);
    } else {
      setTimeout(() => navigate(itemUrl), animationDelay);
    }
  };

  const getThumbnail = (): string | undefined => {
    if (tool.thumbnail) return tool.thumbnail;
    if (Array.isArray(tool.associatedMedia) && tool.associatedMedia.length > 0) {
      const firstMedia = tool.associatedMedia[0];
      if (typeof firstMedia === 'object' && firstMedia !== null) {
        const mediaObj = firstMedia as any;
        if (mediaObj.url) {
          return isValidYouTubeUrl(mediaObj.url) ? getYouTubeThumbnailUrl(mediaObj.url) : mediaObj.url;
        }
      }
      if (typeof firstMedia === 'string') return firstMedia;
    }
    if (typeof tool.associatedMedia === 'string') return tool.associatedMedia;
    return undefined;
  };

  const thumbnail = getThumbnail();
  const borderClass = !isLocked && isHovered ? 'border-c4' : 'border-c3';

  const innerContent = (
    <div className='flex flex-row gap-4 items-center min-w-0'>
      <div className='flex-shrink-0 w-10 h-10 rounded-md overflow-hidden flex items-center justify-center bg-gradient-to-br from-c2 to-c3'>
        {thumbnail ? (
          <img src={thumbnail} alt='' className='w-10 h-10 object-cover' />
        ) : (
          <ThumbnailIcon className='text-c4/40' size={22} />
        )}
      </div>
      <div className='w-full flex flex-col gap-2.5 min-w-0'>
        <p className='text-c6 text-base'>{tool.title}</p>
        {tool.description && (
          <p className='text-c4 text-sm leading-[120%] text-overflow-ellipsis line-clamp-3 w-full'>{tool.description}</p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`w-full flex flex-row justify-between border-2 rounded-xl items-center gap-6 transition-colors ${borderClass} ${isLocked ? 'cursor-default' : 'cursor-pointer hover:bg-c2/40'} ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
      onMouseEnter={isLocked ? undefined : () => setIsHovered(true)}
      onMouseLeave={isLocked ? undefined : () => setIsHovered(false)}>
      {isLocked ? (
        // Item verrouillé : div non-interactif, aucun effet de survol navigateur
        <div className='w-full gap-6 p-4 flex flex-row'>
          {innerContent}
        </div>
      ) : (
        <Link
          className='w-full gap-6 p-4 flex flex-row cursor-pointer'
          to={itemUrl}
          target={itemUrl.startsWith('http') ? '_blank' : undefined}
          onClick={handleClick}>
          {innerContent}
        </Link>
      )}
    </div>
  );
};

// ========================================
// SimpleTextBlock - Afficher du texte simple avec border
// ========================================

interface SimpleTextBlockProps {
  content: string;
  className?: string;
}

export const SimpleTextBlock: React.FC<SimpleTextBlockProps> = ({ content, className = '' }) => {
  return (
    <div className={`w-full flex flex-row justify-between border-2 rounded-xl items-center gap-6 transition-transform-colors-opacity border-c3 ${className}`}>
      <div className='w-full gap-6 p-6 flex flex-row justify-between'>
        <div className='flex flex-col gap-4 items-start w-full'>
          <div className='w-full flex flex-col gap-2.5'>
            <p className='text-c6 text-base h-full' style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// ItemsList - Liste d'items avec ToolItem
// ========================================

interface ItemsListProps {
  items: ToolItemData[];
  mapUrl?: (item: ToolItemData) => string; // Fonction pour générer l'URL
  loading?: boolean; // État de chargement
  // Props pour le mode édition
  isEditing?: boolean;
  resourceLabel?: string; // Label pour le bouton "Ajouter"
  onAdd?: () => void;
  onRemoveItem?: (id: string | number) => void;
  onNavigate?: (url: string) => void; // Callback pour animation avant navigation
  onEdit?: (id: string | number) => void; // Callback pour édition
  resourceTemplateId?: number; // Template de la vue (règle délier vs supprimer)
  userCreatedResourceIds?: Set<string>; // IDs créés par l'utilisateur dans cette session
  currentOmekaUserId?: number | null; // Propriétaire Omeka S courant (o:owner)
  isGlobalAdminEdit?: boolean;
}

export const ItemsList: React.FC<ItemsListProps> = ({
  items,
  mapUrl,
  loading = false,
  isEditing = false,
  resourceLabel = 'ressource',
  onAdd,
  onRemoveItem,
  onNavigate,
  onEdit,
  resourceTemplateId,
  userCreatedResourceIds,
  currentOmekaUserId,
  isGlobalAdminEdit,
}) => {
  const itemsArray = Array.isArray(items) ? items : items ? [items] : [];

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Spinner size='lg' />
        <span className='ml-3 text-c5'>Chargement des ressources...</span>
      </div>
    );
  }

  if (!isEditing && itemsArray.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-2.5'>
      {itemsArray.map((item) => {
        const mappedItem = mapUrl ? { ...item, url: mapUrl(item) } : item;
        const canEdit = Boolean(onEdit && canEditLinkedResource(item, currentOmekaUserId, userCreatedResourceIds, isGlobalAdminEdit));
        const canRemove = Boolean(
          onRemoveItem &&
          canUnlinkLinkedResource(item, resourceTemplateId, currentOmekaUserId, userCreatedResourceIds, isGlobalAdminEdit),
        );
        const removeLabel = shouldHardDeleteLinkedResource(resourceTemplateId) ? 'Supprimer' : 'Délier';

        return (
          <div key={item.id} className='relative group'>
            <ToolItem
              tool={mappedItem}
              onNavigate={onNavigate}
              onEdit={canEdit ? onEdit : undefined}
              disableNavigation={isEditing && !canEdit}
            />
            {isEditing && canRemove && (
              <div className='absolute top-0 right-4 z-10 h-full flex items-center'>
                <button
                  type='button'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveItem!(item.id);
                  }}
                  className={removeButtonClass}
                  title={removeLabel}
                  aria-label={removeLabel}>
                  <ModalCloseIcon />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {isEditing && onAdd && <AddResourceCard resourceLabel={resourceLabel} onAdd={onAdd} />}
    </div>
  );
};
