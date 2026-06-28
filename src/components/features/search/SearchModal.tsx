import { useEffect, forwardRef, useImperativeHandle, useState, useRef, useCallback } from 'react';
import { Input, Spinner, useDisclosure } from '@heroui/react';
import { SearchIcon } from '@/components/ui/icons';
import { useDebounce } from '@/hooks/useDebounce';
import { advancedSearch } from '@/services/Items';
import { WideResourceCard } from '@/components/features/search/WideResourceCard';
import { RESOURCE_TYPES, ResourceType } from '@/config/resourceConfig';
import { Modal, ModalBody, ModalContent, ModalHeader, modalBottomFadeClass, modalCloseButtonClasses } from '@/theme/components';

export interface SearchModalRef {
  openWithSearch: (searchTerm: string) => void;
  notrigger: boolean;
}

interface SearchModalProps {
  notrigger?: boolean;
}

export const SearchModal = forwardRef<SearchModalRef, SearchModalProps>(
  ({ notrigger = false }, ref) => {
    const { isOpen, onOpen, onClose } = useDisclosure();

    const [query, setQuery] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const debouncedQuery = useDebounce(query, 500);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      openWithSearch: (searchTerm: string) => {
        setQuery(searchTerm);
        onOpen();
      },
      notrigger,
    }));

    useEffect(() => {
      if (isOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        setTimeout(() => {
          setQuery('');
          setResults([]);
          setHasSearched(false);
          setSelectedTypes([]);
        }, 300);
      }
    }, [isOpen]);

    const performSearch = useCallback(async () => {
      if (!debouncedQuery.trim() && selectedTypes.length === 0) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await advancedSearch(debouncedQuery, selectedTypes);
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, [debouncedQuery, selectedTypes]);

    useEffect(() => {
      performSearch();
    }, [performSearch]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !isOpen) {
          e.preventDefault();
          onOpen();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onOpen, onClose]);

    return (
      <>
        {!notrigger && (
          <button
            className='focus:outline-none focus-visible:outline-none hover:bg-c3 cursor-pointer bg-c2 text-base p-4 border-c3 border-2 rounded-xl text-c6 transition-colors ease-in-out duration-200'
            onClick={onOpen}
            title='Rechercher'>
            <SearchIcon size={13} className='text-c6' />
          </button>
        )}

        <Modal
          backdrop='blur'
          size='2xl'
          isOpen={isOpen}
          onClose={onClose}
          scrollBehavior='inside'
          classNames={{ closeButton: modalCloseButtonClasses }}
          motionProps={{
            variants: {
              enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
              exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
            },
          }}>
          <ModalContent className='h-[85vh] max-h-[780px]'>
            <ModalHeader className='flex flex-col gap-px py-4'>
              <h2 className='text-c6 text-lg font-semibold'>Rechercher un contenu</h2>
              <p className='text-c4 text-sm font-normal'>Titres, intervenants, mots-clés…</p>
            </ModalHeader>

            <ModalBody className='flex flex-col gap-4 py-4 overflow-hidden'>
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Rechercher par titre, intervenant…'
                startContent={<SearchIcon className='text-c5 shrink-0' size={16} />}
                classNames={{
                  base: 'w-full shrink-0',
                  mainWrapper: 'w-full',
                  inputWrapper: '!min-h-12 !h-12 !rounded-lg !bg-c2 !border-2 !border-c3 !shadow-none data-[hover=true]:!bg-c3 data-[focus=true]:!bg-c3',
                  input: 'text-c6 text-sm placeholder:text-c4',
                }}
                isClearable
                onClear={() => setQuery('')}
              />

              <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
                <div className='pointer-events-none absolute top-0 left-0 z-10 h-5 w-full bg-gradient-to-b from-c1 to-transparent' />

                <div className='min-h-0 flex-1 overflow-y-auto pt-2 scrollbar-hide'>
                  {loading ? (
                    <div className='flex flex-col items-center justify-center gap-2 py-10'>
                      <Spinner color='current' className='text-c6' size='sm' />
                      <p className='text-c5 text-sm'>Recherche en cours…</p>
                    </div>
                  ) : (
                    <>
                      <div className='flex flex-col'>
                        {Object.entries(
                          results.reduce(
                            (acc, item) => {
                              const type = item.type || 'unknown';
                              if (!acc[type]) acc[type] = [];
                              acc[type].push(item);
                              return acc;
                            },
                            {} as Record<string, any[]>,
                          ),
                        ).map(([type, items]) => {
                          const config = RESOURCE_TYPES[type as ResourceType];
                          const label = config?.collectionLabel || config?.label || type;
                          const Icon = config?.icon;

                          return (
                            <div key={type} className='mb-4'>
                              <div className='mb-2 flex items-center gap-2 px-1'>
                                {Icon && <Icon className='text-c4' size={14} />}
                                <h3 className='text-sm font-medium uppercase tracking-wide text-c4'>
                                  {label}{' '}
                                  <span className='text-xs opacity-60'>({(items as any[]).length})</span>
                                </h3>
                              </div>
                              <div className='grid grid-cols-1 gap-2.5'>
                                {(items as any[]).map((item) => (
                                  <div key={item.id} onClick={() => onClose()}>
                                    <WideResourceCard item={item} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {hasSearched && results.length === 0 && (
                        <div className='flex flex-col items-center justify-center gap-1 py-10 text-center'>
                          <SearchIcon size={24} className='mb-1 text-c4' />
                          <p className='text-base font-medium text-c5'>Aucun résultat trouvé</p>
                          <p className='text-sm text-c4'>Réessayez avec d&apos;autres termes</p>
                        </div>
                      )}

                      {!hasSearched && query === '' && selectedTypes.length === 0 && (
                        <div className='flex flex-col items-center justify-center gap-1 py-10 text-center'>
                          <SearchIcon size={24} className='mb-1 text-c4' />
                          <p className='text-base font-medium text-c5'>Commencez à taper…</p>
                          <p className='text-sm text-c4'>Pour rechercher un contenu Edisem</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className={`pointer-events-none absolute bottom-0 left-0 z-10 w-full ${modalBottomFadeClass}`} />
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  },
);

SearchModal.displayName = 'SearchModal';
