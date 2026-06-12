import React from 'react';
import type { Key } from 'react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { AddIcon } from '@/components/ui/icons';
import { getRessourceLabel } from '@/config/resourceConfig';

export const DROPDOWN_CONTENT_CLASSNAMES = {
  content: 'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] bg-c2 rounded-xl border-2 border-c3',
};

const DROPDOWN_TRIGGER_BASE =
  'hover:bg-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 flex flex-row rounded-lg border-2 border-c3 items-center justify-center text-c6 transition-all ease-in-out duration-200';

export const DROPDOWN_TRIGGER_CLASS = `${DROPDOWN_TRIGGER_BASE} px-4 py-2.5 text-base gap-2.5`;

const COMPACT_TRIGGER_CLASS = `${DROPDOWN_TRIGGER_BASE} text-sm px-3 py-2 gap-2`;

const DROPDOWN_MENU_CLASSNAMES = {
  base: 'bg-transparent shadow-none border-0',
  list: 'bg-transparent',
};

const DROPDOWN_ITEM_CLASS =
  'cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3';

export type CreateResourceConfigEntry = {
  config: { templateId?: number; resourceType: string };
  route: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
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
    <AddIcon size={compact ? 14 : 16} className='text-c6 shrink-0' />
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

  const triggerClass = className ?? (compact ? COMPACT_TRIGGER_CLASS : DROPDOWN_TRIGGER_CLASS);

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
    <Dropdown classNames={DROPDOWN_CONTENT_CLASSNAMES}>
      <DropdownTrigger>{renderTrigger()}</DropdownTrigger>
      <DropdownMenu
        aria-label={menuLabel}
        className={`p-2 ${compact ? 'min-w-[200px]' : 'min-w-[220px]'}`}
        classNames={DROPDOWN_MENU_CLASSNAMES}
        onAction={(key: Key) => {
          const entry = configs.find((c) => String(c.config.templateId) === String(key));
          if (entry) onCreate(entry.route);
        }}>
        {configs.map(({ config, icon: Icon }) => (
          <DropdownItem
            key={String(config.templateId)}
            className={DROPDOWN_ITEM_CLASS}
            startContent={<Icon size={16} className='text-c5' />}>
            {getRessourceLabel(config.resourceType)}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
