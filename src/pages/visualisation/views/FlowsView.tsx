import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { Select, SelectItem, Button, Tabs, Tab } from '@/theme/components';
import { outlineIconButtonClass } from '@/theme/components/button';
import { X } from 'lucide-react';
import { useRecitsData, type RecitNode, type RecitType } from '../hooks/useRecitsData';
import { TYPE_CONFIG, ALL_TYPES } from '../recitTypeConfig';
import { RecitTypesFilterSelect } from '../components/RecitTypesFilterSelect';

type DimensionKey = 'figures' | 'cadrages' | 'affects' | 'enjeux' | 'promesses' | 'risques';
type FlowMode = 'volume' | 'share';

const DIMENSIONS: { key: DimensionKey; label: string; demonstrative: string; topLabel: string }[] = [
  { key: 'figures', label: "Figures de l'IA", demonstrative: 'cette figure', topLabel: 'figures les plus fréquentes' },
  { key: 'cadrages', label: 'Cadrages', demonstrative: 'ce cadrage', topLabel: 'cadrages les plus fréquents' },
  { key: 'affects', label: 'Affects', demonstrative: 'cet affect', topLabel: 'affects les plus fréquents' },
  { key: 'enjeux', label: 'Enjeux', demonstrative: 'cet enjeu', topLabel: 'enjeux les plus fréquents' },
  { key: 'promesses', label: 'Promesses', demonstrative: 'cette promesse', topLabel: 'promesses les plus fréquentes' },
  { key: 'risques', label: 'Risques', demonstrative: 'ce risque', topLabel: 'risques les plus fréquents' },
];

const OVERVIEW_KEY = '__overview';
const TOP_VALUES = 8;
const VALUE_PALETTE = ['#AFC8FF', '#FFB6C1', '#C8E6C9', '#FFF1B8', '#A9E2DA', '#D7B8FF', '#FFD6A5', '#B8E0FF'];

const FLOWS_CONTROLS_BAR_CLASS =
  'flex items-center gap-3 px-4 py-3 flex-shrink-0 flex-wrap rounded-2xl border-2 border-c3 bg-transparent';

const MODE_TAB_CLASS_NAMES = {
  base: 'w-auto flex-none',
  tabList: 'inline-flex w-auto bg-c2 border-2 border-c3 rounded-xl p-1 gap-1 min-h-11 h-11',
  cursor: 'bg-action rounded-lg shadow-none',
  tab: 'px-3 text-sm text-c5 data-[selected=true]:text-white justify-center rounded-lg',
  tabContent: 'group-data-[selected=true]:text-white text-sm',
  panel: 'hidden p-0 m-0 h-0 min-h-0',
};

interface FlowLayer {
  key: string;
  label: string;
  color: string;
  total: number;
}

interface FlowRow {
  year: number;
  counts: Record<string, number>;
  /** Dénominateur du mode « part » : récits du même type (ou de l'année) */
  totals: Record<string, number>;
}

interface FlowData {
  layers: FlowLayer[];
  rows: FlowRow[];
  recitsByYear: Map<number, RecitNode[]>;
}

interface HoverState {
  year: number;
  x: number;
}

function valueFrequencies(nodes: RecitNode[], dimension: DimensionKey) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const value of new Set(node[dimension])) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value, 'fr'),
  );
}

function groupByYear(nodes: RecitNode[]): Map<number, RecitNode[]> {
  const map = new Map<number, RecitNode[]>();
  for (const node of nodes) {
    if (node.year == null) continue;
    const list = map.get(node.year) ?? [];
    list.push(node);
    map.set(node.year, list);
  }
  return map;
}

/**
 * Valeur choisie → une couche par type de récit (migration entre types).
 * Vue d'ensemble → une couche par valeur parmi les plus fréquentes.
 */
