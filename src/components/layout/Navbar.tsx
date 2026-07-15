import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Image } from '@/theme/components';
import Logo from '@/assets/svg/logo.svg';
import { ProfilDropdown } from '@/components/layout/ProfilDropdown';
import { SearchModal, SearchModalRef } from '@/components/features/shared/search/SearchModal';
import {
  CorpusMegaMenuPanel,
  CorpusMegaMenuTrigger,
  useCorpusMegaMenu,
} from '@/components/layout/CorpusMegaMenu';

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
  const { isOpen, isClosing, openMenu, closeMenu, closeImmediately } = useCorpusMegaMenu();

  const isActive = useMemo(() => (path: string) => location.pathname === path, [location.pathname]);
  const isCorpusPathValue = useMemo(() => location.pathname.startsWith('/corpus'), [location.pathname]);

  useEffect(() => {
    closeImmediately();
  }, [location.pathname, closeImmediately]);

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

        setSeminarEditions(seminars);
        setColloqueEditions(colloques);
        setStudyDayEditions(studyDays);

        if (onReady && !hasNotifiedReady.current) {
          hasNotifiedReady.current = true;
          onReady();
        }
      } catch (err) {
        console.error(err);
        if (onReady && !hasNotifiedReady.current) {
          hasNotifiedReady.current = true;
          onReady();
        }
      }
    };
    loadData();
  }, [onReady]);

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

  const linkBaseClass =
    'cursor-pointer flex flex-row items-center justify-center px-4 py-2.5 text-base gap-2.5 text-c6 rounded-xl border-2 transition-all ease-in-out duration-200';
  const activeClass = 'bg-c2 border-c3';
  const hoverClass = 'hover:bg-c2 hover:border-c3 border-transparent';

  return (
    <>
      <nav
        className={`sticky top-0 left-0 right-0 z-30 transition-all duration-300 relative ${
          hasScrolled ? 'bg-c1/90 backdrop-blur-sm shadow-lg' : 'bg-transparent'
        } ${isOpen ? 'bg-c1 shadow-lg' : ''}`}>
        <div className='max-w-screen-2xl mx-auto px-5 pt-4'>
          <div className='relative'>
            <div className='flex items-center justify-between pb-4'>
              <Link to='/' className='flex items-center gap-2'>
                <Image src={Logo} alt='Arcanes' className='h-8' />
                <div className='text-2xl text-c6 font-medium'>Arcanes</div>
              </Link>

              <div className='flex items-center gap-2.5'>
                <CorpusMegaMenuTrigger
                  isOpen={isOpen}
                  isCorpusActive={isCorpusPathValue}
                  linkBaseClass={linkBaseClass}
                  activeClass={activeClass}
                  hoverClass={hoverClass}
                  onMouseEnter={openMenu}
                  onMouseLeave={closeMenu}
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

            <CorpusMegaMenuPanel
              isOpen={isOpen}
              isClosing={isClosing}
              seminarEditions={seminarEditions}
              colloqueEditions={colloqueEditions}
              studyDayEditions={studyDayEditions}
              onMouseEnter={openMenu}
              onMouseLeave={closeMenu}
              onClose={closeImmediately}
            />
          </div>
        </div>
      </nav>
    </>
  );
};
