import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowIcon,
  SeminaireIcon,
  StudyDayIcon,
  PratiqueNarrativeIcon,
  ColloqueIcon,
  ExperimentationIcon,
} from '@/components/ui/icons';
import { RESOURCE_TYPES } from '@/config/resourceConfig';

const MAX_MENU_EDITIONS = 4;

interface EditionLink {
  to: string;
  label: string;
}

export interface CorpusMegaMenuProps {
  isCorpusActive: boolean;
  seminarEditions: EditionLink[];
  colloqueEditions: EditionLink[];
  studyDayEditions: EditionLink[];
  linkBaseClass: string;
  activeClass: string;
  hoverClass: string;
}

interface NavLinkItem {
  to: string;
  label: string;
  icon?: React.ElementType;
}

interface MegaMenuLinkProps {
  to: string;
  label: string;
  icon?: React.ElementType;
  variant?: 'featured' | 'default' | 'subtle' | 'edition';
  onNavigate?: () => void;
}

const MegaMenuLink: React.FC<MegaMenuLinkProps> = ({ to, label, icon: Icon, variant = 'default', onNavigate }) => {
  const base = 'inline-flex items-center gap-2 rounded-lg transition-colors duration-150 outline-none max-w-full text-left px-2';
  const variantClass =
    variant === 'featured'
      ? 'text-base font-medium text-c6 py-1.5 hover:bg-c3'
      : variant === 'subtle'
        ? 'text-sm font-normal text-c4 py-1.5 hover:bg-c3 hover:text-c6'
        : variant === 'edition'
          ? 'text-sm font-normal text-c5 py-1.5 hover:bg-c3'
          : 'text-sm font-normal text-c6 py-1.5 hover:bg-c3';

  return (
    <Link to={to} className={`${base} ${variantClass}`} onClick={onNavigate}>
      {Icon && <Icon size={variant === 'featured' ? 16 : 13} className='text-c5 shrink-0' />}
      <span className='leading-snug'>{label}</span>
    </Link>
  );
};

