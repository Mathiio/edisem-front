import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { Layouts } from '@/components/layout/Layouts';
import { LongCarrousel, FullCarrousel } from '@/components/ui/Carrousels';
import { KeywordsCard, KeywordsCarouselSkeleton } from '@/components/features/resource-links/KeywordsCards';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import { SearchModal, SearchModalRef } from '@/components/features/shared/search/SearchModal';
import { ThumbnailIcon, ArrowIcon } from '@/components/ui/icons';
import { ResourceOwnerAttribution } from '@/components/ui/ResourceOwnerAttribution';
import CommentSection from '@/components/features/shared/CommentSection';
import { DynamicBreadcrumbs } from '@/components/layout/DynamicBreadcrumbs';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  dropdownContentClassNames,
  dropdownTriggerButtonClass,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
} from '@/theme/components/dropdown';
import { Spinner as HeroSpinner } from '@heroui/react';
import { useResourceOwner } from '@/hooks/useResourceOwner';
import { GenericDetailPageConfig, FetchResult, ViewOption } from './config';
import { generateSmartRecommendations } from './helpers';
import { getRessourceLabel } from '@/config/resourceConfig';

// ================================
// Props (subset de GenericDetailPageProps — vue seule)
// ================================
export interface GenericViewPageProps {
  config: GenericDetailPageConfig;
  itemId?: string;
}

