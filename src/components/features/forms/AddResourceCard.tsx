import React from 'react';
import { Button } from '@heroui/react';
import { AddIcon } from '@/components/ui/icons';
import { splitBibliographyMediagraphyTemplateIds } from '@/config/resourceConfig';
import type { LinkExistingOptions } from '@/pages/generic/config';

export interface AddResourceCardProps {
  resourceLabel?: string;
  /** Ouvre le ResourcePicker (sélection + création en nouvel onglet) */
  onAdd: () => void;
  disabled?: boolean;
  /** Pleine largeur du conteneur avec contenu centré (défaut: true) */
  fullWidth?: boolean;
  className?: string;
}

const DEFAULT_REFERENCE_TEMPLATE_IDS = [81, 99, 98, 83];

/** Deux boutons distincts (bibliographie / médiagraphie) quand la vue mélange les deux types */
export interface ReferenceAddButtonsProps {
  viewKey: string;
  templateIds?: number[];
  onLinkExisting?: (viewKey: string, options?: LinkExistingOptions) => void;
  className?: string;
}

export const ReferenceAddButtons: React.FC<ReferenceAddButtonsProps> = ({
  viewKey,
  templateIds = DEFAULT_REFERENCE_TEMPLATE_IDS,
  onLinkExisting,
  className = '',
}) => {
  if (!onLinkExisting) return null;

  const { bibliographies, mediagraphies, isMixed } = splitBibliographyMediagraphyTemplateIds(templateIds);

  if (!isMixed) {
    const ids = bibliographies.length > 0 ? bibliographies : mediagraphies;
    const label = bibliographies.length > 0 ? 'une bibliographie' : 'une médiagraphie';
    const pickerTitle = bibliographies.length > 0 ? 'Sélectionner une bibliographie' : 'Sélectionner une médiagraphie';
    return (
      <AddResourceCard
        resourceLabel={label}
        onAdd={() => onLinkExisting(viewKey, { resourceTemplateIds: ids, pickerTitle })}
        className={className}
      />
    );
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <AddResourceCard
        resourceLabel='une médiagraphie'
        fullWidth={false}
        onAdd={() =>
          onLinkExisting(viewKey, {
            resourceTemplateIds: mediagraphies,
            pickerTitle: 'Sélectionner une médiagraphie',
          })
        }
      />
      <AddResourceCard
        resourceLabel='une bibliographie'
        fullWidth={false}
        onAdd={() =>
          onLinkExisting(viewKey, {
            resourceTemplateIds: bibliographies,
            pickerTitle: 'Sélectionner une bibliographie',
          })
        }
      />
    </div>
  );
};

/** Bouton unique « Ajouter » — ouvre le ResourcePicker avec création intégrée */
export const AddResourceCard: React.FC<AddResourceCardProps> = ({
  resourceLabel,
  onAdd,
  disabled = false,
  fullWidth = true,
  className = '',
}) => {
  const label = resourceLabel ? `Ajouter ${resourceLabel}` : 'Ajouter';

  return (
    <button
      type='button'
      onClick={disabled ? undefined : onAdd}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 h-12 px-4 rounded-lg border-2 border-c3 bg-c2 hover:bg-c3 text-c6 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''} ${className}`}>
      <AddIcon size={14} className='text-c4' />
      {label}
    </button>
  );
};

/**
 * Version simplifiée - juste un bouton "+" qui ouvre directement le ResourcePicker
 */
export interface AddButtonProps {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'chip' | 'card' | 'icon';
}

export const AddButton: React.FC<AddButtonProps> = ({
  label,
  onClick,
  disabled = false,
  size = 'md',
  variant = 'chip',
}) => {
  const sizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-2.5 px-4 text-base',
  };

  if (variant === 'icon') {
    return (
      <Button
        isIconOnly
        size={size}
        onPress={onClick}
        isDisabled={disabled}
        className='bg-c3 text-c6 hover:bg-action hover:text-selected rounded-full transition-all duration-200'>
        <AddIcon size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />
      </Button>
    );
  }

  if (variant === 'card') {
    return (
      <div
        onClickCapture={disabled ? undefined : onClick}
        role='button'
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            onClick();
          }
        }}
        className={`
          flex flex-col items-center justify-center
          min-h-[80px] p-3
          border-2 border-dashed border-c4 rounded-lg
          cursor-pointer
          transition-all duration-200
          hover:border-action hover:bg-c2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
        <AddIcon size={20} className='text-c5' />
        {label && <span className='text-xs text-c5 mt-px'>{label}</span>}
      </div>
    );
  }

  return (
    <Button
      size={size}
      onPress={onClick}
      isDisabled={disabled}
      className={`
        ${sizeClasses[size]}
        bg-c3 text-c6
        hover:bg-action hover:text-selected
        rounded-full
        transition-all duration-200
        flex items-center gap-px
      `}
      startContent={<AddIcon size={size === 'sm' ? 12 : 14} />}>
      {label || 'Ajouter'}
    </Button>
  );
};

export default AddResourceCard;
