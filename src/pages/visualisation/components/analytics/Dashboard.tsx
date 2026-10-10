import React, { useEffect, useState, useMemo } from 'react';
import { Progress } from '@heroui/react';
import { Database, CheckCircle, AlertTriangle, LayoutDashboard, ArrowRight, ExternalLink, Tag } from 'lucide-react';
import { Modal, ModalBody, ModalContent, ModalHeader, modalCloseButtonClasses } from '@/theme/components';
import { ModalTitle } from '@/components/ui/ModalTitle';
import { AnalyticsViewHeader } from './AnalyticsViewHeader';
import { DashboardViewSkeleton } from './AnalyticsViewSkeletons';
import { ViewLoader } from './ViewLoader';
import {
  getOverview,
  getCompletenessStats,
  getOrphanResources,
  getCoverageMatrix,
  type OverviewData,
  type CompletenessStatsData,
  type OrphanResourcesData,
  type CoverageMatrixData,
  type TypeCount,
  type TypeCompleteness,
} from '@/services/Analytics';
import { omekaAdminItemUrl } from '@/utils/omekaApi';
import { calculateOverallCompleteness, getMostActiveType, getCompletenessColor, formatNumber, calculatePercentage } from '../../utils/dashboardHelpers';

// ========================================
// INTERFACES
// ========================================

interface DashboardData {
  overview: OverviewData;
  completeness: CompletenessStatsData;
  orphans: OrphanResourcesData;
  keywords: CoverageMatrixData;
}

type DashboardDetailModal = 'distribution' | 'completeness' | 'orphans';

const MODAL_MOTION_PROPS = {
  variants: {
    enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
  },
};

const DETAIL_MODAL_META = {
  distribution: {
    title: 'Total ressources',
    subtitle: 'Répartition par type de ressource dans le corpus.',
    icon: Database,
    iconColor: 'text-datavisBlue',
    iconBg: 'bg-datavisBlue/15',
    size: '3xl' as const,
  },
  completeness: {
    title: 'Complétude',
    subtitle: 'Taux de remplissage des métadonnées par type et par propriété.',
    icon: CheckCircle,
    iconColor: 'text-datavisGreen',
    iconBg: 'bg-datavisGreen/15',
    size: '3xl' as const,
  },
  orphans: {
    title: 'Ressources isolées',
    subtitle: 'Ressources avec au plus deux connexions dans le graphe.',
    icon: AlertTriangle,
    iconColor: 'text-datavisOrange',
    iconBg: 'bg-datavisOrange/15',
    size: '3xl' as const,
  },
} satisfies Record<
  DashboardDetailModal,
  {
    title: string;
    subtitle: string;
    icon: typeof Database;
    iconColor: string;
    iconBg: string;
    size: '3xl' | '4xl' | '5xl';
  }
>;

// ========================================
// SOUS-COMPOSANTS
// ========================================

/**
 * Vue d'ensemble - Cartes de statistiques + navigation vers autres vues
 */
