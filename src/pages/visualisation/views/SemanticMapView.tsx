import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { Checkbox, Tabs, Tab } from '@/theme/components';
import { Map as MapIcon, RotateCcw } from 'lucide-react';

import { AnalyticsViewHeader } from '../components/analytics/AnalyticsViewHeader';
import { DatavisCorpusLoading } from '@/components/features/pages/visualisation/DatavisCorpusLoading';
import { useRecitsData, type RecitType } from '../hooks/useRecitsData';
import { TYPE_CONFIG, ALL_TYPES } from '../recitTypeConfig';
import { RecitTypesFilterSelect } from '../components/RecitTypesFilterSelect';
import {
  embedRecitsSemantic,
  type EmbeddingMethod,
  type SemanticPoint,
} from '../utils/recitSemanticEmbedding';

const CONTROLS_BAR_CLASS =
  'flex items-center gap-3 px-4 py-3 flex-shrink-0 flex-wrap rounded-2xl border-2 border-c3 bg-transparent';

const MODE_TAB_CLASS_NAMES = {
  base: 'w-auto flex-none',
  tabList: 'inline-flex w-auto bg-c2 border-2 border-c3 rounded-xl p-1 gap-1 min-h-11 h-11',
  cursor: 'bg-action rounded-lg shadow-none',
  tab: 'px-3 text-sm text-c5 data-[selected=true]:text-white justify-center rounded-lg',
  tabContent: 'group-data-[selected=true]:text-white text-sm',
  panel: 'hidden p-0 m-0 h-0 min-h-0',
};

function hullPath(points: SemanticPoint[]): string | null {
  if (points.length < 3) return null;
  const hull = d3.polygonHull(points.map((p) => [p.x, p.y] as [number, number]));
  if (!hull) return null;
  return d3.line()(hull) ?? null;
}

/** Même cadrage que au chargement : centre le nuage dans le viewport SVG. */
function fitZoomTransform(
  width: number,
  height: number,
  points: SemanticPoint[],
): d3.ZoomTransform {
  const xExtent = d3.extent(points, (p) => p.x) as [number, number];
  const yExtent = d3.extent(points, (p) => p.y) as [number, number];
  const dx = xExtent[1] - xExtent[0] || 1;
  const dy = yExtent[1] - yExtent[0] || 1;
  const scale = Math.min((width * 0.85) / dx, (height * 0.85) / dy);
  const tx = width / 2 - (scale * (xExtent[0] + xExtent[1])) / 2;
  const ty = height / 2 - (scale * (yExtent[0] + yExtent[1])) / 2;
  return d3.zoomIdentity.translate(tx, ty).scale(scale);
}

