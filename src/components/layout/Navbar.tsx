import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Image } from '@/theme/components';
import Logo from '@/assets/svg/logo.svg';
import { ProfilDropdown } from '@/components/layout/ProfilDropdown';
import { SearchModal, SearchModalRef } from '@/components/features/shared/search/SearchModal';
import { ArrowIcon, SeminaireIcon, StudyDayIcon, PratiqueNarrativeIcon, ColloqueIcon, ExperimentationIcon } from '@/components/ui/icons';
import { RESOURCE_TYPES } from '@/config/resourceConfig';

interface DropdownItem {
  to: string;
  label: string;
  icon?: React.ElementType;
  variant?: 'main' | 'secondary' | 'simple';
}

interface DropdownSection {
  items: DropdownItem[];
}

interface CustomDropdownProps {
  trigger: React.ReactNode;
  sections: DropdownSection[];
  listMode?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({ trigger, sections, listMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
    setIsAnimating(false);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      }, 200);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={dropdownRef} className='relative' onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {trigger}

      { isOpen && (
        <div
          className={`absolute top-full columns-3 gap-10 p-4 shadow-2xl left-1/2 mt-2 bg-c2 rounded-2xl border-2 border-c3 z-40 ${listMode ? 'min-w-fit' : 'min-w-max'}    `}
          style={{
            animation: isAnimating ? 'dropdownDisappear 200ms ease-in forwards' : 'dropdownAppear 200ms ease-out forwards',
          }}>
          <style>{`
            @keyframes dropdownAppear {
              from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes dropdownDisappear {
              from { opacity: 1; transform: translateX(-50%) translateY(0); }
              to { opacity: 0; transform: translateX(-50%) translateY(-8px); }
            }
          `}</style>

          {sections.map((section, sIdx) => (
            <div key={sIdx} className={`break-inside-avoid mb-6 flex flex-col gap-1.5 ${listMode ? 'max-w-[60px]' : ' max-w-[240px] '}  `}>
              <div className='flex flex-col'>
                {section.items.map(({ to, label, icon: Icon, variant = 'simple' }) => {
                  let linkClasses = 'flex items-center gap-2.5 rounded-lg transition-all duration-200 outline-none ';
                  if (variant === 'main') {
                    linkClasses += 'text-base font-medium text-c6 mb-1.5 px-3 py-2 hover:bg-c3 ';
                  } else if (variant === 'secondary') {
                    linkClasses += 'text-base font-normal text-c6 px-3 py-2 hover:bg-c3 ';
                  } else {
                    linkClasses += 'text-sm font-normal text-c4 px-3 py-2 hover:bg-c3 ';
                  }

                  return (
                    <Link key={to} to={to} className={linkClasses} onClick={() => setIsOpen(false)}>
                      {Icon && <Icon size={variant === 'main' ? 18 : 12} className={variant === 'simple' ? 'text-c4' : 'text-c5'} />}
                      <span className='flex-1'>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface NavbarProps {
  onReady?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReady }) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [seminarEditions, setSeminarEditions] = useState<{ to: string; label: string }[]>([]);
  const [colloqueEditions, setColloqueEditions] = useState<{ to: string; label: string }[]>([]);
  const [studyDayEditions, setStudyDayEditions] = useState<{ to: string; label: string }[]>([]);
  const searchModalRef = useRef<SearchModalRef>(null);
  const location = useLocation();
  const hasNotifiedReady = useRef(false);

  const isActive = useMemo(() => (path: string) => location.pathname === path, [location.pathname]);
  const isCorpusPathValue = useMemo(() => location.pathname.startsWith('/corpus'), [location.pathname]);

  // Fixed link generation without top-level await in map
  useEffect(() => {
    const loadData = async () => {
      const { getNavbarEditions } = await import('@/services/Items');

      try {
        const sortedEditions = await getNavbarEditions();

        const seminars: { to: string; label: string }[] = [];
        const colloques: { to: string; label: string }[] = [];
        const studyDays: { to: string; label: string }[] = [];

        sortedEditions.forEach((e: any) => {
          const type = e.editionType?.toLowerCase() || '';
          const typeId = Number(e.editionTypeId);
          
          const item = {
            to: '',
            label: `Édition ${e.season} ${e.year}`,
          };

          if (typeId === 19394 || type.includes('colloque')) {
            item.to = `/corpus/colloques/edition/${e.id}`;
            colloques.push(item);
          } else if (typeId === 19393 || type.includes('journée')) {
            item.to = `/corpus/journees-etudes/edition/${e.id}`;
            studyDays.push(item);
          } else if (typeId === 19395 || type.includes('séminaire')) {
            item.to = `/corpus/seminaires/edition/${e.id}`;
            seminars.push(item);
          }
        });

        setSeminarEditions(seminars.slice(0, 6));
        setColloqueEditions(colloques.slice(0, 6));
        setStudyDayEditions(studyDays.slice(0, 6));
        
        // Notify parent that navbar is ready
        if (onReady && !hasNotifiedReady.current) {
          hasNotifiedReady.current = true;
          onReady();
        }
      } catch (err) {
        console.error(err);
        // Notify ready even on error to not block the UI
        if (onReady && !hasNotifiedReady.current) {
          hasNotifiedReady.current = true;
          onReady();
        }
      }
    };
    loadData();
  }, [onReady]);

  const corpusSections: DropdownSection[] = useMemo(
    () => [
      {
        items: [
          { to: '/corpus/pratiques-narratives', label: 'IA & Pratiques narratives', icon: PratiqueNarrativeIcon, variant: 'main' as const },
          { to: '/corpus/mises-en-recits', label: "Mises en récits de l'IA", icon: PratiqueNarrativeIcon, variant: 'secondary' as const },
          { to: RESOURCE_TYPES.recit_artistique.collectionUrl || '#', label: RESOURCE_TYPES.recit_artistique.collectionLabel || '', variant: 'simple' as const },
          { to: RESOURCE_TYPES.recit_scientifique.collectionUrl || '#', label: RESOURCE_TYPES.recit_scientifique.collectionLabel || '', variant: 'simple' as const },
          { to: RESOURCE_TYPES.recit_techno_industriel.collectionUrl || '#', label: RESOURCE_TYPES.recit_techno_industriel.collectionLabel || '', variant: 'simple' as const },
          { to: RESOURCE_TYPES.recit_citoyen.collectionUrl || '#', label: RESOURCE_TYPES.recit_citoyen.collectionLabel || '', variant: 'simple' as const },
          { to: RESOURCE_TYPES.recit_mediatique.collectionUrl || '#', label: RESOURCE_TYPES.recit_mediatique.collectionLabel || '', variant: 'simple' as const },
          { to: RESOURCE_TYPES.experimentation.collectionUrl || '#', label: RESOURCE_TYPES.experimentation.collectionLabel || '', icon: ExperimentationIcon, variant: 'secondary' as const },
        ],
      },
      {
        items: [
          { to: RESOURCE_TYPES.seminaire.collectionUrl || '#', label: RESOURCE_TYPES.seminaire.collectionLabel || '', icon: SeminaireIcon, variant: 'main' as const },
          ...seminarEditions.map((e) => ({ ...e, variant: 'simple' as const })),
        ],
      },
      {
        items: [
          { to: RESOURCE_TYPES.journee_etudes.collectionUrl || '#', label: RESOURCE_TYPES.journee_etudes.collectionLabel || '', icon: StudyDayIcon, variant: 'main' as const },
          ...studyDayEditions.map((e) => ({ ...e, variant: 'simple' as const })),
        ],
      },
      {
        items: [
          { to: RESOURCE_TYPES.colloque.collectionUrl || '#', label: RESOURCE_TYPES.colloque.collectionLabel || '', icon: ColloqueIcon, variant: 'main' as const },
          ...colloqueEditions.map((e) => ({ ...e, variant: 'simple' as const })),
        ],
      },
    ],
    [seminarEditions, colloqueEditions, studyDayEditions],
  );

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchModalRef.current?.openWithSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const linkBaseClass = 'cursor-pointer flex flex-row items-center justify-center px-4 py-2.5 text-base gap-2.5 text-c6 rounded-xl border-2 transition-all ease-in-out duration-200';
  const activeClass = 'bg-c2 border-c3';
  const hoverClass = 'hover:bg-c2 hover:border-c3 border-transparent';

  return (
    <>
      <nav className={`sticky top-0 left-0 right-0 z-30 transition-all duration-300 ${hasScrolled ? 'bg-c1/90 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
        <div className='max-w-screen-2xl mx-auto px-5 py-4'>
          <div className='flex items-center justify-between'>
            <Link to='/' className='flex items-center gap-2'>
              <Image src={Logo} alt='Arcanes' className='h-8' />
              <div className='text-2xl text-c6 font-medium'>Arcanes</div>
            </Link>

            <div className='flex items-center gap-2.5'>
              <CustomDropdown
                trigger={
                  <div className={`${linkBaseClass} ${isCorpusPathValue ? activeClass : `${hoverClass}`}`}>
                    Corpus
                    <ArrowIcon className='text-c6 rotate-90' size={14} />
                  </div>
                }
                sections={corpusSections}
              />

              <Link to='/intervenants' className={`${linkBaseClass} ${isActive('/intervenants') ? activeClass : hoverClass}`}>
                Intervenants
              </Link>

              <Link to='/visualisation' className={`${linkBaseClass} ${isActive('/visualisation') ? activeClass : hoverClass}`}>
                Datavisualisation
              </Link>
              <Link to='/espace-etudiant' className={`${linkBaseClass} ${isActive('/espace-etudiant') ? activeClass : hoverClass}`}>
                Espace étudiant
              </Link>
            </div>
            <div className='flex items-center gap-2.5'>
              <SearchModal ref={searchModalRef} />

              <ProfilDropdown />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