const OverviewView: React.FC<{
  data: DashboardData;
  onOpenDetail: (panel: DashboardDetailModal) => void;
}> = ({ data, onOpenDetail }) => {
  const stats = useMemo(() => {
    const mostActive = getMostActiveType(data.overview);
    const activeTypes = data.overview.types.filter((t) => t.count > 0);

    return {
      total: data.overview.total,
      typeCount: data.overview.types.length,
      activeTypeCount: activeTypes.length,
      mostActive,
      mostActivePercent: mostActive ? calculatePercentage(mostActive.count, data.overview.total) : 0,
      completeness: calculateOverallCompleteness(data.completeness),
      orphans: data.orphans.totalOrphans,
      orphansPercent: calculatePercentage(data.orphans.totalOrphans, data.overview.total),
    };
  }, [data]);

  return (
    <div className='flex-1 w-full overflow-auto bg-c1 py-6'>
      {/* Navigation Cards - Cliquables */}
      <div className='grid grid-cols-3 gap-5 mb-5'>
        {/* Card Total ressources → Distribution */}
        <button type='button' onClick={() => onOpenDetail('distribution')} className='cursor-pointer bg-c2 rounded-xl p-5 border-2 border-c3 hover:border-datavisBlue/50 transition-all text-left group'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2.5'>
              <div className='w-10 h-10 rounded-lg bg-datavisBlue/15 flex items-center justify-center'>
                <Database size={20} className='text-datavisBlue' />
              </div>
              <span className='text-c5 text-sm'>Total ressources</span>
            </div>
            <ArrowRight size={16} className='text-c4 group-hover:text-datavisBlue group-hover:translate-x-px transition-all' />
          </div>
          <p className='text-c6 text-3xl font-bold tracking-tight'>{formatNumber(stats.total)}</p>
          <p className='text-c4 text-xs mt-8'>
            {stats.typeCount} types · {stats.activeTypeCount} actifs
          </p>
          {stats.mostActive && (
            <div className='mt-2.5 pt-2.5 border-t border-c3'>
              <p className='text-c5 text-xs'>
                Top: <span className='text-datavisBlue font-medium'>{stats.mostActive.label}</span> ({stats.mostActivePercent}%)
              </p>
            </div>
          )}
        </button>

        {/* Card Complétude */}
        <button type='button' onClick={() => onOpenDetail('completeness')} className='cursor-pointer bg-c2 rounded-xl p-5 border-2 border-c3 hover:border-datavisGreen/50 transition-all text-left group'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2.5'>
              <div className='w-10 h-10 rounded-lg bg-datavisGreen/15 flex items-center justify-center'>
                <CheckCircle size={20} className='text-datavisGreen' />
              </div>
              <span className='text-c5 text-sm'>Complétude</span>
            </div>
            <ArrowRight size={16} className='text-c4 group-hover:text-datavisGreen group-hover:translate-x-px transition-all' />
          </div>
          <p className='text-c6 text-3xl font-bold tracking-tight'>{stats.completeness}%</p>
          <p className='text-c4 text-xs mt-8'>Qualité des métadonnées</p>
          <div className='mt-2.5 pt-2.5 border-t border-c3'>
            <Progress value={stats.completeness} color='success' size='md' radius='full' />
          </div>
        </button>

        {/* Card Ressources isolées */}
        <button type='button' onClick={() => onOpenDetail('orphans')} className='cursor-pointer bg-c2 rounded-xl p-5 border-2 border-c3 hover:border-datavisOrange/50 transition-all text-left group'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2.5'>
              <div className='w-10 h-10 rounded-lg bg-datavisOrange/15 flex items-center justify-center'>
                <AlertTriangle size={20} className='text-datavisOrange' />
              </div>
              <span className='text-c5 text-sm'>Ressources isolées</span>
            </div>
            <ArrowRight size={16} className='text-c4 group-hover:text-datavisOrange group-hover:translate-x-px transition-all' />
          </div>
          <p className='text-c6 text-3xl font-bold tracking-tight'>{stats.orphans}</p>
          <p className='text-c4 text-xs mt-8'>{stats.orphansPercent}% peu connectées</p>
          <div className='mt-2.5 pt-2.5 border-t border-c3'>
            <span className='text-datavisOrange text-xs font-medium'>≤2 connexions</span>
          </div>
        </button>
      </div>

      {/* Carte Thématiques - Non cliquable */}
      <div className='rounded-xl border-2 border-c3 bg-c2 p-5'>
        <div className='flex items-center gap-2.5 mb-5'>
          <div className='w-10 h-10 rounded-lg bg-datavisYellow/15 flex items-center justify-center'>
            <Tag size={20} className='text-datavisYellow' />
          </div>
          <div>
            <span className='text-c6 text-sm font-medium'>Thématiques principales</span>
            <p className='text-c4 text-xs'>{data.keywords.keywords.length} mots-clés dans la base</p>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-x-5 gap-y-2.5'>
          {data.keywords.keywords.slice(0, 10).map((kw, index) => (
            <div key={kw.keyword_id} className='flex items-center gap-2.5 bg-c3/50 rounded-lg px-6 py-8'>
              <span className='text-c4 text-xs font-medium w-5'>{index + 1}.</span>
              <span className='text-c6 text-base flex-1 font-medium truncate'>{kw.keyword_title}</span>
              <span className='text-datavisYellow text-xs font-bold'>{kw.usage_count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Vue Distribution - Liste des types avec leurs counts
 */
type SortMode = 'count' | 'name';

const DistributionView: React.FC<{ types: TypeCount[] }> = ({ types }) => {
  const [sortMode, setSortMode] = useState<SortMode>('count');
  const total = useMemo(() => types.reduce((sum, t) => sum + t.count, 0), [types]);

  const sortedTypes = useMemo(() => {
    const sorted = [...types];
    if (sortMode === 'count') {
      sorted.sort((a, b) => b.count - a.count);
    } else {
      sorted.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    }
    return sorted;
  }, [types, sortMode]);

  return (
    <>
      <div className='flex items-center gap-2.5 mb-4'>
        <span className='text-c4 text-xs'>Trier par:</span>
        <button
          type='button'
          onClick={() => setSortMode('count')}
          className={`cursor-pointer px-2.5 py-1.5 rounded-md text-xs transition-colors ${sortMode === 'count' ? 'bg-datavisBlue text-selected' : 'bg-c2 text-c5 hover:bg-c3'}`}>
          Quantité
        </button>
        <button
          type='button'
          onClick={() => setSortMode('name')}
          className={`cursor-pointer px-2.5 py-1.5 rounded-md text-xs transition-colors ${sortMode === 'name' ? 'bg-datavisBlue text-selected' : 'bg-c2 text-c5 hover:bg-c3'}`}>
          Nom
        </button>
      </div>

      <div className='flex flex-col gap-4'>
        {sortedTypes.map((type) => {
          const percentage = calculatePercentage(type.count, total);
          return (
            <div key={type.type} className='flex items-center gap-4 rounded-lg border-2 border-c3 bg-c2 p-4 transition-colors hover:bg-c3'>
              <div className='flex-1 min-w-0'>
                <p className='text-c6 text-sm font-medium truncate'>{type.label}</p>
              </div>
              <div className='w-48'>
                <Progress value={percentage} color='primary' size='lg' radius='md' />
              </div>
              <div className='w-20 text-right'>
                <p className='text-c6 text-sm font-bold'>{formatNumber(type.count)}</p>
                <p className='text-c4 text-xs'>{percentage.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

/**
 * Vue Complétude - Affichage par type avec propriétés dynamiques du Resource Template
 */
type CompletenessSortMode = 'completeness' | 'name';

const CompletenessView: React.FC<{ stats: TypeCompleteness[] }> = ({ stats }) => {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<CompletenessSortMode>('completeness');

  const activeStats = useMemo(() => {
    const filtered = stats.filter((type) => type.total > 0);
    if (sortMode === 'completeness') {
      filtered.sort((a, b) => b.overallCompleteness - a.overallCompleteness);
    } else {
      filtered.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    }
    return filtered;
  }, [stats, sortMode]);

  return (
    <>
      <div className='flex items-center gap-2.5 mb-4'>
        <span className='text-c4 text-xs'>Trier par:</span>
        <button
          type='button'
          onClick={() => setSortMode('completeness')}
          className={`cursor-pointer px-2.5 py-1.5 rounded-md text-xs transition-colors ${sortMode === 'completeness' ? 'bg-datavisBlue text-selected' : 'bg-c2 text-c5 hover:bg-c3'}`}>
          Complétude
        </button>
        <button
          type='button'
          onClick={() => setSortMode('name')}
          className={`cursor-pointer px-2.5 py-1.5 rounded-md text-xs transition-colors ${sortMode === 'name' ? 'bg-datavisBlue text-selected' : 'bg-c2 text-c5 hover:bg-c3'}`}>
          Nom
        </button>
      </div>

      <div className='flex flex-col gap-4'>
        {activeStats.map((type) => {
          const isExpanded = expandedType === type.type;
          const properties = Object.entries(type.properties);

          return (
            <div key={type.type} className='overflow-hidden rounded-lg border-2 border-c3 bg-c2'>
              {/* Type Header - Clickable */}
              <button type='button' onClick={() => setExpandedType(isExpanded ? null : type.type)} className='cursor-pointer w-full p-4 flex items-center gap-2.5 hover:bg-c3 transition-colors text-left'>
                <span className='text-c4 text-xs'>{isExpanded ? '▼' : '▶'}</span>
                <div className='flex-1 min-w-0'>
                  <p className='text-c6 text-sm font-medium truncate'>{type.label}</p>
                  <p className='text-c4 text-xs'>
                    {type.total} ressources · {type.templatePropertyCount} propriétés
                  </p>
                </div>
                <div className='w-36 flex items-center gap-8'>
                  <Progress
                    value={type.overallCompleteness}
                    color={type.overallCompleteness >= 70 ? 'success' : type.overallCompleteness >= 40 ? 'warning' : 'danger'}
                    size='lg'
                    radius='md'
                    className='flex-1'
                  />
                  <span className='text-c6 text-xs font-bold w-10 text-right'>{type.overallCompleteness.toFixed(0)}%</span>
                </div>
              </button>

              {/* Expanded Properties */}
              {isExpanded && (
                <div className='border-t border-c3'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-c3'>
                        <th className='text-c4 text-xs font-normal text-left p-4 pl-10'>Propriété</th>
                        <th className='text-c4 text-xs font-normal text-center p-4 w-80'>Rempli</th>
                        <th className='text-c4 text-xs font-normal text-center p-4 w-80'>Manquant</th>
                        <th className='text-c4 text-xs font-normal p-4 w-48'>Complétude</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-c3'>
                      {properties.map(([propName, propData]) => {
                        const color = getCompletenessColor(propData.percentage);
                        return (
                          <tr key={propName} className='hover:bg-c3 transition-colors'>
                            <td className='text-c6 text-xs p-4 pl-10'>
                              {propData.label}
                              <span className='text-c4 text-xs ml-1.5'>({propName})</span>
                            </td>
                            <td className='text-datavisGreen text-xs text-center p-4 font-bold'>{propData.filled}</td>
                            <td className='text-c4 text-xs text-center p-4'>{propData.missing}</td>
                            <td className='p-4'>
                              <div className='flex items-center gap-1.5'>
                                <Progress value={propData.percentage} style={{ '--heroui-primary': color } as React.CSSProperties} size='lg' radius='md' className='flex-1' />
                                <span className='text-c6 text-xs w-10 text-right'>{propData.percentage.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

/**
 * Vue Ressources isolées
 */
const OrphansView: React.FC<{ orphans: OrphanResourcesData }> = ({ orphans }) => {
  // Fonction pour afficher le label du type (gère "unknown" → "Type inconnu")
  const getTypeLabel = (label: string, type: string) => {
    if (type === 'unknown' || label === 'unknown') return 'Type inconnu';
    return label;
  };

  return orphans.byType.length > 0 ? (
        <div className='flex flex-col gap-4'>
          {orphans.byType.map((typeGroup) => (
            <div key={typeGroup.type} className='rounded-lg border-2 border-c3 bg-c2 p-4'>
              <div className='flex items-center justify-between mb-2.5'>
                <span className='text-c6 text-sm font-medium'>{getTypeLabel(typeGroup.label, typeGroup.type)}</span>
                <span className='text-c4 text-xs'>{typeGroup.count} isolées</span>
              </div>
              <div className='flex flex-col gap-8'>
                {typeGroup.items.map((item) => (
                  <div key={item.id} className='bg-c3 rounded-md p-2.5 flex items-center justify-between hover:bg-c4/20 transition-colors'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-c6 text-xs truncate'>{item.title}</p>
                      <p className='text-c4 text-xs'>ID: {item.id}</p>
                    </div>
                    <div className='flex items-center gap-2.5'>
                      <span className='text-orange-500 text-xs'>{item.link_count} conn.</span>
                      <a
                        href={omekaAdminItemUrl(item.id)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='cursor-pointer text-c4 hover:text-datavisBlue transition-colors'
                        title='Ouvrir dans Omeka S'>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='py-8 text-center'>
          <CheckCircle size={32} className='text-datavisGreen mx-auto mb-2.5' />
          <p className='text-c6 font-medium text-sm'>Aucune ressource isolée</p>
        </div>
      );
};

function DashboardDetailModal({
  panel,
  data,
  onClose,
}: {
  panel: DashboardDetailModal | null;
  data: DashboardData;
  onClose: () => void;
}) {
  const meta = panel ? DETAIL_MODAL_META[panel] : DETAIL_MODAL_META.distribution;

  return (
    <Modal
      theme='default'
      backdrop='blur'
      size={meta.size}
      isOpen={panel !== null}
      onClose={onClose}
      scrollBehavior='inside'
      classNames={{ closeButton: modalCloseButtonClasses }}
      motionProps={MODAL_MOTION_PROPS as React.ComponentProps<typeof Modal>['motionProps']}>
      <ModalContent>
        {panel ? (
          <>
            <ModalHeader className='flex flex-col gap-px py-4'>
              <ModalTitle
                title={meta.title}
                subtitle={meta.subtitle}
                icon={meta.icon as React.ComponentType<{ size?: number; className?: string }>}
                iconColor={meta.iconColor}
                iconBg={meta.iconBg}
                titleClassName='text-c6 text-lg font-semibold'
              />
            </ModalHeader>
            <ModalBody className='gap-4 py-4'>
              {panel === 'distribution' && <DistributionView types={data.overview.types} />}
              {panel === 'completeness' && <CompletenessView stats={data.completeness.stats} />}
              {panel === 'orphans' && <OrphansView orphans={data.orphans} />}
            </ModalBody>
          </>
        ) : null}
      </ModalContent>
    </Modal>
  );
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<DashboardDetailModal | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [overview, completeness, orphans, keywords] = await Promise.all([getOverview(), getCompletenessStats(), getOrphanResources(2), getCoverageMatrix(10)]);
        setData({ overview, completeness, orphans, keywords });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <AnalyticsViewHeader
        title='Tableau de bord'
        description='Synthèse du corpus, complétude des métadonnées et ressources isolées.'
        icon={<LayoutDashboard size={18} />}
      />
      <ViewLoader
        isLoading={isLoading}
        error={error}
        isEmpty={!data || data.overview.total === 0}
        icon={<LayoutDashboard />}
        title='Aucune donnée'
        emptyMessage='Aucune donnée disponible dans le tableau de bord.'
        loadingSkeleton={<DashboardViewSkeleton />}>
        <div className='flex h-full w-full flex-1 flex-col overflow-hidden bg-c1'>
          <div className='min-h-0 flex-1 overflow-hidden'>
            {data ? (
              <>
                <OverviewView data={data} onOpenDetail={setDetailModal} />
                <DashboardDetailModal panel={detailModal} data={data} onClose={() => setDetailModal(null)} />
              </>
            ) : null}
          </div>
        </div>
      </ViewLoader>
    </div>
  );
};

export default Dashboard;
