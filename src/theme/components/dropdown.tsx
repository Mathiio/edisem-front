import {
  Dropdown as ODropdown,
  DropdownTrigger as ODropdownTrigger,
  DropdownMenu as ODropdownMenu,
  DropdownSection as ODropdownSection,
  DropdownItem as ODropdownItem,
  extendVariants,
} from "@heroui/react";

export const dropdownContentClassNames = {
  content: 'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] bg-c2 rounded-xl border-2 border-c3',
};

export const dropdownTriggerButtonClass =
  'hover:bg-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 flex flex-row rounded-lg border-2 border-c3 items-center justify-center px-4 py-2.5 text-base gap-2.5 text-c6 transition-all ease-in-out duration-200';

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
