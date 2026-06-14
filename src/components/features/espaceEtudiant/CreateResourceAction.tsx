import React from 'react';
import type { Key } from 'react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { AddIcon } from '@/components/ui/icons';
import { getRessourceLabel } from '@/config/resourceConfig';
import {
  dropdownContentClassNames,
  dropdownTriggerButtonClass,
  dropdownTriggerButtonCompactClass,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
} from '@/theme/components/dropdown';

export type CreateResourceConfigEntry = {
  config: { templateId?: number; resourceType: string };
  route: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Remplace le label dérivé du type de ressource dans le dropdown */
  label?: string;
};

interface CreateResourceActionProps {
  configs: CreateResourceConfigEntry[];
  onCreate: (route: string) => void;
  /** Texte du bouton trigger */
  triggerLabel?: string;
  /** Libellé aria du menu (accessibilité) */
  menuLabel?: string;
  compact?: boolean;
  className?: string;
}

const CreateTriggerContent: React.FC<{ compact?: boolean; label?: string }> = ({ compact, label = 'Créer' }) => (
  <>
    <AddIcon size={compact ? 12 : 14} className='text-c6 shrink-0' />
    <span>{label}</span>
  </>
);

/**
 * Un seul type créable → bouton direct. Plusieurs → dropdown (style navbar).
 * Le trigger affiche toujours « + Créer ».
 */
export const CreateResourceAction: React.FC<CreateResourceActionProps> = ({
  configs,
  onCreate,
  triggerLabel = 'Créer',
  menuLabel = 'Créer',
  compact = false,
  className,
}) => {
  if (configs.length === 0) return null;

  const triggerClass = className ?? (compact ? dropdownTriggerButtonCompactClass : dropdownTriggerButtonClass);

  const renderTrigger = (props?: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={triggerClass} {...props}>
      <CreateTriggerContent compact={compact} label={triggerLabel} />
    </div>
  );

  if (configs.length === 1) {
    const { route } = configs[0];

    return renderTrigger({
      role: 'button',
      tabIndex: 0,
      onClick: () => onCreate(route),
      onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCreate(route);
        }
      },
    });
  }

  return (
    <Dropdown classNames={dropdownContentClassNames}>
      <DropdownTrigger>{renderTrigger()}</DropdownTrigger>
      <DropdownMenu
        aria-label={menuLabel}
        className={`p-2 ${compact ? 'min-w-[200px]' : 'min-w-[220px]'}`}
        classNames={dropdownMenuClassNames}
        onAction={(key: Key) => {
          const entry = configs.find((c) => String(c.config.templateId) === String(key));
          if (entry) onCreate(entry.route);
        }}>
        {configs.map(({ config, icon: Icon, label }) => (
          <DropdownItem key={String(config.templateId)} className={dropdownMenuItemClass}>
            <div className={`flex items-center gap-2 w-full ${dropdownItemInnerPadding} rounded-lg text-c6`}>
              <Icon size={16} className='text-c5 shrink-0' />
              <span>{label ?? getRessourceLabel(config.resourceType)}</span>
            </div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
