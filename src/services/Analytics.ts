/**
 * Service pour l'API Analytics
 * Endpoints optimisés pour les visualisations analytiques (heatmaps, trends, coverage)
 */

import { edisemHelperAjaxUrl, omekaSiteMediaUrl, parseFetchJsonLoose } from '@/utils/omekaApi';

async function readAnalyticsJson<T>(response: Response): Promise<T> {
  return (await parseFetchJsonLoose(response)) as T;
}

const analyticsUrl = (params: Record<string, string | number | undefined>) =>
  edisemHelperAjaxUrl('Analytics', { json: '1', ...params });

// ========== TYPES ==========

/**
 * Vue d'ensemble - comptages par type
 */
export interface TypeCount {
  type: string;
  label: string;
  count: number;
  templateId: number;
}

export interface OverviewData {
  types: TypeCount[];
  total: number;
  generatedAt: string;
}

/**
 * Activité par jour (heatmap calendrier)
 */
export interface DayActivity {
  date: string;
  count: number;
  weekday: number; // 0=dimanche
  week: number;
}

export interface ActivityByDayData {
  year: number;
  days: DayActivity[];
  stats: {
    totalActivity: number;
    activeDays: number;
    maxDailyActivity: number;
    avgDailyActivity: number;
  };
}

/**
 * Tendances des keywords
 */
export interface KeywordInfo {
  id: number;
  title: string;
  key: string;
  total?: number;
}

export interface KeywordTrendPoint {
  year: number;
  [key: string]: number; // kw_123: count
}

export interface KeywordTrendsData {
  keywords: KeywordInfo[];
  timeline: KeywordTrendPoint[];
}

/**
 * Timeline des ressources
 */
export interface TimelineItem {
  id: number;
  title: string;
  created: string;
  template_id: number;
  type: string;
  label: string;
}

export interface TimelineData {
  items: TimelineItem[];
  count: number;
}

/**
 * Matrice de couverture
 */
export interface KeywordUsage {
  keyword_id: string;
  keyword_title: string;
  usage_count: number;
}

export interface TypeCoverage {
  type: string;
  label: string;
  keywords: Record<string, number>; // keywordId -> count
}

export interface CoverageGap {
  type: string;
  typeLabel: string;
  keywordId: string;
  keywordTitle: string;
}

export interface CoverageMatrixData {
  matrix: TypeCoverage[];
  keywords: KeywordUsage[];
  types: string[];
  gaps: CoverageGap[];
  gapCount: number;
}

/**
 * Ressources orphelines
 */
export interface OrphanResource {
  id: number;
  title: string;
  template_id: number;
  created: string;
  link_count: number;
  type: string;
  label: string;
}

export interface OrphansByType {
  type: string;
  label: string;
  count: number;
  items: OrphanResource[];
}

export interface OrphanResourcesData {
  threshold: number;
  totalOrphans: number;
  byType: OrphansByType[];
  items: OrphanResource[];
}

/**
 * Complétude des métadonnées
 * Basée sur les propriétés définies dans le Resource Template de chaque type
 */
export interface PropertyCompleteness {
  id: number;
  label: string;
  required: boolean;
  filled: number;
  missing: number;
  percentage: number;
}

export interface TypeCompleteness {
  type: string;
  label: string;
  total: number;
  templatePropertyCount: number;
  properties: Record<string, PropertyCompleteness>;
  overallCompleteness: number;
  requiredCompleteness: number;
}

export interface CompletenessStatsData {
  stats: TypeCompleteness[];
}

/**
 * Relations entre types (chord diagram)
 */
export interface TypeNode {
  id: string;
  label: string;
}

export interface TypeLink {
  source: string;
  target: string;
  value: number;
}

export interface TypeRelationsData {
  nodes: TypeNode[];
  links: TypeLink[];
}

/**
 * Co-occurrence des keywords
 */
export interface KeywordNode {
  id: number;
  label: string;
  value: number;
}

export interface KeywordLink {
  source: number;
  target: number;
  value: number;
}

export interface KeywordCooccurrenceData {
  nodes: KeywordNode[];
  links: KeywordLink[];
}

/**
 * Métriques des actants
 */
export interface ActantMetric {
  id: number;
  name: string;
  intervention_count: number;
  keyword_diversity: number;
  picture: string | null;
}

export interface ActantMetricsData {
  actants: ActantMetric[];
  count: number;
}

/**
 * Réseau de collaboration
 */
export interface CollaborationNode {
  id: number;
  name: string;
  picture: string | null;
}

export interface CollaborationLink {
  source: number;
  target: number;
  value: number;
}

export interface CollaborationNetworkData {
  nodes: CollaborationNode[];
  links: CollaborationLink[];
}

// ========== FONCTIONS API ==========

/**
 * Récupère la vue d'ensemble (comptages par type)
 */
