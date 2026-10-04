import { Tabs as OTabs, Tab as OTab, extendVariants } from '@heroui/react';

export const Tabs = extendVariants(OTabs, {});

export const Tab = OTab;

/** Onglets pleine largeur (modales média, playlist, édition conférence…) */
export const modalTabClassNames = {
  base: 'w-full',
  tabList: 'w-full bg-c2 border-2 border-c3 rounded-xl p-px gap-px',
  cursor: 'w-full bg-action rounded-lg',
  tab: 'flex-1 px-4 py-2 text-c5 data-[selected=true]:text-white justify-center',
  tabContent: 'group-data-[selected=true]:text-white',
};