const EventGroup: React.FC<{
  collectionUrl: string;
  collectionLabel: string;
  icon: React.ElementType;
  editions: EditionLink[];
  onNavigate: () => void;
}> = ({ collectionUrl, collectionLabel, icon, editions, onNavigate }) => {
  const visibleEditions = editions.slice(0, MAX_MENU_EDITIONS);

  return (
    <div className='flex flex-col'>
      <MegaMenuLink
        to={collectionUrl}
        label={collectionLabel}
        icon={icon}
        variant='featured'
        onNavigate={onNavigate}
      />
      {visibleEditions.length > 0 && (
        <div className='flex flex-col gap-0.5 mt-1.5'>
          {visibleEditions.map((edition) => (
            <MegaMenuLink key={edition.to} to={edition.to} label={edition.label} variant='edition' onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

export function useCorpusMegaMenu() {
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

export const CorpusMegaMenuTrigger: React.FC<{
  isOpen: boolean;
  isCorpusActive: boolean;
  linkBaseClass: string;
  activeClass: string;
  hoverClass: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ isOpen, isCorpusActive, linkBaseClass, activeClass, hoverClass, onMouseEnter, onMouseLeave }) => (
  <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
    <button
      type='button'
      className={`${linkBaseClass} ${isCorpusActive || isOpen ? activeClass : hoverClass}`}
      aria-expanded={isOpen}
      aria-haspopup='true'>
      Corpus
      <ArrowIcon className={`text-c6 transition-transform duration-200 ${isOpen ? '-rotate-90' : 'rotate-90'}`} size={14} />
    </button>
  </div>
);

export const CorpusMegaMenuPanel: React.FC<{
  isOpen: boolean;
  isClosing: boolean;
  seminarEditions: EditionLink[];
  colloqueEditions: EditionLink[];
  studyDayEditions: EditionLink[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}> = ({
  isOpen,
  isClosing,
  seminarEditions,
  colloqueEditions,
  studyDayEditions,
  onMouseEnter,
  onMouseLeave,
  onClose,
}) => {
  if (!isOpen) return null;

  const recitLinks: NavLinkItem[] = [
    { to: RESOURCE_TYPES.recit_artistique.collectionUrl || '#', label: RESOURCE_TYPES.recit_artistique.collectionLabel || 'Récits artistiques' },
    { to: RESOURCE_TYPES.recit_scientifique.collectionUrl || '#', label: RESOURCE_TYPES.recit_scientifique.collectionLabel || 'Récits scientifiques' },
    { to: RESOURCE_TYPES.recit_techno_industriel.collectionUrl || '#', label: RESOURCE_TYPES.recit_techno_industriel.collectionLabel || 'Récits techno-industriels' },
    { to: RESOURCE_TYPES.recit_citoyen.collectionUrl || '#', label: RESOURCE_TYPES.recit_citoyen.collectionLabel || 'Récits citoyens' },
    { to: RESOURCE_TYPES.recit_mediatique.collectionUrl || '#', label: RESOURCE_TYPES.recit_mediatique.collectionLabel || 'Récits médiatiques' },
  ];

  return (
    <div
      className={`absolute left-0 right-0 top-full z-40 ${
        isClosing ? 'corpus-mega-menu-exit' : 'corpus-mega-menu-enter'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      <div className='h-2 -mt-2' aria-hidden='true' />
      <div className='rounded-xl border-2 border-c3 bg-c2 shadow-lg overflow-hidden'>
        <style>{`
        @keyframes corpusMegaMenuEnter {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes corpusMegaMenuExit {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-4px); }
        }
        .corpus-mega-menu-enter { animation: corpusMegaMenuEnter 160ms ease-out forwards; }
        .corpus-mega-menu-exit { animation: corpusMegaMenuExit 140ms ease-in forwards; }
      `}</style>

        <div className='px-4 py-3'>
          <div className='grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-c3'>
            <div className='flex flex-col md:pr-6'>
            <MegaMenuLink
              to='/corpus/pratiques-narratives'
              label='IA & Pratiques narratives'
              icon={PratiqueNarrativeIcon}
              variant='featured'
              onNavigate={onClose}
            />
            <MegaMenuLink
              to='/corpus/mises-en-recits'
              label="Mises en récits de l'IA"
              icon={PratiqueNarrativeIcon}
              variant='default'
              onNavigate={onClose}
            />
            <div className='flex flex-col gap-0.5'>
              {recitLinks.map((link) => (
                <MegaMenuLink key={link.to} to={link.to} label={link.label} variant='subtle' onNavigate={onClose} />
              ))}
            </div>
            <MegaMenuLink
              to={RESOURCE_TYPES.experimentation.collectionUrl || '#'}
              label={RESOURCE_TYPES.experimentation.collectionLabel || 'Expérimentations'}
              icon={ExperimentationIcon}
              variant='default'
              onNavigate={onClose}
            />
          </div>

          <div className='flex flex-col md:px-6 mt-4 md:mt-0'>
            <EventGroup
              collectionUrl={RESOURCE_TYPES.seminaire.collectionUrl || '#'}
              collectionLabel={RESOURCE_TYPES.seminaire.collectionLabel || 'Séminaires'}
              icon={SeminaireIcon}
              editions={seminarEditions}
              onNavigate={onClose}
            />
          </div>

          <div className='flex flex-col md:pl-6 mt-4 md:mt-0'>
            <div className='flex flex-col gap-2'>
              <EventGroup
                collectionUrl={RESOURCE_TYPES.colloque.collectionUrl || '#'}
                collectionLabel={RESOURCE_TYPES.colloque.collectionLabel || 'Colloques'}
                icon={ColloqueIcon}
                editions={colloqueEditions}
                onNavigate={onClose}
              />
              <EventGroup
                collectionUrl={RESOURCE_TYPES.journee_etudes.collectionUrl || '#'}
                collectionLabel={RESOURCE_TYPES.journee_etudes.collectionLabel || "Journées d'études"}
                icon={StudyDayIcon}
                editions={studyDayEditions}
                onNavigate={onClose}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
