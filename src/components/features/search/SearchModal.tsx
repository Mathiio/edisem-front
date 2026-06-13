import { useEffect, forwardRef, useImperativeHandle, useState, useRef, useCallback } from 'react';
import { Modal, ModalContent, ModalBody, useDisclosure, Input, Spinner, ModalHeader } from '@heroui/react';
import { SearchIcon } from '@/components/ui/icons';
import { useDebounce } from '@/hooks/useDebounce';
import { advancedSearch } from '@/services/Items';
import { WideResourceCard } from '@/components/features/search/WideResourceCard';
import { RESOURCE_TYPES, ResourceType } from '@/config/resourceConfig';

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
    
    // State
    const [query, setQuery] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Debounce
    const debouncedQuery = useDebounce(query, 500);
    const inputRef = useRef<HTMLInputElement>(null);

    // Methods exposed via Ref
    useImperativeHandle(ref, () => ({
      openWithSearch: (searchTerm: string) => {
        setQuery(searchTerm);
        onOpen();
      },
      notrigger,
    }));

    // Focus input on open
    useEffect(() => {
      if (isOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        // Reset state on close
        setTimeout(() => {
          setQuery('');
          setResults([]);
          setHasSearched(false);
          setSelectedTypes([]);
        }, 300);
      }
    }, [isOpen]);

    // Perform Search
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
        console.error("Search error", err);
      } finally {
        setLoading(false);
      }
    }, [debouncedQuery, selectedTypes]);

    // Trigger Search
    useEffect(() => {
      performSearch();
    }, [performSearch]);

    // Shortcuts
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
            className="focus:outline-none focus-visible:outline-none hover:bg-c3 cursor-pointer bg-c2 text-base p-4 border-c3 border-2 rounded-xl text-c6 transition-colors ease-in-out duration-200"
            onClick={onOpen}
            title="Rechercher"
          >
            <SearchIcon size={13} className="text-c6" />
          </button>
        )}

        <Modal
          backdrop="blur"
          className="bg-c2 rounded-3xl p-0"
          size="2xl"
          isOpen={isOpen}
          onClose={onClose}
          hideCloseButton={true}
          scrollBehavior="inside"
          motionProps={{
            variants: {
              enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
              exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
            },
          }}
        >
          <ModalContent className="h-[90vh] max-h-[900px] px-10 py-5">
            <ModalHeader className="w-full flex items-center justify-center py-5">
              <h2 className="text-2xl font-regular text-c6">Rechercher un Contenu</h2>
            </ModalHeader>
            <ModalBody className="p-0 flex flex-col h-full overflow-hidden">
              {/* Header / Input Section */}
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par titre, intervenant..."
                startContent={<SearchIcon className="text-c4 mr-2" size={20} />}
                classNames={{
                    inputWrapper: "w-full h-16 bg-c3/60 hover:!bg-c3 focus-within:!bg-c3/80 data-[hover=true]:!bg-c3/80 data-[focus=true]:!bg-c3/80 border-2 !border-c4/5 hover:!border-c4/5 focus-within:!border-c4/5 data-[hover=true]:!border-c4/5 data-[focus=true]:!border-c4/5 px-6 transition-all duration-300 rounded-xl shadow-none",
                    input: "text-base text-c1 placeholder:text-c4/50"
                }}
                isClearable
                onClear={() => setQuery('')}
              />

              {/* Results Section */}
              <div className="relative flex-1 overflow-hidden h-full flex flex-col">
                  {/* Top Gradient */}
                  <div className="pointer-events-none absolute top-0 left-0 z-10 w-full h-5 bg-gradient-to-b from-c2 to-transparent" />

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto h-full pt-5 scrollbar-hide">
                      <div className="max-w-4xl mx-auto min-h-full flex flex-col">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-2 mb-10">
                                <Spinner color="current" className="text-c6" />
                                <p className="text-c6 text-base">Recherche en cours...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col">
                                    {Object.entries(
                                        results.reduce((acc, item) => {
                                            const type = item.type || 'unknown';
                                            if (!acc[type]) acc[type] = [];
                                            acc[type].push(item);
                                            return acc;
                                        }, {} as Record<string, any[]>)
                                    ).map(([type, items]) => {
                                        const config = RESOURCE_TYPES[type as ResourceType];
                                        const label = config?.collectionLabel || config?.label || type;
                                        const Icon = config?.icon;

                                        return (
                                            <div key={type} className="mb-6 mt-4">
                                                <div className="flex items-center gap-2 mb-4 px-2">
                                                    {Icon && <Icon className="text-c4" size={16} />}
                                                    <h3 className="text-base font-medium text-c4 uppercase tracking-wider mt-0.5">
                                                        {label} <span className="opacity-60 text-sm">({(items as any[]).length})</span>
                                                    </h3>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
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
                                    <div className="flex flex-col items-center justify-center flex-1 gap-px text-center mb-10">
                                        <SearchIcon size={28} className="text-c4 mb-2 animate-pulse" />
                                        <p className="text-lg font-medium text-c4/80">Aucun résultat trouvé</p>
                                        <p className="text-sm font-regular text-c4/60">Réessayez avec d'autres termes ou filtres</p>
                                    </div>
                                )}
                                
                                {!hasSearched && query === '' && selectedTypes.length === 0 && (
                                    <div className="flex flex-col items-center justify-center flex-1 gap-px mb-10">
                                        <SearchIcon size={28} className="text-c4 mb-2 animate-pulse" />
                                        <p className="text-lg font-medium text-c4/80">Commencez à taper...</p>
                                        <p className="text-sm font-regular text-c4/60">Pour rechercher un contenu Edisem</p>
                                    </div>
                                )}
                            </>
                        )}
                      </div>
                  </div>

                  {/* Bottom Gradient */}
                  <div className="pointer-events-none absolute bottom-0 left-0 z-10 w-full h-5 bg-gradient-to-t from-c2 to-transparent" />
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  }
);

SearchModal.displayName = 'SearchModal';