function buildFlowData(
  datedNodes: RecitNode[],
  dimension: DimensionKey,
  value: string | null,
  activeTypes: Set<RecitType>,
): FlowData {
  const years = d3.range(
    d3.min(datedNodes, (n) => n.year!) ?? 0,
    (d3.max(datedNodes, (n) => n.year!) ?? -1) + 1,
  );
  const byYear = groupByYear(datedNodes);

  if (value) {
    const matching = datedNodes.filter((n) => n[dimension].includes(value));
    const layers = ALL_TYPES.filter((t) => activeTypes.has(t)).map((t) => ({
      key: t,
      label: TYPE_CONFIG[t].label,
      color: TYPE_CONFIG[t].color,
      total: matching.filter((n) => n.type === t).length,
    }));
    const rows = years.map((year) => {
      const ofYear = byYear.get(year) ?? [];
      const counts: Record<string, number> = {};
      const totals: Record<string, number> = {};
      for (const layer of layers) {
        const ofType = ofYear.filter((n) => n.type === layer.key);
        totals[layer.key] = ofType.length;
        counts[layer.key] = ofType.filter((n) => n[dimension].includes(value)).length;
      }
      return { year, counts, totals };
    });
    return { layers, rows, recitsByYear: groupByYear(matching) };
  }

  const top = valueFrequencies(datedNodes, dimension).slice(0, TOP_VALUES);
  const topValues = new Set(top.map((t) => t.value));
  const layers = top.map((t, i) => ({
    key: t.value,
    label: t.value,
    color: VALUE_PALETTE[i % VALUE_PALETTE.length],
    total: t.count,
  }));
  const rows = years.map((year) => {
    const ofYear = byYear.get(year) ?? [];
    const counts: Record<string, number> = {};
    const totals: Record<string, number> = {};
    for (const layer of layers) {
      totals[layer.key] = ofYear.length;
      counts[layer.key] = ofYear.filter((n) => n[dimension].includes(layer.key)).length;
    }
    return { year, counts, totals };
  });
  const withTopValue = datedNodes.filter((n) => n[dimension].some((v) => topValues.has(v)));
  return { layers, rows, recitsByYear: groupByYear(withTopValue) };
}

