export type DatavisView =
  | 'datavis'
  | 'cahiers'
  | 'coverageMatrix'
  | 'activityHeatmap'
  | 'dashboard'
  | 'network'
  | 'flows';

const VALID_VIEWS: DatavisView[] = [
  'datavis',
  'cahiers',
  'coverageMatrix',
  'activityHeatmap',
  'dashboard',
  'network',
  'flows',
];

export function parseDatavisView(param: string | null): DatavisView {
  if (param && (VALID_VIEWS as string[]).includes(param)) {
    return param as DatavisView;
  }
  return 'datavis';
}

/** Chemin + query pour une vue (préserve les autres paramètres si fournis). */
export function buildDatavisViewSearchParams(
  view: DatavisView,
  current?: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(current ?? undefined);
  if (view === 'datavis') next.delete('view');
  else next.set('view', view);
  return next;
}

export function datavisViewPath(view: DatavisView, current?: URLSearchParams): string {
  const params = buildDatavisViewSearchParams(view, current);
  const qs = params.toString();
  return qs ? `/visualisation?${qs}` : '/visualisation';
}
