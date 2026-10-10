import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  LibraryBig,
  Grid3X3,
  Calendar,
  LayoutDashboard,
  Network,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { ArrowIcon, SearchIcon } from '@/components/ui/icons';
import {
  datavisViewPath,
  parseDatavisView,
  type DatavisView,
} from '@/config/datavisViews';
import {
  MEGA_MENU_CARD_CLASS,
  MEGA_MENU_COL_FIRST_CLASS,
  MEGA_MENU_COL_LAST_CLASS,
  MEGA_MENU_COL_MIDDLE_CLASS,
  MEGA_MENU_GRID_CLASS,
  MEGA_MENU_HOVER_BRIDGE_CLASS,
  MEGA_MENU_INNER_CLASS,
  MEGA_MENU_SECTION_LABEL_CLASS,
  megaMenuPanelShellClass,
} from '@/components/layout/megaMenuLayout';

export function useDatavisMegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimeout();
    setIsClosing(false);
    setIsOpen(true);
  }, [clearCloseTimeout]);

  const closeMenu = useCallback(() => {
    clearCloseTimeout();
    timeoutRef.current = window.setTimeout(() => {
      setIsClosing(true);
      window.setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 180);
    }, 120);
  }, [clearCloseTimeout]);

  const closeImmediately = useCallback(() => {
    clearCloseTimeout();
    setIsClosing(false);
    setIsOpen(false);
  }, [clearCloseTimeout]);

  useEffect(() => () => clearCloseTimeout(), [clearCloseTimeout]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImmediately();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeImmediately]);

  return { isOpen, isClosing, openMenu, closeMenu, closeImmediately };
}

function useActiveDatavisView(): DatavisView {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  if (!location.pathname.startsWith('/visualisation')) return 'datavis';
  return parseDatavisView(searchParams.get('view'));
}

const MENU_ICON_SIZE = 16;

/** Cadre fixe pour aligner Lucide et icônes SVG du projet */
function MenuIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <span className='flex size-[18px] shrink-0 items-center justify-center text-c5' aria-hidden>
      <Icon size={MENU_ICON_SIZE} strokeWidth={2} className='shrink-0' />
    </span>
  );
}

interface DatavisMenuLinkProps {
  view: DatavisView;
  label: string;
  icon: LucideIcon | typeof SearchIcon;
  onNavigate?: () => void;
}

const DatavisMenuLink: React.FC<DatavisMenuLinkProps> = ({ view, label, icon, onNavigate }) => {
  const [searchParams] = useSearchParams();
  const activeView = useActiveDatavisView();
  const to = datavisViewPath(view, searchParams);
  const isActive = activeView === view;

  return (
    <Link
      to={to}
      className={`inline-flex w-full max-w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-normal text-c6 transition-colors duration-150 outline-none hover:bg-c3 ${
        isActive ? 'bg-c3 font-medium' : ''
      }`}
      onClick={onNavigate}>
      <MenuIcon icon={icon} />
      <span className='leading-snug'>{label}</span>
    </Link>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={MEGA_MENU_SECTION_LABEL_CLASS}>{children}</div>
);

function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

export const DatavisMegaMenuTrigger: React.FC<{
  isOpen: boolean;
  isDatavisActive: boolean;
  linkBaseClass: string;
  activeClass: string;
  hoverClass: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ isOpen, isDatavisActive, linkBaseClass, activeClass, hoverClass, onMouseEnter, onMouseLeave }) => (
  <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
    <button
      type='button'
      className={`${linkBaseClass} ${isDatavisActive || isOpen ? activeClass : hoverClass}`}
      aria-expanded={isOpen}
      aria-haspopup='true'>
      Datavisualisation
      <ArrowIcon className={`text-c6 transition-transform duration-200 ${isOpen ? '-rotate-90' : 'rotate-90'}`} size={14} />
    </button>
  </div>
);

export const DatavisMegaMenuPanel: React.FC<{
  isOpen: boolean;
  isClosing: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}> = ({ isOpen, isClosing, onMouseEnter, onMouseLeave, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className={megaMenuPanelShellClass(isClosing, 'datavis-mega-menu-exit', 'datavis-mega-menu-enter')}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      <div className={MEGA_MENU_HOVER_BRIDGE_CLASS} aria-hidden='true' />
      <div className={MEGA_MENU_CARD_CLASS}>
        <style>{`
        @keyframes datavisMegaMenuEnter {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes datavisMegaMenuExit {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-4px); }
        }
        .datavis-mega-menu-enter { animation: datavisMegaMenuEnter 160ms ease-out forwards; }
        .datavis-mega-menu-exit { animation: datavisMegaMenuExit 140ms ease-in forwards; }
      `}</style>

        <div className={MEGA_MENU_INNER_CLASS}>
          <div className={MEGA_MENU_GRID_CLASS}>
            <div className={MEGA_MENU_COL_FIRST_CLASS}>
              <MenuSection label='Exploration'>
                <DatavisMenuLink view='datavis' label='Recherche' icon={SearchIcon} onNavigate={onClose} />
                <DatavisMenuLink view='cahiers' label='Cahier de recherche' icon={LibraryBig} onNavigate={onClose} />
              </MenuSection>
            </div>

            <div className={MEGA_MENU_COL_MIDDLE_CLASS}>
              <MenuSection label='Récits & imaginaires'>
                <DatavisMenuLink view='network' label='Réseau de proximité' icon={Network} onNavigate={onClose} />
                <DatavisMenuLink view='flows' label='Flux temporels' icon={Waves} onNavigate={onClose} />
              </MenuSection>
            </div>

            <div className={MEGA_MENU_COL_LAST_CLASS}>
              <MenuSection label='Analytics'>
                <DatavisMenuLink view='dashboard' label='Tableau de bord' icon={LayoutDashboard} onNavigate={onClose} />
                <DatavisMenuLink view='coverageMatrix' label='Matrice de couverture' icon={Grid3X3} onNavigate={onClose} />
                <DatavisMenuLink view='activityHeatmap' label='Calendrier activité' icon={Calendar} onNavigate={onClose} />
              </MenuSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