// ================================
// Animations
// ================================
const fadeIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ================================
// Composant GenericViewPage
// ================================
export const GenericViewPage: React.FC<GenericViewPageProps> = ({ config, itemId: propItemId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propItemId || paramId;

  // ================================
  // State
  // ================================
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [viewData, setViewData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [loadingViews, setLoadingViews] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [selected, setSelected] = useState(config.defaultView || config.viewOptions[0]?.key || '');
  const [matchedHeight, setMatchedHeight] = useState<number | null>(null);
  const [isExitingRightColumn, setIsExitingRightColumn] = useState(false);
  const [videoSeek, setVideoSeek] = useState<{ time: number; id: number } | null>(null);
  const currentVideoTime = videoSeek?.time ?? 0;

  const leftColumnRef = useRef<HTMLDivElement>(null);
  const searchModalRef = useRef<SearchModalRef>(null);

  // ================================
  // Data fetch (full — avec recommandations)
  // ================================
  const fetchData = useCallback(async () => {
    if (!id) return;

    const resolveRecommendations = async (result: FetchResult): Promise<any[]> => {
      if (result.recommendations?.length && config.fetchRecommendations) {
        return config.fetchRecommendations(result.recommendations, result);
      }
      if (config.smartRecommendations) {
        return generateSmartRecommendations(result.itemDetails, config.smartRecommendations);
      }
      return [];
    };

    const shouldSkipRecommendationsLoading = (result: FetchResult): boolean => {
      if (config.fetchRecommendations) return false;
      if (!config.smartRecommendations?.getRelatedItems) return false;
      return Array.isArray(result.itemDetails?.relatedResources);
    };

    setLoading(true);
    setLoadingMedia(true);
    setLoadingKeywords(true);
    setLoadingViews(true);

    try {
      if ((config as any).progressiveDataFetcher) {
        const result = await (config as any).progressiveDataFetcher(id, (partial: Partial<FetchResult>) => {
          if (partial.itemDetails) {
            setItemDetails(partial.itemDetails);
            setLoading(false);
            if (partial.itemDetails.associatedMedia !== undefined) {
              setLoadingMedia(false);
            } else if (!partial.itemDetails['o:media'] || partial.itemDetails['o:media'].length === 0) {
              setLoadingMedia(false);
            }
          }
          if (partial.keywords) {
            setKeywords(partial.keywords);
            setLoadingKeywords(false);
          }
          if (partial.viewData) {
            setViewData(partial.viewData);
            setLoadingViews(false);
          }
        });

        setItemDetails(result.itemDetails);
        setKeywords(result.keywords || []);
        setViewData(result.viewData || {});
        setLoading(false);
        setLoadingMedia(false);
        setLoadingKeywords(false);
        setLoadingViews(false);

        if (!shouldSkipRecommendationsLoading(result)) {
          setLoadingRecommendations(true);
        }
        try {
          const recs = await resolveRecommendations(result);
          setRecommendations(recs || []);
        } catch {
          setRecommendations([]);
        } finally {
          setLoadingRecommendations(false);
        }
      } else {
        const result = await config.dataFetcher(id);
        setItemDetails(result.itemDetails);
        setKeywords(result.keywords || []);
        setViewData(result.viewData || {});
        setLoading(false);
        setLoadingMedia(false);
        setLoadingKeywords(false);
        setLoadingViews(false);

        if (!shouldSkipRecommendationsLoading(result)) {
          setLoadingRecommendations(true);
        }
        try {
          const recs = await resolveRecommendations(result);
          setRecommendations(recs || []);
        } catch {
          setRecommendations([]);
        } finally {
          setLoadingRecommendations(false);
        }
      }
    } catch (error) {
      console.error('GenericViewPage: Error fetching data:', error);
      setItemDetails(null);
    } finally {
      setLoading(false);
      setLoadingKeywords(false);
      setLoadingViews(false);
      setLoadingMedia(false);
      setLoadingRecommendations(false);
    }
  }, [id, config]);

  // Reset on ID change
  useEffect(() => {
    setItemDetails(null);
    setKeywords([]);
    setRecommendations([]);
    setViewData({});
    setLoading(true);
    setLoadingMedia(true);
    setLoadingKeywords(true);
    setLoadingViews(true);
    setLoadingRecommendations(true);
    setVideoSeek(null);
    setIsExitingRightColumn(false);
    setSelected(config.defaultView || config.viewOptions[0]?.key || '');
  }, [id, config.defaultView, config.viewOptions]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Colonne droite calée sur la hauteur réelle de la colonne gauche (desktop uniquement)
  useLayoutEffect(() => {
    if (loading) {
      setMatchedHeight(null);
      return;
    }

    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const syncHeight = () => {
      if (!desktopQuery.matches) {
        setMatchedHeight(null);
        return;
      }

      const node = leftColumnRef.current;
      if (!node) return;

      setMatchedHeight(Math.round(node.getBoundingClientRect().height));
    };

    syncHeight();

    const node = leftColumnRef.current;
    const observer = node ? new ResizeObserver(syncHeight) : null;
    if (node && observer) observer.observe(node);

    desktopQuery.addEventListener('change', syncHeight);

    return () => {
      observer?.disconnect();
      desktopQuery.removeEventListener('change', syncHeight);
    };
  }, [loading, itemDetails, loadingKeywords, loadingMedia, loadingViews]);

  // ================================
  // View helpers
  // ================================
  const handleTimeChange = (newTime: number) => {
    setVideoSeek({ time: newTime, id: Date.now() });
  };

  const handleKeywordClick = (searchTerm: string) => {
    searchModalRef.current?.openWithSearch(searchTerm);
  };

  const handleOptionSelect = (optionKey: string) => {
    setSelected(optionKey);
  };


  // ================================
  // Helper: extract text from React element
  // ================================
  const extractTextFromElement = (element: React.ReactElement | React.ReactNode): string => {
    if (!element) return '';
    if (typeof element === 'string') return element;
    if (typeof element === 'number') return String(element);
    if (React.isValidElement(element)) {
      const props = element.props as any;
      const children = props?.children;
      if (Array.isArray(children)) {
        return children.map((child: any) => extractTextFromElement(child)).join(' ');
      } else if (children) {
        return extractTextFromElement(children);
      }
    }
    return '';
  };

  const isEmptyStateMessage = (element: React.ReactElement): boolean => {
    const props = element.props as any;
    const componentType = element.type as any;
    const componentName = componentType?.displayName || componentType?.name || '';
    if (componentName && (componentName.includes('EmptyState') || componentName === 'EmptyState')) return true;

    const className = typeof props?.className === 'string' ? props.className : '';
    const hasEmptyStateStructure =
      className.includes('text-center') && className.includes('bg-c2') &&
      className.includes('border-c3') && className.includes('rounded-xl');

    if (hasEmptyStateStructure) {
      const allText = extractTextFromElement(element).toLowerCase().trim();
      if (allText) {
        const hasEmptyKeywords =
          allText.includes('aucun') || allText.includes('aucune') || allText.includes('disponible') ||
          allText.includes('référence') || allText.includes('élément') || allText.includes('donnée') ||
          allText.includes('contenu') || allText.includes('analyse') || allText.includes('source') ||
          allText.includes('média') || allText.includes('ressource');

        if (hasEmptyKeywords) {
          const emptyPatterns = [
            'aucune référence disponible', 'aucun élément disponible', 'aucune donnée disponible',
            'aucun contenu disponible', 'aucune analyse disponible', 'aucune source disponible',
            'aucun média disponible', 'aucune ressource disponible',
          ];
          return emptyPatterns.some((pattern) => allText.includes(pattern));
        }
      }
      return true;
    }

    if (className.includes('text-center') && className.includes('bg-c2')) {
      const allText = extractTextFromElement(element).toLowerCase().trim();
      if (allText) {
        const emptyPatterns = ['aucune référence disponible', 'aucun élément disponible', 'aucune donnée disponible', 'aucun contenu disponible'];
        return emptyPatterns.some((pattern) => allText.includes(pattern));
      }
    }
    return false;
  };

  const viewHasRenderableContent = (viewOption: ViewOption | undefined): boolean => {
    if (!viewOption) return false;
    if (!itemDetails) return false;

    if (viewOption.getItemCount) {
      return viewOption.getItemCount(itemDetails, undefined) > 0;
    }
    if (!viewOption.renderContent) return false;

    const content = viewOption.renderContent({
      itemDetails,
      viewData,
      loading: false,
      loadingViews,
      onTimeChange: handleTimeChange,
      isEditing: false,
    });

    if (!content) return false;

    if (React.isValidElement(content)) {
      const props = content.props as any;
      if (props?.items !== undefined) {
        const items = Array.isArray(props.items) ? props.items : [];
        return items.length > 0;
      }
      if (isEmptyStateMessage(content)) return false;

      const checkForEmptyState = (element: React.ReactElement): boolean => {
        if (isEmptyStateMessage(element)) return true;
        const elementProps = element.props as any;
        if (elementProps?.children) {
          const children = elementProps.children;
          if (Array.isArray(children)) {
            if (children.length > 0 && React.isValidElement(children[0])) return isEmptyStateMessage(children[0]);
          } else if (React.isValidElement(children)) {
            return isEmptyStateMessage(children);
          }
        }
        return false;
      };

      if (checkForEmptyState(content)) return false;
      return true;
    }

    if (typeof content === 'string') return content.trim() !== '';
    return true;
  };

  // ================================
  // Available views (filtered by content)
  // ================================
  const availableViews = useMemo(() => {
    if (!config.viewOptions || config.viewOptions.length === 0) return [];
    if (!itemDetails || loading) return [];
    return config.viewOptions.filter((viewOption) => viewHasRenderableContent(viewOption));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemDetails, loading, loadingViews, config.viewOptions]);

  // Ensure selected view is valid
  useEffect(() => {
    if (!loading && itemDetails && availableViews.length > 0) {
      const isSelectedAvailable = availableViews.some((v) => v.key === selected);
      if (!isSelectedAvailable) {
        const defaultView = config.defaultView && availableViews.find((v) => v.key === config.defaultView);
        setSelected(defaultView ? defaultView.key : availableViews[0].key);
      }
    }
  }, [loading, itemDetails, availableViews, selected, config.defaultView]);

  // ================================
  // Layout
  // ================================
  const shouldShowRightColumn = (config.viewOptions?.length ?? 0) > 0 && !config.editSingleColumn;
  const useCenteredSingleColumn = !shouldShowRightColumn;
  const leftColumnSpan = shouldShowRightColumn ? 'col-span-10 lg:col-span-6' : 'col-span-10';
  const centeredShellClass = useCenteredSingleColumn ? 'w-full max-w-3xl' : 'w-full';
  const leftColumnOuterClassName = `${leftColumnSpan}${useCenteredSingleColumn ? ' flex justify-center' : ''}`;
  const leftColumnInnerClassName = `${centeredShellClass} flex flex-col gap-5 h-fit`;

  const selectedOption =
    availableViews.find((option) => option.key === selected) ??
    config.viewOptions.find((option) => option.key === selected);

  // ================================
  // Rendered content for selected view
  // ================================
  const renderedContent = useMemo(() => {
    if (!itemDetails) return null;
    const viewOption = config.viewOptions.find((opt) => opt.key === selected);
    if (!viewOption?.renderContent) return null;

    const content = viewOption.renderContent({
      itemDetails,
      viewData,
      loading,
      loadingViews,
      onTimeChange: handleTimeChange,
      isEditing: false,
    });

    return content || null;
  }, [itemDetails, selected, viewData, loading, loadingViews, config.viewOptions]);

  // ================================
  // Keywords (sorted)
  // ================================
  const sortedKeywords = useMemo(() => {
    const allKeywords = Array.isArray(keywords) ? keywords : [];
    return allKeywords
      .map((keyword: any) => ({
        id: keyword.id || keyword['o:id'],
        title: keyword.title || keyword['o:title'] || keyword.display_title || keyword['dcterms:title']?.[0]?.['@value'] || `Mot-clé ${keyword.id}`,
        popularity: keyword.popularity || keyword.count || 0,
      }))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }, [keywords]);

  const hasKeywordsRow =
    shouldShowRightColumn &&
    config.showKeywords &&
    (loadingKeywords || sortedKeywords.length > 0);
  const mainContentRowClass = hasKeywordsRow ? 'lg:row-start-2' : 'lg:row-start-1';

  // ================================
  // Resource owner
  // ================================
  const resourceOwner = useResourceOwner(itemDetails);
  const resourceTypeLabel = config.resourceLabel || getRessourceLabel(config.resourceType || config.type || '') || null;

  // ================================
  // Components from config
  // ================================
  const OverviewComponent = config.overviewComponent;
  const DetailsComponent = config.detailsComponent;
  const OverviewSkeleton = config.overviewSkeleton;
  const DetailsSkeleton = config.detailsSkeleton;

  // ================================
  // Views panel (header + contenu)
  // ================================
  const viewsPanelHeader = (
    <div className='flex items-center justify-between gap-3 w-full min-w-0'>
      <h2 className='text-2xl font-medium text-c6 truncate flex-1 min-w-0'>{selectedOption?.title}</h2>
      <Dropdown classNames={dropdownContentClassNames}>
        <DropdownTrigger className='shrink-0 p-0 bg-transparent border-0 data-[hover=true]:bg-transparent'>
          <div className={dropdownTriggerButtonClass}>
            <span className='text-base font-normal text-c6 whitespace-nowrap'>Autres choix</span>
            <ArrowIcon size={12} className='rotate-90 text-c6 shrink-0' />
          </div>
        </DropdownTrigger>
        <DropdownMenu aria-label='View options' className='p-2' classNames={dropdownMenuClassNames}>
          {(availableViews.length > 0 ? availableViews : config.viewOptions).map((option) => {
            const isAvailable = availableViews.some((v) => v.key === option.key);
            const isLoading = loadingViews && !isAvailable;
            return (
              <DropdownItem
                key={option.key}
                className={dropdownMenuItemClass}
                onPress={() => handleOptionSelect(option.key)}
                isDisabled={isLoading}>
                <div className={`flex items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 ${
                  isLoading ? 'text-c4 cursor-not-allowed' :
                  selected === option.key ? 'bg-c3 text-c6 font-medium' : 'text-c6 hover:bg-c3'
                }`}>
                  {isLoading && <HeroSpinner size='sm' className='mr-2 text-c6' />}
                  <span className='text-base font-normal'>{option.title}</span>
                </div>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    </div>
  );

  const viewsPanelContent = (
    <div className='flex-1 min-h-0 overflow-y-auto'>
      {viewHasRenderableContent(selectedOption) ? (
        renderedContent
      ) : (
        <div className='flex flex-col items-center justify-center w-full h-full py-5 text-center gap-4'>
          <ThumbnailIcon size={32} className='text-c4' />
          <p className='text-c5 text-base w-50'>
            Aucun contenu renseigné pour {selectedOption?.title?.toLowerCase() || 'cette section'}.
          </p>
        </div>
      )}
    </div>
  );

  const renderViewsPanel = () => (
    <div className='flex w-full flex-col gap-5 flex-1 min-h-0 overflow-hidden'>
      {viewsPanelHeader}
      {viewsPanelContent}
    </div>
  );

  const renderViewsPanelHeaderLoading = () => (
    <div className='flex items-center justify-between w-full'>
      <div className='w-2/5 h-12 bg-c3 rounded-lg animate-pulse' />
      <div className='w-1/5 h-12 bg-c3 rounded-lg animate-pulse' />
    </div>
  );

  const renderViewsPanelBodyLoading = () => (
    <div className='flex flex-col gap-4 flex-1 min-h-0'>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
      ))}
    </div>
  );

  const renderViewsPanelLoading = () => (
    <>
      {renderViewsPanelHeaderLoading()}
      {renderViewsPanelBodyLoading()}
    </>
  );

  const rightColumnBodyStyle =
    matchedHeight != null ? { height: matchedHeight, maxHeight: matchedHeight } : undefined;

  const rightColumnMotionProps = {
    initial: { opacity: 0, x: 30 } as const,
    animate: isExitingRightColumn
      ? { opacity: 0, x: 60, transition: { duration: 0.35, ease: 'easeIn' } }
      : { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  // ================================
  // Main render (view mode — les skeletons gèrent l'état loading en interne)
  // ================================
  return (
    <Layouts className='grid grid-cols-10 col-span-10 gap-6 overflow-visible z-0 items-start'>
      {/* Breadcrumbs */}
      <div className='col-span-10 w-full'>
        <DynamicBreadcrumbs
          className='w-full'
          itemTitle={itemDetails?.titre || itemDetails?.title || itemDetails?.['o:title'] || itemDetails?.name}
          underline='hover'
        />
      </div>

      {shouldShowRightColumn ? (
        <div className='col-span-10 grid grid-cols-10 gap-6 items-start'>
          {config.showKeywords && (
            <div className='col-span-10 lg:col-span-6 lg:row-start-1'>
              {loadingKeywords ? (
                <KeywordsCarouselSkeleton />
              ) : (
                itemDetails &&
                sortedKeywords?.length > 0 && (
                  <LongCarrousel
                    perPage={3}
                    perMove={1}
                    autowidth={true}
                    data={sortedKeywords}
                    renderSlide={(item) => (
                      <KeywordsCard key={item.id || item.title} onSearchClick={handleKeywordClick} word={item.title} />
                    )}
                  />
                )
              )}
            </div>
          )}

          <motion.div className={`col-span-10 lg:col-span-6 lg:self-start ${mainContentRowClass}`} variants={fadeIn} initial='hidden' animate='visible'>
            <div ref={leftColumnRef} className='flex flex-col gap-5'>
              {loading ? (
                OverviewSkeleton ? <OverviewSkeleton /> : <div>Loading...</div>
              ) : itemDetails ? (
                <OverviewComponent
                  {...config.mapOverviewProps(itemDetails, currentVideoTime)}
                  videoSeek={videoSeek}
                  type={config.type}
                  isEditing={false}
                  loadingMedia={loadingMedia}
                />
              ) : null}

              {loading ? (
                DetailsSkeleton ? <DetailsSkeleton /> : <div>Loading...</div>
              ) : itemDetails ? (
                <DetailsComponent {...config.mapDetailsProps(itemDetails)} isEditing={false} type={config.type} />
              ) : null}
            </div>
          </motion.div>

          {hasKeywordsRow ? (
            <>
              <motion.div
                {...rightColumnMotionProps}
                className='col-span-10 lg:col-span-4 lg:col-start-7 lg:row-start-1 lg:self-start w-full'>
                {loadingViews ? renderViewsPanelHeaderLoading() : viewsPanelHeader}
              </motion.div>

              <motion.div
                {...rightColumnMotionProps}
                style={rightColumnBodyStyle}
                className='col-span-10 lg:col-span-4 lg:col-start-7 lg:row-start-2 lg:self-start flex flex-col min-h-0 overflow-hidden w-full'>
                {loadingViews ? renderViewsPanelBodyLoading() : viewsPanelContent}
              </motion.div>
            </>
          ) : (
            <motion.div
              {...rightColumnMotionProps}
              style={rightColumnBodyStyle}
              className={`col-span-10 lg:col-span-4 lg:col-start-7 lg:self-start flex flex-col gap-5 min-h-0 overflow-hidden w-full ${mainContentRowClass}`}>
              {loadingViews ? (
                <div className='flex w-full flex-col gap-5 flex-1 min-h-0'>{renderViewsPanelLoading()}</div>
              ) : (
                renderViewsPanel()
              )}
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div className={leftColumnOuterClassName} variants={fadeIn} initial='hidden' animate='visible'>
          <div className={leftColumnInnerClassName}>
            {config.showKeywords && (
              loadingKeywords ? (
                <KeywordsCarouselSkeleton />
              ) : (
                itemDetails &&
                sortedKeywords?.length > 0 && (
                  <LongCarrousel
                    perPage={3}
                    perMove={1}
                    autowidth={true}
                    data={sortedKeywords}
                    renderSlide={(item) => (
                      <KeywordsCard key={item.id || item.title} onSearchClick={handleKeywordClick} word={item.title} />
                    )}
                  />
                )
              )
            )}

            {loading ? (
              OverviewSkeleton ? <OverviewSkeleton /> : <div>Loading...</div>
            ) : itemDetails ? (
              <OverviewComponent
                {...config.mapOverviewProps(itemDetails, currentVideoTime)}
                videoSeek={videoSeek}
                type={config.type}
                isEditing={false}
                loadingMedia={loadingMedia}
              />
            ) : null}

            {loading ? (
              DetailsSkeleton ? <DetailsSkeleton /> : <div>Loading...</div>
            ) : itemDetails ? (
              <DetailsComponent {...config.mapDetailsProps(itemDetails)} isEditing={false} type={config.type} />
            ) : null}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {config.showRecommendations && (
        loadingRecommendations ? (
          <motion.div className='col-span-10 h-full lg:col-span-6 flex flex-col gap-12 flex-grow' variants={fadeIn}>
            <div className='flex flex-col gap-5'>
              <h2 className='text-2xl font-medium text-c6'>{config.recommendationsTitle || 'Recommandations'}</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                <ResourceCardSkeleton />
                <ResourceCardSkeleton />
              </div>
            </div>
          </motion.div>
        ) : recommendations.length > 0 ? (
          <motion.div className='col-span-10 h-full lg:col-span-6 flex flex-col gap-12 flex-grow' variants={fadeIn}>
            <FullCarrousel
              title={config.recommendationsTitle || 'Recommandations'}
              perPage={2}
              perMove={1}
              data={recommendations}
              renderSlide={(item) => {
                const mappedItem = config.mapRecommendationProps ? config.mapRecommendationProps(item) : item;
                return (
                  <motion.div initial='hidden' animate='visible' variants={fadeIn} key={item.id}>
                    <ResourceCard item={mappedItem} />
                  </motion.div>
                );
              }}
            />
          </motion.div>
        ) : null
      )}

      {/* Comments */}
      {config.showComments && id && (
        <motion.div
          className={`${shouldShowRightColumn ? 'col-span-4 lg:col-span-4' : 'col-span-10'} h-full flex flex-col gap-12 flex-grow${useCenteredSingleColumn ? ' items-center' : ''}`}
          variants={fadeIn}>
          <div className={`${centeredShellClass} flex flex-col gap-12 flex-grow`}>
            <CommentSection LinkedResourceId={Number(id)} />
          </div>
        </motion.div>
      )}

      {/* Resource owner attribution */}
      {!loading && (resourceTypeLabel || resourceOwner) && (
        <motion.div
          className={`col-span-10 pt-4 border-t border-c3${useCenteredSingleColumn ? ' flex justify-center' : ''}`}
          variants={fadeIn}>
          <div className={centeredShellClass}>
            <ResourceOwnerAttribution owner={resourceOwner} resourceTypeLabel={resourceTypeLabel} />
          </div>
        </motion.div>
      )}

      <SearchModal ref={searchModalRef} notrigger={true} />
    </Layouts>
  );
};
