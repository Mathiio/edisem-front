import {
  Dropdown as ODropdown,
  DropdownTrigger as ODropdownTrigger,
  DropdownMenu as ODropdownMenu,
  DropdownSection as ODropdownSection,
  DropdownItem as ODropdownItem,
  extendVariants,
} from '@heroui/react';
import { outlineButtonClass, outlineButtonCompactClass } from './button';

export const dropdownContentClassNames = {
  content: 'bg-c2 rounded-xl border-2 border-c3',
};

export const dropdownTriggerButtonClass = outlineButtonClass;

export const dropdownTriggerButtonCompactClass = outlineButtonCompactClass;

export const dropdownMenuClassNames = {
  base: 'bg-transparent shadow-none border-0',
  list: 'bg-transparent',
};

export const dropdownMenuItemClass =
  'p-0 cursor-pointer text-c5 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3 rounded-lg';

export const dropdownItemInnerPadding = 'py-2 px-3';

export const Dropdown = extendVariants(ODropdown, {
  defaultVariants: {},
});

export const DropdownTrigger = extendVariants(ODropdownTrigger, {
  defaultVariants: {},
});

export const DropdownMenu = extendVariants(ODropdownMenu, {
  defaultVariants: {},
});

export const DropdownSection = ODropdownSection;

export const DropdownItem = ODropdownItem;