function shareOf(row: FlowRow, key: string): number {
  const total = row.totals[key] ?? 0;
  return total > 0 ? ((row.counts[key] ?? 0) / total) * 100 : 0;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

function FlowChart({
  data,
  mode,
  highlightKey,
  selectedYear,
  onHover,
  onSelectYear,
}: {
  data: FlowData;
  mode: FlowMode;
  highlightKey: string | null;
  selectedYear: number | null;
  onHover: Dispatch<SetStateAction<HoverState | null>>;
  onSelectYear: Dispatch<SetStateAction<number | null>>;
}) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    const { width, height } = size;
    if (!svgEl || width === 0 || height === 0 || data.rows.length < 2) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const margin = { top: 24, right: 28, bottom: 36, left: mode === 'share' ? 48 : 28 };
    const innerW = Math.max(0, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const years = data.rows.map((r) => r.year);
    const x = d3
      .scaleLinear()
      .domain([years[0], years[years.length - 1]])
      .range([0, innerW]);
    const keys = data.layers.map((l) => l.key);
    const colorOf = new Map(data.layers.map((l) => [l.key, l.color]));
    const opacityOf = (key: string, base: number) => (highlightKey && highlightKey !== key ? 0.12 : base);

    if (mode === 'volume') {
      const series = d3
        .stack<FlowRow>()
        .keys(keys)
        .value((row, key) => row.counts[key] ?? 0)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderInsideOut)(data.rows);

      const yMin = d3.min(series, (s) => d3.min(s, (d) => d[0])) ?? 0;
      const yMax = d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 0;
      const y = d3
        .scaleLinear()
        .domain(yMax - yMin > 0 ? [yMin, yMax] : [-1, 1])
        .range([innerH, 0]);

      const area = d3
        .area<d3.SeriesPoint<FlowRow>>()
        .x((d) => x(d.data.year))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(d3.curveMonotoneX);

      g.selectAll('path.flow-layer')
        .data(series)
        .join('path')
        .attr('class', 'flow-layer')
        .attr('d', area)
        .attr('fill', (s) => colorOf.get(s.key) ?? '#888')
        .attr('fill-opacity', (s) => opacityOf(s.key, 0.85))
        .attr('stroke', (s) => colorOf.get(s.key) ?? '#888')
        .attr('stroke-opacity', (s) => opacityOf(s.key, 1))
        .attr('stroke-width', 0.75);
    } else {
      const maxShare = d3.max(data.rows, (r) => d3.max(keys, (k) => shareOf(r, k))) ?? 0;
      const y = d3
        .scaleLinear()
        .domain([0, Math.max(10, Math.ceil(maxShare / 10) * 10)])
        .range([innerH, 0]);

      const yAxis = g
        .append('g')
        .attr('class', 'text-c4')
        .call(
          d3
            .axisLeft(y)
            .ticks(4)
            .tickFormat((d) => `${d}%`)
            .tickSize(-innerW),
        );
      yAxis.select('.domain').remove();
      yAxis.selectAll('.tick line').attr('stroke-opacity', 0.12);
      yAxis.selectAll('text').attr('font-size', 11);

      for (const key of keys) {
        const color = colorOf.get(key) ?? '#888';
        const line = d3
          .line<FlowRow>()
          .x((r) => x(r.year))
          .y((r) => y(shareOf(r, key)))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(data.rows)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', highlightKey === key ? 3 : 2)
          .attr('stroke-opacity', opacityOf(key, 0.95));

        g.selectAll(null)
          .data(data.rows.filter((r) => (r.counts[key] ?? 0) > 0))
          .join('circle')
          .attr('cx', (r) => x(r.year))
          .attr('cy', (r) => y(shareOf(r, key)))
          .attr('r', 3.5)
          .attr('fill', color)
          .attr('fill-opacity', opacityOf(key, 1));
      }
    }

    const step = Math.ceil(years.length / 12);
    const tickYears = years.filter((_, i) => i % step === 0);
    const xAxis = g
      .append('g')
      .attr('class', 'text-c4')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(tickYears)
          .tickFormat((d) => String(d))
          .tickSizeOuter(0),
      );
    xAxis.select('.domain').attr('stroke-opacity', 0.3);
    xAxis.selectAll('.tick line').attr('stroke-opacity', 0.3);
    xAxis.selectAll('text').attr('font-size', 11);

    if (selectedYear != null && selectedYear >= years[0] && selectedYear <= years[years.length - 1]) {
      g.append('line')
        .attr('class', 'text-c6')
        .attr('x1', x(selectedYear))
        .attr('x2', x(selectedYear))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', 'currentColor')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.7);
    }

    const hoverLine = g
      .append('line')
      .attr('class', 'text-c4')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3 3')
      .style('opacity', 0);

    const yearAt = (event: MouseEvent) => {
      const [mx] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      return Math.min(years[years.length - 1], Math.max(years[0], year));
    };

    g.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mousemove', (event: MouseEvent) => {
        const year = yearAt(event);
        hoverLine.attr('x1', x(year)).attr('x2', x(year)).style('opacity', 1);
        onHover({ year, x: margin.left + x(year) });
      })
      .on('mouseleave', () => {
        hoverLine.style('opacity', 0);
        onHover(null);
      })
      .on('click', (event: MouseEvent) => {
        const year = yearAt(event);
        onSelectYear((prev) => (prev === year ? null : year));
      });
  }, [data, mode, highlightKey, selectedYear, size, onHover, onSelectYear]);

  return (
    <div ref={containerRef} className='absolute inset-0'>
      <svg ref={svgRef} width={size.width} height={size.height} />
    </div>
  );
}

