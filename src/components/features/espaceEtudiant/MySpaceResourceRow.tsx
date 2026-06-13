import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EditIcon, TrashIcon, ThumbnailIcon } from '@/components/ui/icons';
import {
  getResourceEditUrl,
  getResourceUrl,
  getResourceDisplayTheme,
  isFormOnlyResourceType,
} from '@/config/resourceConfig';
import { getResourceAuthors, getResourceSubtitle, resolveOmekaThumbnail } from '@/lib/resourceUtils';
import type { StudentResourceCard } from '@/services/StudentSpace';

export const mySpaceActionButtonClass =
  'inline-flex items-center justify-center size-9 rounded-lg border-2 border-c3 bg-c2 hover:bg-c3 text-c6 transition-colors cursor-pointer shrink-0';

export const mySpaceActionButtonDangerClass = `${mySpaceActionButtonClass} hover:text-danger`;

type MySpaceActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'danger';
};

export const MySpaceActionButton: React.FC<MySpaceActionButtonProps> = ({
  variant = 'default',
  className = '',
  type = 'button',
  children,
  ...props
}) => (
  <button
    type={type}
    className={`${variant === 'danger' ? mySpaceActionButtonDangerClass : mySpaceActionButtonClass}${className ? ` ${className}` : ''}`}
    {...props}>
    {children}
  </button>
);

/** Largeur fixe : 3 boutons (voir + éditer + supprimer) */
export const MY_SPACE_ACTIONS_WIDTH = '7.5rem';
export const MY_SPACE_TYPE_WIDTH = '10rem';

/** Grille partagée lignes + en-têtes (desktop) — colonnes type et actions à largeur fixe */
export const MY_SPACE_ROW_GRID =
  'grid items-center gap-x-4 grid-cols-[3rem_minmax(0,1fr)_auto_auto] lg:grid-cols-[3rem_minmax(0,28%)_minmax(140px,1fr)_10rem_7.5rem]';

export const getResourceRowSubtitle = (item: StudentResourceCard): string => {
  const authors = getResourceAuthors(item);
  if (authors.length > 0) return authors.map((a) => a.name).join(', ');

  if (item.actants?.length) {
    return item.actants
      .map((a) => a.title || a.name)
      .filter(Boolean)
      .join(', ');
  }

  const subtitle = getResourceSubtitle(item);
  if (subtitle) return subtitle;

  return '—';
};

interface MySpaceResourceRowProps {
  item: StudentResourceCard;
  onEdit?: (id: string, type?: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export const MySpaceResourceRow: React.FC<MySpaceResourceRowProps> = ({
  item,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const navigate = useNavigate();
  const id = String(item.id);
  const type = item.type || '';
  const formOnly = isFormOnlyResourceType(type);
  const { label: typeLabel, icon: TypeIcon, color: typeColor } = getResourceDisplayTheme(type);
  const subtitle = getResourceRowSubtitle(item);
  const thumbnail =
    resolveOmekaThumbnail(item.thumbnail) ||
    (item.url?.includes('youtube') || item.url?.includes('youtu.be') ? item.thumbnail : null);

  const handleView = () => {
    const url = getResourceUrl(type, id);
    if (url && url !== '#') navigate(url);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(id, type);
      return;
    }
    navigate(getResourceEditUrl(type, id));
  };

  const handleDelete = () => onDelete?.(id);

  return (
    <div
      className={`${MY_SPACE_ROW_GRID} border-2 border-c3 rounded-xl bg-c1 hover:bg-c2/30 transition-colors ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      }`}>
      <div className='size-12 rounded-lg border border-c3 bg-c2 overflow-hidden flex items-center justify-center shrink-0 self-center'>
        {thumbnail ? (
          <img src={thumbnail} alt='' className='w-full h-full object-cover' />
        ) : (
          <ThumbnailIcon size={20} className='text-c4/40' />
        )}
      </div>

      <div className='min-w-0 max-w-full lg:max-w-[320px]'>
        <p className='text-c6 font-medium text-sm lg:text-base leading-snug line-clamp-2 break-words'>
          {item.title || 'Sans titre'}
        </p>
        <p className='text-c4 text-xs leading-snug line-clamp-2 break-words mt-0.5 lg:hidden'>{subtitle}</p>
      </div>

      <p
        className='hidden lg:block text-c4 text-sm leading-snug line-clamp-2 break-words min-w-0 self-center'
        title={subtitle}>
        {subtitle}
      </p>

      <div
        className='flex items-center gap-2 min-w-0 shrink-0 self-center'
        style={{ width: MY_SPACE_TYPE_WIDTH }}>
        <div
          className='p-1.5 rounded-lg flex items-center justify-center border border-c3 shrink-0'
          style={{ backgroundColor: `${typeColor}15` }}>
          <TypeIcon size={12} style={{ color: typeColor }} />
        </div>
        <span className='text-xs lg:text-sm leading-snug line-clamp-2 break-words min-w-0' style={{ color: typeColor }}>
          {typeLabel}
        </span>
      </div>

      <div
        className='flex items-center gap-1.5 shrink-0 self-center justify-end'
        style={{ width: MY_SPACE_ACTIONS_WIDTH }}>
        {!formOnly && (
          <MySpaceActionButton onClick={handleView} title='Voir' aria-label='Voir la ressource'>
            <EyeIcon size={16} />
          </MySpaceActionButton>
        )}
        <MySpaceActionButton onClick={handleEdit} title='Modifier' aria-label='Modifier la ressource'>
          <EditIcon size={16} />
        </MySpaceActionButton>
        {onDelete && (
          <MySpaceActionButton variant='danger' onClick={handleDelete} title='Supprimer' aria-label='Supprimer la ressource'>
            <TrashIcon size={16} />
          </MySpaceActionButton>
        )}
      </div>
    </div>
  );
};

const pulseBlock = 'rounded-lg bg-c3 animate-pulse';

export const MySpaceResourceRowSkeleton: React.FC = () => (
  <div className={`${MY_SPACE_ROW_GRID} border-2 border-c3 rounded-xl px-4 py-3`}>
    <div className={`size-12 shrink-0 ${pulseBlock}`} />
    <div className='flex flex-col gap-2 min-w-0 max-w-[320px]'>
      <div className={`h-4 w-full ${pulseBlock}`} />
      <div className={`h-4 w-4/5 ${pulseBlock}`} />
    </div>
    <div className={`hidden lg:block h-4 w-full ${pulseBlock}`} />
    <div className={`h-8 shrink-0 ${pulseBlock}`} style={{ width: MY_SPACE_TYPE_WIDTH }} />
    <div className='flex gap-1.5 justify-end shrink-0' style={{ width: MY_SPACE_ACTIONS_WIDTH }}>
      <div className={`size-9 ${pulseBlock}`} />
      <div className={`size-9 ${pulseBlock}`} />
      <div className={`size-9 ${pulseBlock}`} />
    </div>
  </div>
);
