import { Z_NAV_BACKDROP_CLASS, Z_NAV_MEGA_MENU_CLASS } from '@/components/layout/zLayers';

/** Shell commun des mega-menus navbar (Corpus, Datavisualisation). */

export const MEGA_MENU_HOVER_BRIDGE_CLASS = 'h-2 -mt-2';

export const MEGA_MENU_CARD_CLASS =
  'rounded-xl border-2 border-c3 bg-c2 shadow-xl shadow-black/40 overflow-hidden';

export const MEGA_MENU_INNER_CLASS = 'px-4 py-3';

export const MEGA_MENU_GRID_CLASS = 'grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-c3';

export const MEGA_MENU_COL_FIRST_CLASS = 'flex flex-col md:pr-6';

export const MEGA_MENU_COL_MIDDLE_CLASS = 'flex flex-col md:px-6 mt-4 md:mt-0';

export const MEGA_MENU_COL_LAST_CLASS = 'flex flex-col md:pl-6 mt-4 md:mt-0';

/** Même bandeau vertical que MegaMenuLink / DatavisMenuLink (px-2 py-1.5). */
export const MEGA_MENU_SECTION_LABEL_CLASS =
  'flex w-full items-center px-2 py-1.5 mb-1 text-xs font-medium uppercase tracking-wider text-c4 leading-snug';

export function megaMenuPanelShellClass(isClosing: boolean, exitClass: string, enterClass: string) {
  return `absolute left-0 right-0 top-full ${Z_NAV_MEGA_MENU_CLASS} ${isClosing ? exitClass : enterClass}`;
}

/** Assombrit la page sous la navbar quand un mega-menu est ouvert. */
export const MEGA_MENU_BACKDROP_CLASS =
  `fixed inset-0 ${Z_NAV_BACKDROP_CLASS} cursor-default bg-black/50 backdrop-blur-[3px] transition-opacity duration-200 ease-out motion-reduce:transition-none`;