function FlowTooltip({
  hover,
  data,
  mode,
  containerWidth,
}: {
  hover: HoverState;
  data: FlowData;
  mode: FlowMode;
  containerWidth: number;
}) {
  const row = data.rows.find((r) => r.year === hover.year);
  if (!row) return null;
  const entries = data.layers
    .map((layer) => ({ layer, count: row.counts[layer.key] ?? 0, total: row.totals[layer.key] ?? 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  const tooltipWidth = 224; // w-56
  const gap = 12;
  const pad = 8;

  // Suit la ligne de lecture : d’abord à droite du curseur, bascule à gauche si débord à droite.
  let transform = `translateX(${gap}px)`;
  if (hover.x + gap + tooltipWidth > containerWidth - pad) {
    transform = `translateX(calc(-100% - ${gap}px))`;
  }

  // Si la variante « à gauche » sort du cadre (bord gauche du graphique), rester collé à la ligne à droite.
  const overflowsLeft =
    transform.includes('-100%') && hover.x - tooltipWidth - gap < pad;
  if (overflowsLeft) {
    transform = `translateX(${gap}px)`;
  }

  return (
    <div
      className='pointer-events-none absolute top-3 z-30 w-56 rounded-xl border-2 border-c3 bg-c2/95 backdrop-blur-sm px-3 py-2.5 shadow-sm'
      style={{ left: hover.x, transform }}>
      <p className='text-sm font-medium text-c6 mb-1.5'>{hover.year}</p>
      {entries.length === 0 ? (
        <p className='text-xs text-c4'>Aucune occurrence</p>
      ) : (
        <ul className='flex flex-col gap-1'>
          {entries.map(({ layer, count, total }) => (
            <li key={layer.key} className='flex items-center gap-2 text-xs'>
              <span className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: layer.color }} />
              <span className='flex-1 min-w-0 truncate text-c5'>{layer.label}</span>
              <span className='text-c6 tabular-nums'>
                {mode === 'share' ? `${Math.round((count / total) * 100)}%` : count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LayerSpan({ data, layerKey }: { data: FlowData; layerKey: string }) {
  const active = data.rows.filter((r) => (r.counts[layerKey] ?? 0) > 0);
  if (active.length === 0) return <span className='text-c4'>absent</span>;
  const peak = active.reduce((best, r) => (r.counts[layerKey] > best.counts[layerKey] ? r : best));
  const first = active[0].year;
  const last = active[active.length - 1].year;
  return (
    <span className='text-c4 tabular-nums'>
      {first === last ? first : `${first} → ${last}`} · pic {peak.year}
    </span>
  );
}

export function FlowsView() {
  const navigate = useNavigate();
  const { nodes, loading, error } = useRecitsData();

  const [dimension, setDimension] = useState<DimensionKey>('figures');
  const [value, setValue] = useState<string | null>(null);
  const [mode, setMode] = useState<FlowMode>('volume');
  const [activeTypes, setActiveTypes] = useState<Set<RecitType>>(() => new Set(ALL_TYPES));
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const { ref: chartBoxRef, size: chartBoxSize } = useElementSize<HTMLDivElement>();

  const scopedNodes = useMemo(() => nodes.filter((n) => activeTypes.has(n.type)), [nodes, activeTypes]);
  const datedNodes = useMemo(() => scopedNodes.filter((n) => n.year != null), [scopedNodes]);
  const undatedCount = scopedNodes.length - datedNodes.length;

  const frequencies = useMemo(() => valueFrequencies(datedNodes, dimension), [datedNodes, dimension]);
  const data = useMemo(
    () => buildFlowData(datedNodes, dimension, value, activeTypes),
    [datedNodes, dimension, value, activeTypes],
  );

  const dimensionMeta = DIMENSIONS.find((d) => d.key === dimension)!;
  const years = data.rows.map((r) => r.year);
  const selectedRecits = selectedYear != null ? (data.recitsByYear.get(selectedYear) ?? []) : [];

  const changeDimension = (next: DimensionKey) => {
    setDimension(next);
    setValue(null);
    setHighlightKey(null);
  };

  const onLegendClick = (key: string) => {
    if (value) {
      const type = key as RecitType;
      const next = new Set(activeTypes);
      if (next.has(type)) {
        if (next.size === 1) return;
        next.delete(type);
      } else {
        next.add(type);
      }
      setActiveTypes(next);
    } else {
      setValue(key);
    }
    setHighlightKey(null);
  };

  if (loading) {
    return (
      <div className='flex flex-1 items-center justify-center text-c4 text-sm'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-c6 mr-3' />
        Chargement des récits…
      </div>
    );
  }

  if (error) {
    return <div className='flex flex-1 items-center justify-center text-c4 text-sm'>Erreur de chargement : {error}</div>;
  }

  return (
    <div className='flex flex-1 flex-col gap-4 min-h-0 overflow-hidden bg-c1'>
      <div className={FLOWS_CONTROLS_BAR_CLASS}>
        <Select
          aria-label='Dimension'
          selectedKeys={[dimension]}
          onSelectionChange={(keys) => {
            const next = Array.from(keys as Set<string>)[0] as DimensionKey | undefined;
            if (next) changeDimension(next);
          }}
          className='w-48'
          classNames={{ trigger: 'rounded-xl' }}>
          {DIMENSIONS.map((d) => (
            <SelectItem key={d.key}>{d.label}</SelectItem>
          ))}
        </Select>

        <Select
          aria-label='Valeur suivie'
          selectedKeys={[value ?? OVERVIEW_KEY]}
          onSelectionChange={(keys) => {
            const next = Array.from(keys as Set<string>)[0];
            if (!next) return;
            setValue(next === OVERVIEW_KEY ? null : next);
            setHighlightKey(null);
          }}
          className='flex-1 min-w-[240px] max-w-md'
          classNames={{ trigger: 'rounded-xl' }}>
          {[
            <SelectItem key={OVERVIEW_KEY} textValue={`Vue d'ensemble — top ${TOP_VALUES}`}>
              Vue d'ensemble — top {TOP_VALUES}
            </SelectItem>,
            ...frequencies.map((f) => (
              <SelectItem key={f.value} textValue={f.value}>
                <span className='flex items-center justify-between gap-3'>
                  <span className='truncate'>{f.value}</span>
                  <span className='text-c4 tabular-nums'>{f.count}</span>
                </span>
              </SelectItem>
            )),
          ]}
        </Select>

        {value && (
          <Button onPress={() => setValue(null)} className={outlineIconButtonClass} aria-label="Revenir à la vue d'ensemble">
            <X size={14} />
          </Button>
        )}

        <RecitTypesFilterSelect activeTypes={activeTypes} onChange={setActiveTypes} />

        <div className='ml-auto'>
          <Tabs
            aria-label='Mode de lecture'
            selectedKey={mode}
            onSelectionChange={(key) => setMode(key as FlowMode)}
            classNames={MODE_TAB_CLASS_NAMES}>
            <Tab key='volume' title='Volume' />
            <Tab key='share' title='Part (%)' />
          </Tabs>
        </div>
      </div>

      <div className='flex flex-1 min-h-0 gap-4'>
        <div className='flex flex-1 min-w-0 flex-col gap-3'>
          <div ref={chartBoxRef} className='relative flex-1 min-h-0 rounded-2xl border-2 border-c3 bg-c1 overflow-hidden'>
            {data.rows.length < 2 || data.layers.length === 0 ? (
              <div className='absolute inset-0 flex items-center justify-center text-c4 text-sm text-center px-6'>
                Pas assez de récits datés pour tracer un flux avec ces filtres.
              </div>
            ) : (
              <>
                <FlowChart
                  data={data}
                  mode={mode}
                  highlightKey={highlightKey}
                  selectedYear={selectedYear}
                  onHover={setHover}
                  onSelectYear={setSelectedYear}
                />
                {hover && <FlowTooltip hover={hover} data={data} mode={mode} containerWidth={chartBoxSize.width} />}
              </>
            )}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {data.layers.map((layer) => (
              <button
                key={layer.key}
                type='button'
                onMouseEnter={() => setHighlightKey(layer.key)}
                onMouseLeave={() => setHighlightKey(null)}
                onClick={() => onLegendClick(layer.key)}
                title={value ? 'Afficher / masquer ce type' : 'Suivre cette valeur entre types de récits'}
                className={`inline-flex items-center gap-2 rounded-xl border-2 border-c3 bg-c2 px-2.5 py-1.5 text-sm hover:bg-c3 transition-colors ${
                  layer.total === 0 ? 'opacity-50' : ''
                }`}>
                <span className='w-2.5 h-2.5 rounded-full shrink-0' style={{ backgroundColor: layer.color }} />
                <span className='text-c6 max-w-[16rem] truncate'>{layer.label}</span>
                <span className='text-c4 tabular-nums'>{layer.total}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className='w-80 shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto rounded-2xl border-2 border-c3 bg-c2/50 p-4'>
          <div className='flex flex-col gap-1.5'>
            <p className='text-xs font-medium text-c4 uppercase tracking-wider'>Lecture</p>
            {value ? (
              <>
                <p className='text-base text-c6 font-medium leading-snug'>{value}</p>
                <p className='text-sm text-c4'>
                  Présence de {dimensionMeta.demonstrative} par type de récit, {years[0]}–{years[years.length - 1]}.
                </p>
              </>
            ) : (
              <p className='text-sm text-c4'>
                Les {TOP_VALUES} {dimensionMeta.topLabel}, {years[0]}–{years[years.length - 1]}.
                Cliquez une valeur dans la légende pour suivre sa migration entre types de récits.
              </p>
            )}
            {undatedCount > 0 && (
              <p className='text-xs text-c4'>
                {undatedCount} récit{undatedCount > 1 ? 's' : ''} sans date exploitable non représenté
                {undatedCount > 1 ? 's' : ''}.
              </p>
            )}
          </div>

          {value && (
            <ul className='flex flex-col gap-1.5'>
              {data.layers.map((layer) => (
                <li key={layer.key} className='flex flex-col gap-0.5 text-sm'>
                  <span className='flex items-center gap-2'>
                    <span className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: layer.color }} />
                    <span className='text-c6'>{TYPE_CONFIG[layer.key as RecitType].short}</span>
                    <span className='ml-auto text-c5 tabular-nums'>{layer.total}</span>
                  </span>
                  <span className='pl-4 text-xs'>
                    <LayerSpan data={data} layerKey={layer.key} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className='flex flex-col gap-2 border-t-2 border-c3 pt-4 min-h-0'>
            {selectedYear == null ? (
              <p className='text-sm text-c4'>Cliquez sur une année du graphique pour lister les récits correspondants.</p>
            ) : (
              <>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-medium text-c6'>
                    {selectedYear} · {selectedRecits.length} récit{selectedRecits.length > 1 ? 's' : ''}
                  </p>
                  <button
                    type='button'
                    className='cursor-pointer text-xs text-c4 hover:text-c6'
                    onClick={() => setSelectedYear(null)}>
                    Effacer
                  </button>
                </div>
                {selectedRecits.length === 0 ? (
                  <p className='text-sm text-c4'>Aucun récit pour cette année.</p>
                ) : (
                  <ul className='flex flex-col gap-1'>
                    {selectedRecits.map((recit) => (
                      <li key={recit.id}>
                        <button
                          type='button'
                          onClick={() => navigate(recit.url)}
                          className='w-full flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-c3 transition-colors'>
                          <span
                            className='mt-1.5 w-2 h-2 rounded-full shrink-0'
                            style={{ backgroundColor: TYPE_CONFIG[recit.type].color }}
                          />
                          <span className='flex flex-col min-w-0'>
                            <span className='text-sm text-c6 line-clamp-2 leading-snug'>{recit.title}</span>
                            <span className='text-xs text-c4'>{TYPE_CONFIG[recit.type].short}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
