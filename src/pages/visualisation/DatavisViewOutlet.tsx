import { lazy, Suspense } from 'react';

import { RouteSuspenseFallback } from '@/components/layout/RouteSuspenseFallback';
import type { FilterGroup, NodePosition } from '@/components/features/pages/visualisation/FilterPopup';
import type { DatavisView } from '@/config/datavisViews';

const LazyCahiersView = lazy(() =>
  import('./components/CahiersView').then((m) => ({ default: m.CahiersView })),
);
const LazyNetworkView = lazy(() =>
  import('./views/NetworkView').then((m) => ({ default: m.NetworkView })),
);
const LazyFlowsView = lazy(() => import('./views/FlowsView').then((m) => ({ default: m.FlowsView })));
const LazyQuestionsGuideView = lazy(() =>
  import('./views/QuestionsGuideView').then((m) => ({ default: m.QuestionsGuideView })),
);
const LazySemanticMapView = lazy(() =>
  import('./views/SemanticMapView').then((m) => ({ default: m.SemanticMapView })),
);
const LazyCorpusLabView = lazy(() =>
  import('./views/CorpusLabView').then((m) => ({ default: m.CorpusLabView })),
);
const LazyCoverageMatrix = lazy(() =>
  import('./components/analytics/CoverageMatrix').then((m) => ({ default: m.CoverageMatrix })),
);
const LazyActivityHeatmap = lazy(() =>
  import('./components/analytics/ActivityHeatmap').then((m) => ({ default: m.ActivityHeatmap })),
);
const LazyDashboard = lazy(() => import('./components/analytics/Dashboard'));

export interface DatavisViewOutletProps {
  activeView: DatavisView;
  cahiers: { onSelectConfig: (filters: FilterGroup[], nodePositions?: NodePosition[]) => void };
  network: {
    isCanvasExpanded: boolean;
    onToggleCanvasExpanded: () => void;
  };
  coverageMatrix: {
    topKeywordsCount: number;
    onTopKeywordsCountChange: (count: number) => void;
  };
  activityHeatmap: { selectedYear: number };
}

export function DatavisViewOutlet({
  activeView,
  cahiers,
  network,
  coverageMatrix,
  activityHeatmap,
}: DatavisViewOutletProps) {
  let content: React.ReactNode = null;

  switch (activeView) {
    case 'cahiers':
      content = <LazyCahiersView onSelectConfig={cahiers.onSelectConfig} />;
      break;
    case 'network':
      content = (
        <LazyNetworkView
          isCanvasExpanded={network.isCanvasExpanded}
          onToggleCanvasExpanded={network.onToggleCanvasExpanded}
        />
      );
      break;
    case 'flows':
      content = <LazyFlowsView />;
      break;
    case 'questionsGuide':
      content = <LazyQuestionsGuideView />;
      break;
    case 'semanticMap':
      content = <LazySemanticMapView />;
      break;
    case 'corpusLab':
      content = <LazyCorpusLabView />;
      break;
    case 'coverageMatrix':
      content = (
        <LazyCoverageMatrix
          topKeywordsCount={coverageMatrix.topKeywordsCount}
          onTopKeywordsCountChange={coverageMatrix.onTopKeywordsCountChange}
        />
      );
      break;
    case 'activityHeatmap':
      content = <LazyActivityHeatmap selectedYear={activityHeatmap.selectedYear} />;
      break;
    case 'dashboard':
      content = <LazyDashboard />;
      break;
    default:
      return null;
  }

  return (
    <Suspense fallback={<RouteSuspenseFallback label='Chargement de la vue…' />}>
      {content}
    </Suspense>
  );
}