export async function getOverview(): Promise<OverviewData> {
  const response = await fetch(analyticsUrl({ action: 'getOverview' }));
  if (!response.ok) {
    throw new Error("Erreur lors de la récupération de la vue d'ensemble");
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère l'activité par jour pour une année (heatmap calendrier)
 */
export async function getActivityByDay(year?: number): Promise<ActivityByDayData> {
  const response = await fetch(analyticsUrl({ action: 'getActivityByDay', ...(year ? { year } : {}) }));
  if (!response.ok) {
    throw new Error("Erreur lors de la récupération de l'activité");
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les tendances des keywords dans le temps
 */
export async function getKeywordTrends(limit?: number): Promise<KeywordTrendsData> {
  const response = await fetch(analyticsUrl({ action: 'getKeywordTrends', ...(limit ? { limit } : {}) }));
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des tendances');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère la timeline des ressources
 */
export async function getTimeline(types?: string[]): Promise<TimelineData> {
  const response = await fetch(
    analyticsUrl({ action: 'getTimeline', ...(types ? { types: types.join(',') } : {}) }),
  );
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de la timeline');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère la matrice de couverture Types × Keywords
 */
export async function getCoverageMatrix(topKeywords?: number): Promise<CoverageMatrixData> {
  const response = await fetch(
    analyticsUrl({ action: 'getCoverageMatrix', ...(topKeywords ? { topKeywords } : {}) }),
  );
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de la matrice de couverture');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les ressources orphelines (peu connectées)
 */
export async function getOrphanResources(threshold?: number): Promise<OrphanResourcesData> {
  const response = await fetch(
    analyticsUrl({ action: 'getOrphanResources', ...(threshold ? { threshold } : {}) }),
  );
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des ressources orphelines');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les statistiques de complétude des métadonnées
 */
export async function getCompletenessStats(): Promise<CompletenessStatsData> {
  const response = await fetch(analyticsUrl({ action: 'getCompletenessStats' }));
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des statistiques de complétude');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les relations entre types (pour chord diagram)
 */
export async function getTypeRelations(): Promise<TypeRelationsData> {
  const response = await fetch(analyticsUrl({ action: 'getTypeRelations' }));
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des relations entre types');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les co-occurrences de keywords
 */
export async function getKeywordCooccurrence(limit?: number, minOccurrence?: number): Promise<KeywordCooccurrenceData> {
  const response = await fetch(
    analyticsUrl({
      action: 'getKeywordCooccurrence',
      ...(limit ? { limit } : {}),
      ...(minOccurrence ? { minOccurrence } : {}),
    }),
  );
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des co-occurrences');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les métriques des actants
 */
export async function getActantMetrics(limit?: number): Promise<ActantMetricsData> {
  const response = await fetch(analyticsUrl({ action: 'getActantMetrics', ...(limit ? { limit } : {}) }));
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des métriques actants');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère le réseau de collaboration entre actants
 */
export async function getCollaborationNetwork(minCollabs?: number): Promise<CollaborationNetworkData> {
  const response = await fetch(
    analyticsUrl({ action: 'getCollaborationNetwork', ...(minCollabs ? { minCollabs } : {}) }),
  );
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du réseau de collaboration');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les keywords spécifiques à un type de ressource
 */
export interface TypeKeywordsData {
  type: string;
  label: string;
  totalResources: number;
  resourcesWithKeywords: number;
  coveragePercentage: number;
  keywords: Array<{
    id: number;
    title: string;
    count: number;
  }>;
}

export async function getKeywordsByType(type: string): Promise<TypeKeywordsData> {
  const response = await fetch(analyticsUrl({ action: 'getKeywordsByType', type }));
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des keywords par type');
  }
  return readAnalyticsJson(response);
}

/**
 * Récupère les statistiques de couverture par type
 */
export interface TypeCoverageStats {
  type: string;
  label: string;
  totalResources: number;
  resourcesWithTopKeywords: number;
  coveragePercentage: number;
}

export interface CoverageStatsData {
  stats: TypeCoverageStats[];
  topKeywordsCount: number;
}

export async function getCoverageStats(topKeywords?: number): Promise<CoverageStatsData> {
  const response = await fetch(
    analyticsUrl({ action: 'getCoverageStats', ...(topKeywords ? { topKeywords } : {}) }),
  );
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des statistiques de couverture');
  }
  return readAnalyticsJson(response);
}

// ========== HELPER FUNCTIONS ==========

/**
 * Préfixe une URL de média avec le domaine
 */
export function getFullMediaUrl(relativePath: string | null): string | null {
  return omekaSiteMediaUrl(relativePath);
}

/**
 * Années disponibles pour l'analyse
 */
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  // Retourner les 5 dernières années par défaut
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
}

// ========== NARRATIVE STATISTICS ==========

/**
 * Get comprehensive stats for narrative practices page
 * @returns {Promise<{recits: number, experimentations: number, recitsByType: object}>}
 */
export async function getNarrativePracticesStats(): Promise<{
  recits: number;
  experimentations: number;
  recitsByType: Record<string, number>;
}> {
  const response = await fetch(analyticsUrl({ action: 'getNarrativePracticesStats' }));
  if (!response.ok) {
    console.error('Error fetching narrative practices stats');
    return { recits: 0, experimentations: 0, recitsByType: {} };
  }
  return readAnalyticsJson(response);
}

/**
 * Get top keywords for narrative practices
 * @param limit - Maximum number of keywords to return
 * @returns {Promise<Array<{label: string, value: number}>>}
 */
export async function getNarrativeTopKeywords(limit: number = 8): Promise<Array<{
  label: string;
  value: number;
}>> {
  const response = await fetch(analyticsUrl({ action: 'getTopNarrativeKeywords', limit }));
  if (!response.ok) {
    console.error('Error fetching narrative top keywords');
    return [];
  }
  return readAnalyticsJson(response);
}

/**
 * Get detailed breakdown of recits by type with counts
 * @returns {Promise<Array<{type: string, count: number}>>}
 */
export async function getRecitTypeBreakdown(): Promise<Array<{
  type: string;
  count: number;
}>> {
  const response = await fetch(analyticsUrl({ action: 'getRecitTypeBreakdown' }));
  if (!response.ok) {
    console.error('Error fetching recit type breakdown');
    return [];
  }
  return readAnalyticsJson(response);
}