export const SemanticMapView: React.FC = () => {
  const navigate = useNavigate();
  const { nodes, loading, error } = useRecitsData(1);
  const [activeTypes, setActiveTypes] = useState<Set<RecitType>>(() => new Set(ALL_TYPES));
  const [method, setMethod] = useState<EmbeddingMethod>('mds');
  const [dimensions, setDimensions] = useState<'2' | '3'>('2');
  const [showHulls, setShowHulls] = useState(true);
  const [hoverId, setHoverId] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const filteredNodes = useMemo(
    () => nodes.filter((n) => activeTypes.has(n.type)),
    [nodes, activeTypes],
  );

  const points = useMemo(
    () => embedRecitsSemantic(filteredNodes, method, dimensions === '3' ? 3 : 2),
    [filteredNodes, method, dimensions],
  );

  const pointsByType = useMemo(() => {
    const map = new globalThis.Map<RecitType, SemanticPoint[]>();
    for (const t of ALL_TYPES) map.set(t, []);
    for (const p of points) {
      map.get(p.node.type)?.push(p);
    }
    return map;
  }, [points]);

  const hoverPoint = useMemo(
    () => (hoverId != null ? points.find((p) => p.id === hoverId) ?? null : null),
    [hoverId, points],
  );

  const resetZoom = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current || points.length === 0) return;
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    const fit = fitZoomTransform(width, height, points);
    d3.select(svg).transition().duration(400).call(zoomRef.current.transform, fit);
  }, [points]);

  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g || points.length === 0) return;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;

    const zExtent = d3.extent(points, (p) => p.z) as [number, number];
    const zSpan = zExtent[1] - zExtent[0] || 1;

    const gSel = d3.select(g);
    gSel.selectAll('*').remove();

    if (showHulls) {
      for (const type of ALL_TYPES) {
        const typed = pointsByType.get(type) ?? [];
        const path = hullPath(typed);
        if (!path) continue;
        gSel
          .append('path')
          .attr('d', path)
          .attr('fill', TYPE_CONFIG[type].color)
          .attr('fill-opacity', 0.12)
          .attr('stroke', TYPE_CONFIG[type].color)
          .attr('stroke-opacity', 0.45)
          .attr('stroke-width', 1.5)
          .attr('pointer-events', 'none');
      }
    }

    const nodeG = gSel
      .selectAll<SVGGElement, SemanticPoint>('g.node')
      .data(points, (d) => d.id)
      .join('g')
      .attr('class', 'node cursor-pointer')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    nodeG
      .append('circle')
      .attr('r', (d) => {
        if (dimensions === '2') return 9;
        const t = (d.z - zExtent[0]) / zSpan;
        return 6 + t * 8;
      })
      .attr('fill', (d) => TYPE_CONFIG[d.node.type].color)
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.92)
      .on('mouseenter', (_ev, d) => setHoverId(d.id))
      .on('mouseleave', () => setHoverId(null))
      .on('click', (_ev, d) => navigate(d.node.url))
      .on('dblclick', (ev, d) => {
        ev.stopPropagation();
        navigate(d.node.url);
      });

    nodeG
      .append('title')
      .text((d) => `${d.node.title}\n(${TYPE_CONFIG[d.node.type].label})`);

    if (!zoomRef.current) {
      zoomRef.current = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.25, 6])
        .on('zoom', (event) => {
          d3.select(g).attr('transform', event.transform);
        });
      d3.select(svg).call(zoomRef.current);
    }

    d3.select(svg).call(zoomRef.current.transform, fitZoomTransform(width, height, points));
  }, [points, pointsByType, showHulls, dimensions, navigate]);

  useEffect(() => {
    const g = gRef.current;
    if (!g) return;
    d3.select(g)
      .selectAll<SVGGElement, SemanticPoint>('g.node')
      .select('circle')
      .attr('opacity', (d) => (hoverId != null && hoverId !== d.id ? 0.45 : 0.92));
  }, [hoverId]);

  if (loading) {
    return <DatavisCorpusLoading label='Chargement des récits…' hint='Projection sémantique Imaginaire IA' />;
  }

  if (error) {
    return (
      <div className='flex flex-1 items-center justify-center p-6 text-sm text-red-400'>
        Erreur : {error}
      </div>
    );
  }

  if (filteredNodes.length < 3) {
    return (
      <div className='flex flex-1 items-center justify-center p-6 text-sm text-c4'>
        Il faut au moins 3 récits (filtres types) pour projeter la carte.
      </div>
    );
  }

  return (
    <div className='flex flex-1 min-h-0 flex-col gap-4 overflow-hidden'>
      <AnalyticsViewHeader
        title='Carte sémantique (expérimentale)'
        description={
          method === 'mds'
            ? 'MDS sur distances Imaginaire (6 dimensions partagées). Proche = imaginaires similaires.'
            : 'PCA sur vecteurs binaires (figures, enjeux, cadrages, promesses, risques, affects).'
        }
        icon={<MapIcon size={20} className='text-datavisBlue' />}
      />

      <div className={CONTROLS_BAR_CLASS}>
        <RecitTypesFilterSelect activeTypes={activeTypes} onChange={setActiveTypes} />

        <Tabs
          aria-label='Méthode de projection'
          selectedKey={method}
          onSelectionChange={(k) => setMethod(k as EmbeddingMethod)}
          classNames={MODE_TAB_CLASS_NAMES}>
          <Tab key='mds' title='MDS (proximité)' />
          <Tab key='pca' title='PCA (termes)' />
        </Tabs>

        <Tabs
          aria-label='Dimensions'
          selectedKey={dimensions}
          onSelectionChange={(k) => setDimensions(k as '2' | '3')}
          classNames={MODE_TAB_CLASS_NAMES}>
          <Tab key='2' title='2D' />
          <Tab key='3' title='3D → taille' />
        </Tabs>

        <Checkbox isSelected={showHulls} onValueChange={setShowHulls} size='sm'>
          <span className='text-sm text-c5'>Enveloppes par type</span>
        </Checkbox>

        <button
          type='button'
          onClick={resetZoom}
          className='inline-flex items-center gap-1.5 rounded-lg border-2 border-c3 px-3 py-1.5 text-sm text-c6 hover:bg-c3 transition-colors'>
          <RotateCcw size={14} />
          Recentrer
        </button>
      </div>

      <div className='relative min-h-0 flex-1 rounded-2xl border-2 border-c3 bg-c2 overflow-hidden'>
        <svg ref={svgRef} className='h-full w-full touch-none' aria-label='Carte sémantique des récits'>
          <g ref={gRef} />
        </svg>

        {hoverPoint ? (
          <div className='pointer-events-none absolute left-4 top-4 max-w-sm rounded-xl border-2 border-c3 bg-c1/95 p-3 shadow-lg backdrop-blur-sm'>
            <p className='text-sm font-semibold text-c6 leading-snug'>{hoverPoint.node.title}</p>
            <p className='text-xs text-c4 mt-1'>{TYPE_CONFIG[hoverPoint.node.type].label}</p>
            <p className='text-xs text-c5 mt-2'>
              Clic → fiche récit · molette = zoom · glisser = pan
            </p>
          </div>
        ) : null}

        <div className='absolute bottom-3 right-3 flex flex-wrap gap-2'>
          {ALL_TYPES.filter((t) => activeTypes.has(t)).map((t) => (
            <span
              key={t}
              className='inline-flex items-center gap-1.5 rounded-md border border-c3 bg-c1/90 px-2 py-1 text-xs text-c6'>
              <span className='h-2 w-2 rounded-full' style={{ background: TYPE_CONFIG[t].color }} />
              {TYPE_CONFIG[t].short}
            </span>
          ))}
        </div>
      </div>

      <p className='text-xs text-c4 shrink-0'>
        {points.length} récits projetés · UMAP/t-SNE pourra remplacer MDS/PCA si on ajoute une lib dédiée.
      </p>
    </div>
  );
};
