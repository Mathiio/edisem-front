import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getCoverageMatrix, getKeywordsByType, CoverageMatrixData, TypeKeywordsData } from '@/services/Analytics';
import { Skeleton, Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { Grid3X3, AlertTriangle, BarChart3, Eye, Info } from 'lucide-react';
import { AnalyticsViewHeader } from './AnalyticsViewHeader';
import { CoverageMatrixViewSkeleton } from './AnalyticsViewSkeletons';
import { ViewLoader } from './ViewLoader';

// Fonction pour calculer le style en fonction du count
function getHeatmapStyle(count: number): React.CSSProperties {
  const baseColor = { r: 6, g: 182, b: 212 }; // cyan-500

  if (count === 0) return { backgroundColor: 'rgba(100, 116, 139, 0.2)' };
  if (count <= 2) return { backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.3)` };
  if (count <= 5) return { backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.45)` };
  if (count <= 10) return { backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.6)` };
  if (count <= 20) return { backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)` };
  return { backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)` };
}

// Légende
const LEGEND_ITEMS = [
  { label: '0', color: 'rgba(100, 116, 139, 0.2)' },
  { label: '1-2', color: 'rgba(6, 182, 212, 0.3)' },
  { label: '3-5', color: 'rgba(6, 182, 212, 0.45)' },
  { label: '6-10', color: 'rgba(6, 182, 212, 0.6)' },
  { label: '11-20', color: 'rgba(6, 182, 212, 0.8)' },
  { label: '21+', color: 'rgba(6, 182, 212, 1)' },
];

interface CoverageMatrixProps {
  onGapClick?: (gap: { type: string; keywordId: string; keywordTitle: string }) => void;
  topKeywordsCount?: number;
  onTopKeywordsCountChange?: (count: number) => void;
}

export const CoverageMatrix: React.FC<CoverageMatrixProps> = ({ onGapClick, topKeywordsCount: externalCount }) => {
  const [data, setData] = useState<CoverageMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalCount] = useState(15);

  // Utiliser les props externes si fournies, sinon état interne
  const topKeywordsCount = externalCount ?? internalCount;

  // Panneau de détails
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [typeKeywordsData, setTypeKeywordsData] = useState<TypeKeywordsData | null>(null);
  const [isLoadingType, setIsLoadingType] = useState(false);

  // Détection du scroll horizontal pour le sticky
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // État hover pour afficher les infos dans le footer
  const [hoveredCell, setHoveredCell] = useState<{
    typeLabel: string;
    keywordTitle: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollLeft > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Charger la matrice
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getCoverageMatrix(topKeywordsCount);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [topKeywordsCount]);

  // Charger les détails d'un type quand sélectionné
  useEffect(() => {
    if (!selectedType) {
      setTypeKeywordsData(null);
      return;
    }

    const fetchTypeKeywords = async () => {
      setIsLoadingType(true);
      try {
        const result = await getKeywordsByType(selectedType);
        setTypeKeywordsData(result);
      } catch (err) {
        console.error('Erreur chargement keywords type:', err);
        setTypeKeywordsData(null);
      } finally {
        setIsLoadingType(false);
      }
    };
    fetchTypeKeywords();
  }, [selectedType]);

  // Filtrer les types qui ont au moins un mot-clé
  const filteredMatrix = useMemo(() => {
    if (!data) return [];
    return data.matrix.filter((typeData) => {
      // Vérifier si ce type a au moins un mot-clé avec count > 0
      return Object.values(typeData.keywords).some((count) => count > 0);
    });
  }, [data]);

  // Calculer la largeur du bouton en fonction du label le plus long
  const typeLabelWidth = useMemo(() => {
    if (filteredMatrix.length === 0) return 170;
    const maxLength = Math.max(...filteredMatrix.map((t) => t.label.length));
    // Approximation: ~8px par caractère + padding
    return Math.max(170, maxLength * 8 + 24);
  }, [filteredMatrix]);

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <AnalyticsViewHeader
        title='Matrice de couverture'
        description='Croisement des types de ressources et des mots-clés les plus fréquents.'
        icon={<Grid3X3 size={18} />}
      />
      <ViewLoader
        isLoading={isLoading}
        error={error}
        isEmpty={!data || data.keywords.length === 0}
        icon={<Grid3X3 />}
        title='Aucune donnée'
        emptyMessage='Aucune donnée de couverture disponible.'
        loadingSkeleton={<CoverageMatrixViewSkeleton />}>
        <div className='flex h-full w-full flex-1 flex-col overflow-hidden bg-c1'>
          {/* Contenu principal */}
          <div className='flex min-h-0 flex-1 overflow-hidden py-6'>
          {/* Matrice */}
          <div ref={scrollContainerRef} className='w-fit max-w-full overflow-auto rounded-lg border-2 border-c3 ' style={{ scrollbarGutter: 'stable' }}>
            <div className='w-fit flex flex-col  rounded-lg'>
              {/* Header keywords */}
              <div className='flex border-b-2 border-c3 bg-c2 '>
                <div
                  className={`h-[220px] flex items-end pb-8 pr-8 sticky left-0 z-10 bg-c2 border-r-2 border-c3 ${isScrolled ? 'border-l-2 rounded-tl-8' : ''}`}
                  style={{ width: typeLabelWidth, minWidth: typeLabelWidth }}>
                  <span className='text-c4 text-xs px-8'>Types / Keywords</span>
                </div>
                {data?.keywords.map((kw, kwIndex) => (
                  <div
                    key={kw.keyword_id}
                    className={`w-10 min-w-10 h-[220px] flex items-end justify-center pb-4 border-c3 ${kwIndex === (data?.keywords.length || 0) - 1 ? '' : 'border-r-2'}`}>
                    <span
                      className='text-c5 text-xs overflow-hidden text-ellipsis whitespace-nowrap truncate '
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '180px' }}
                      title={kw.keyword_title}>
                      {kw.keyword_title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {filteredMatrix.map((typeData, index) => (
                <div key={typeData.type} className={`flex justify-start group ${index % 2 === 0 ? 'bg-c1' : 'bg-c2'}`}>
                  {/* Label type - cliquable */}
                  <button
                    onClick={() => setSelectedType(selectedType === typeData.type ? null : typeData.type)}
                    style={{ width: typeLabelWidth, minWidth: typeLabelWidth }}
                    className={`h-10 flex items-center text-c6 px-8 text-left transition-colors sticky left-0 z-10 border-r-2 border-b-2 border-c3
                    ${isScrolled ? 'border-l-2 rounded-l-8' : ''}
                    ${index % 2 === 0 ? 'bg-c1' : 'bg-c2'}
                    ${selectedType === typeData.type ? '!bg-action/20 text-action' : 'hover:bg-c3'}`}>
                    <span className='text-sm whitespace-nowrap max-w-[220px] truncate' title={typeData.label}>
                      {typeData.label}
                    </span>
                  </button>

                  {/* Cells */}
                  {data?.keywords.map((kw, kwIndex) => {
                    const count = typeData.keywords[kw.keyword_id] || 0;
                    const isGap = count === 0;
                    const isLastColumn = kwIndex === (data?.keywords.length || 0) - 1;

                    return (
                      <div
                        key={`${typeData.type}-${kw.keyword_id}`}
                        className={`w-10 min-w-10 h-10 flex items-center justify-center border-b-2 border-c3 ${isLastColumn ? '' : 'border-r-2'}
                          ${isGap && onGapClick ? 'cursor-pointer hover:ring-2 hover:ring-datavisOrange' : 'hover:ring-2 hover:ring-white/30'}`}
                        style={getHeatmapStyle(count)}
                        onMouseEnter={() => setHoveredCell({ typeLabel: typeData.label, keywordTitle: kw.keyword_title, count })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          if (isGap && onGapClick) {
                            onGapClick({ type: typeData.type, keywordId: kw.keyword_id, keywordTitle: kw.keyword_title });
                          }
                        }}>
                        <span className='text-c6 text-xs font-medium'>{count > 0 ? count : ''}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          </div>

        {/* Modal de détails du type */}
        <Modal
          isOpen={!!selectedType}
          onClose={() => setSelectedType(null)}
          size='2xl'
          scrollBehavior='inside'
          classNames={{ base: 'bg-c2', header: 'border-b border-c3', body: 'p-0' }}>
          <ModalContent>
            <ModalHeader className='flex items-center gap-8'>
              <BarChart3 size={20} className='text-c5' />
              <span>{typeKeywordsData?.label || selectedType}</span>
            </ModalHeader>
            <ModalBody>
              {isLoadingType ? (
                <div className='flex items-center justify-center h-48 p-5'>
                  <Skeleton className='w-full h-36 rounded-lg' />
                </div>
              ) : typeKeywordsData ? (
                <div className='p-5 space-y-20'>
                  {/* Stats en haut */}
                  <div className='grid grid-cols-3 gap-4'>
                    <div className='bg-c3 rounded-xl p-4 text-center'>
                      <p className='text-c6 text-2xl font-bold'>{typeKeywordsData.totalResources}</p>
                      <p className='text-c4 text-xs mt-4'>Ressources</p>
                    </div>
                    <div className='bg-c3 rounded-xl p-4 text-center'>
                      <p className='text-c6 text-2xl font-bold'>{typeKeywordsData.resourcesWithKeywords}</p>
                      <p className='text-c4 text-xs mt-4'>Avec mots-clés</p>
                    </div>
                    <div className='bg-c3 rounded-xl p-4 text-center'>
                      <p className='text-datavisBlue text-2xl font-bold'>{typeKeywordsData.coveragePercentage}%</p>
                      <p className='text-c4 text-xs mt-4'>Couverture</p>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className='h-8 bg-c3 rounded-full overflow-hidden'>
                    <div className='h-full bg-datavisBlue rounded-full transition-all' style={{ width: `${typeKeywordsData.coveragePercentage}%` }} />
                  </div>

                  {/* Liste des mots-clés */}
                  <div>
                    <div className='flex items-center gap-8 mb-12'>
                      <Eye size={16} className='text-c5' />
                      <span className='text-c5 text-sm font-medium'>Mots-clés ({typeKeywordsData.keywords.length})</span>
                    </div>

                    {typeKeywordsData.keywords.length === 0 ? (
                      <div className='bg-c3 rounded-xl p-5 text-center'>
                        <AlertTriangle size={32} className='text-datavisOrange mx-auto mb-8' />
                        <p className='text-c4 text-sm'>Aucun mot-clé associé</p>
                      </div>
                    ) : (
                      <div className='grid grid-cols-2 gap-8'>
                        {typeKeywordsData.keywords.map((kw) => {
                          const maxCount = typeKeywordsData.keywords[0]?.count || 1;
                          const percentage = (kw.count / maxCount) * 100;
                          const isInTopGlobal = data?.keywords.some((gk) => gk.keyword_id === String(kw.id));

                          return (
                            <div key={kw.id} className={`rounded-lg p-2.5 ${isInTopGlobal ? 'bg-c3' : 'bg-datavisOrange/10 border border-datavisOrange/30'}`}>
                              <div className='flex items-center justify-between mb-6'>
                                <span className='text-c6 text-sm truncate flex-1'>{kw.title}</span>
                                <span className='text-c5 text-sm font-medium ml-8'>{kw.count}</span>
                              </div>
                              <div className='h-4 bg-c2 rounded-full overflow-hidden'>
                                <div className={`h-full rounded-full ${isInTopGlobal ? 'bg-datavisBlue' : 'bg-datavisOrange'}`} style={{ width: `${percentage}%` }} />
                              </div>
                              {!isInTopGlobal && <p className='text-datavisOrange text-[10px] mt-4'>Hors Top {topKeywordsCount}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Comparaison */}
                  {data && (
                    <div className='bg-c3 rounded-xl p-4'>
                      <div className='flex items-center gap-8 mb-12'>
                        <Info size={16} className='text-c5' />
                        <span className='text-c5 text-sm font-medium'>vs Top {topKeywordsCount} global</span>
                      </div>
                      {(() => {
                        const typeKeywordIds = new Set(typeKeywordsData.keywords.map((k) => String(k.id)));
                        const topGlobalIds = data.keywords.map((k) => k.keyword_id);
                        const inTop = topGlobalIds.filter((id) => typeKeywordIds.has(id)).length;
                        const notInTop = typeKeywordsData.keywords.length - inTop;

                        return (
                          <div className='flex gap-5'>
                            <div className='flex items-center gap-8'>
                              <span className='text-c4 text-sm'>Dans le Top {topKeywordsCount}:</span>
                              <span className='text-datavisGreen font-bold text-lg'>{inTop}</span>
                            </div>
                            <div className='flex items-center gap-8'>
                              <span className='text-c4 text-sm'>Spécifiques:</span>
                              <span className='text-datavisOrange font-bold text-lg'>{notInTop}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className='p-5 text-center'>
                  <p className='text-c4 text-sm'>Erreur de chargement</p>
                </div>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Footer avec légende et infos hover */}
        <div className='flex items-center justify-between border-t-2 border-c3 bg-c2/50 px-6 py-5'>
          {hoveredCell ? (
            <span className='text-base'>
              <span className='text-c6 font-medium'>{hoveredCell.typeLabel}</span>
              <span className='text-c4'> × </span>
              <span className='text-c5'>{hoveredCell.keywordTitle}</span>
              <span className='text-c4'> : </span>
              <span className={hoveredCell.count === 0 ? 'text-datavisOrange font-medium' : 'text-datavisBlue font-medium'}>
                {hoveredCell.count === 0 ? 'Aucune ressource' : `${hoveredCell.count} ressource${hoveredCell.count > 1 ? 's' : ''}`}
              </span>
            </span>
          ) : (
            <span className='text-c4 text-base'>
              {filteredMatrix.length} types × {data?.keywords.length} keywords • {data?.gapCount} lacunes (
              {Math.round(((data?.gapCount || 0) / ((filteredMatrix.length || 1) * (data?.keywords.length || 1))) * 100)}%)
            </span>
          )}
          <div className='flex items-center gap-6'>
            {LEGEND_ITEMS.map(({ label, color }) => (
              <div key={label} className='flex items-center gap-2'>
                <div className='w-4 h-4 rounded-xs' style={{ backgroundColor: color }} />
                <span className='text-c4 text-[10px]'>{label}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </ViewLoader>
    </div>
  );
};

export default CoverageMatrix;
