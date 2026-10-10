import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { Select, SelectItem, Button, Tooltip, Tabs, Tab } from '@/theme/components';
import { outlineIconButtonClass } from '@/theme/components/button';
import { Network, Search, ArrowLeft, X, Maximize, Minimize } from 'lucide-react';
import {
  useRecitsData,
  computeProximityLinks,
  type RecitNode,
  type RecitType,
  type ProximityLink,
} from '../hooks/useRecitsData';
import { TYPE_CONFIG, ALL_TYPES } from '../recitTypeConfig';
import { RecitTypesFilterSelect } from '../components/RecitTypesFilterSelect';

// PNG public disponibles — une bulle différente par type de récit
const TYPE_BUBBLE: Record<RecitType, string> = {
  recit_citoyen:           '/bulle-collection.png',
  recit_mediatique:        '/bulle-mediagraphie.png',
  recit_scientifique:      '/bulle-university.png',
  recit_artistique:        '/bulle-actant.png',
  recit_techno_industriel: '/bulle-conference.png',
};
/** Onglets compacts (seuil proximité) — même langage que modales, hauteur alignée selects */
const PROXIMITY_TAB_CLASS_NAMES = {
  base: 'w-auto flex-none',
  tabList: 'inline-flex w-auto bg-c2 border-2 border-c3 rounded-xl p-1 gap-1 min-h-11 h-11',
  cursor: 'bg-action rounded-lg shadow-none',
  tab: 'min-w-9 px-2 text-sm text-c5 data-[selected=true]:text-white justify-center rounded-lg',
  tabContent: 'group-data-[selected=true]:text-white text-sm',
  panel: 'hidden p-0 m-0 h-0 min-h-0',
};

/** Bandeau de contrôles : contour unique, fond page visible à l’intérieur */
const NETWORK_CONTROLS_BAR_CLASS =
  'flex items-center gap-3 px-4 py-3 flex-shrink-0 flex-wrap rounded-2xl border-2 border-c3 bg-transparent';

const CANVAS_TOP_FADE_CLASS = 'bg-gradient-to-b from-c1 via-c1/70 to-transparent';
const CANVAS_BOTTOM_FADE_CLASS = 'bg-gradient-to-t from-c1 via-c1/70 to-transparent';
const CANVAS_LEFT_FADE_CLASS = 'bg-gradient-to-r from-c1 via-c1/70 to-transparent';
const CANVAS_RIGHT_FADE_CLASS = 'bg-gradient-to-l from-c1 via-c1/70 to-transparent';

const NETWORK_STATS_PILL_CLASS =
  'inline-flex max-w-[min(100%,40rem)] flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-xl border-2 border-c3 bg-c2/95 backdrop-blur-sm px-4 py-2.5 text-sm shadow-sm';

interface NetworkViewProps {
  isCanvasExpanded?: boolean;
  onToggleCanvasExpanded?: () => void;
}

function useCanvasViewportTop(isCanvasExpanded: boolean, layoutKey: string) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [fixedTop, setFixedTop] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!isCanvasExpanded) {
      setFixedTop(undefined);
      return;
    }

    const measure = () => {
      const top = anchorRef.current?.getBoundingClientRect().top;
      if (top != null && top >= 0) setFixedTop(top);
    };

    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const anchor = anchorRef.current;
    if (anchor) {
      ro?.observe(anchor);
      if (anchor.parentElement) ro?.observe(anchor.parentElement);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [isCanvasExpanded, layoutKey]);

  return { anchorRef, fixedTop };
}

function NetworkCanvasShell({
  isCanvasExpanded,
  fixedTop,
  onToggleCanvasExpanded,
  bottomHint,
  bottomOverlay,
  children,
}: {
  isCanvasExpanded?: boolean;
  fixedTop?: number;
  onToggleCanvasExpanded?: () => void;
  bottomHint?: string;
  bottomOverlay?: ReactNode;
  children: ReactNode;
}) {
  const showBottomChrome = Boolean(bottomHint || bottomOverlay || onToggleCanvasExpanded);
  const isFixedExpanded = Boolean(isCanvasExpanded && fixedTop != null);

  return (
    <div
      className={`overflow-hidden bg-c1 z-[25] ${
        isFixedExpanded ? 'fixed left-0 right-0 bottom-0' : 'relative flex-1 min-h-0'
      }`}
      style={isFixedExpanded ? { top: fixedTop } : undefined}>
      <div className='absolute inset-0 flex min-h-0 flex-col overflow-hidden'>{children}</div>

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-[45] px-4 pb-10 pt-4 ${CANVAS_TOP_FADE_CLASS}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-[45] w-12 sm:w-16 py-4 pl-4 pr-8 ${CANVAS_LEFT_FADE_CLASS}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-[45] w-12 sm:w-16 py-4 pr-4 pl-8 ${CANVAS_RIGHT_FADE_CLASS}`}
        aria-hidden
      />

      {showBottomChrome && (
        <div className={`absolute inset-x-0 bottom-0 z-[45] pointer-events-none pb-4 px-4 pt-10 ${CANVAS_BOTTOM_FADE_CLASS}`}>
          {bottomOverlay && <div className='flex w-full flex-col items-center'>{bottomOverlay}</div>}
          {bottomHint && (
            <div className={`flex justify-center ${onToggleCanvasExpanded ? 'pr-14 sm:pr-0' : ''}`}>
              <p className='text-c4 text-xs text-center px-3 py-1.5 rounded-xl border border-c3 bg-c2/90 backdrop-blur-sm shadow-sm'>
                {bottomHint}
              </p>
            </div>
          )}
          {onToggleCanvasExpanded && (
            <button
              type='button'
              className={`pointer-events-auto absolute bottom-4 right-4 z-[50] ${outlineIconButtonClass}`}
              onClick={onToggleCanvasExpanded}
              title={isCanvasExpanded ? 'Réduire le canvas' : 'Agrandir le canvas'}
              aria-label={isCanvasExpanded ? 'Réduire le canvas' : 'Agrandir le canvas'}>
              {isCanvasExpanded ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NetworkGraphArea({
  isCanvasExpanded,
  onToggleCanvasExpanded,
  layoutKey,
  bottomHint,
  bottomOverlay,
  children,
}: {
  isCanvasExpanded?: boolean;
  onToggleCanvasExpanded?: () => void;
  layoutKey: string;
  bottomHint?: string;
  bottomOverlay?: ReactNode;
  children: ReactNode;
}) {
  const { anchorRef, fixedTop } = useCanvasViewportTop(Boolean(isCanvasExpanded), layoutKey);
  const isFixedExpanded = Boolean(isCanvasExpanded && fixedTop != null);

  return (
    <div className={`relative flex min-h-0 flex-col ${isFixedExpanded ? 'flex-1 w-full' : 'flex-1'}`}>
      <div ref={anchorRef} className='h-0 w-full shrink-0' aria-hidden />
      {isFixedExpanded && (
        <div
          className='w-full flex-1 min-h-[12rem] shrink-0'
          style={{ minHeight: `max(12rem, calc(100vh - ${fixedTop}px))` }}
          aria-hidden
        />
      )}
      <NetworkCanvasShell
        isCanvasExpanded={isCanvasExpanded}
        fixedTop={fixedTop}
        onToggleCanvasExpanded={onToggleCanvasExpanded}
        bottomHint={bottomHint}
        bottomOverlay={bottomOverlay}>
        {children}
      </NetworkCanvasShell>
    </div>
  );
}

/** Hauteur alignée boutons contour / selects (44px) */
const NETWORK_BAR_CONTROL_HEIGHT_CLASS = 'min-h-11 h-11';

const RECIT_SEARCH_INPUT_CLASS = `${NETWORK_BAR_CONTROL_HEIGHT_CLASS} w-full pl-9 pr-4 py-0 bg-c2 border-2 border-c3 rounded-xl text-c6 text-sm placeholder:text-c4 focus:outline-none focus:border-c4 transition`;

const FOCAL_RECIT_SEARCH_TRIGGER_CLASS = `flex flex-1 min-w-0 w-full items-center gap-2 pl-9 pr-3 ${NETWORK_BAR_CONTROL_HEIGHT_CLASS} rounded-xl border-2 border-c3 bg-c2 overflow-hidden text-left cursor-pointer hover:bg-c3 transition-colors duration-200 focus:outline-none focus-visible:border-c4`;

// Max nœuds affichés dans le graphe pour rester lisible
const MAX_NODES = 30;

function neighborIdFromLink(l: ProximityLink, focalId: number): number {
  return l.source === focalId ? l.target : l.source;
}

function ProximityMinFilter({
  minWeight,
  onChange,
  className = 'ml-auto',
}: {
  minWeight: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const proximityHelp = (
    <div className='flex flex-col gap-1'>
      <p className='font-medium text-c6 mb-1'>Score de proximité</p>
      <p>De 1 à 6 selon les dimensions partagées :</p>
      <p className='text-c4'>Figures · Enjeux · Cadrages · Affects · Promesses · Risques</p>
    </div>
  );

  return (
    <div className={`flex items-center gap-2 flex-shrink-0 ${className}`}>
      <Tooltip
        placement='bottom'
        classNames={{ content: 'rounded-xl bg-c2 border-2 border-c3 text-c5 text-xs max-w-[240px] p-3' }}
        content={proximityHelp}>
        <span
          className={`text-c4 text-sm whitespace-nowrap px-3 rounded-xl border-2 border-c3 bg-c2 cursor-help flex items-center ${NETWORK_BAR_CONTROL_HEIGHT_CLASS}`}
          tabIndex={0}
          aria-label='Score de proximité — aide'>
          Proximité min.
        </span>
      </Tooltip>
      <Tabs
        aria-label='Proximité minimale'
        selectedKey={String(minWeight)}
        onSelectionChange={(key) => onChange(Number(key))}
        classNames={PROXIMITY_TAB_CLASS_NAMES}>
        {[1, 2, 3, 4, 5, 6].map((v) => (
          <Tab key={String(v)} title={String(v)} />
        ))}
      </Tabs>
    </div>
  );
}

// ─── Mode d'exploration ────────────────────────────────────────────────────────
type ExploreMode = 'focal' | 'thematic';

// ─── Tooltip (classes thème — même langage que modales / toasts) ─────────────
type NetworkTooltip = d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tooltipPropertyBlock(label: string, values: string[]): string {
  if (values.length === 0) return '';
  return `
    <div class="flex flex-col gap-0.5">
      <span class="text-xs font-medium text-c4">${escapeHtml(label)}</span>
      <span class="text-sm text-c5 leading-snug">${escapeHtml(values.join(' · '))}</span>
    </div>`;
}

function buildNodeTooltipHtml(node: RecitNode, connectionCount: number): string {
  const typeCfg = TYPE_CONFIG[node.type];
  const keywordPreview =
    node.keywordLabels.length > 5
      ? [...node.keywordLabels.slice(0, 5), '…']
      : node.keywordLabels;

  const blocks = [
    tooltipPropertyBlock('Figures', node.figures),
    tooltipPropertyBlock('Cadrages', node.cadrages),
    tooltipPropertyBlock('Enjeux', node.enjeux),
    tooltipPropertyBlock('Affects', node.affects),
    tooltipPropertyBlock('Mots-clés', keywordPreview),
  ].join('');

  const details = blocks
    ? `<div class="flex flex-col gap-2.5 pt-2.5 border-t border-c3">${blocks}</div>`
    : `<p class="text-sm text-c4 pt-2.5 border-t border-c3">Aucune propriété Imaginaires renseignée.</p>`;

  return `
    <div class="p-3.5 flex flex-col gap-2.5">
      <div>
        <p class="text-base font-semibold text-c6 leading-snug">${escapeHtml(node.title)}</p>
        <p class="text-sm text-c5 mt-1.5 flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full shrink-0" style="background:${typeCfg.color}"></span>
          <span>${escapeHtml(typeCfg.label)} · ${connectionCount} connexion${connectionCount !== 1 ? 's' : ''}</span>
        </p>
      </div>
      ${details}
    </div>`;
}

function buildLinkTooltipHtml(link: ProximityLink, src: RecitNode, tgt: RecitNode): string {
  const blocks = [
    tooltipPropertyBlock('Figures', link.sharedFigures),
    tooltipPropertyBlock('Cadrages', link.sharedCadrages),
    tooltipPropertyBlock('Enjeux', link.sharedEnjeux),
    tooltipPropertyBlock('Affects', link.sharedAffects),
    tooltipPropertyBlock('Promesses', link.sharedPromesses),
    tooltipPropertyBlock('Risques', link.sharedRisques),
    tooltipPropertyBlock('Mots-clés partagés', link.sharedKeywords),
  ].join('');

  return `
    <div class="p-3.5 flex flex-col gap-2.5">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-c4">Lien de proximité</span>
        <p class="text-sm font-semibold text-c6 leading-snug">${escapeHtml(src.title)}</p>
        <span class="text-xs text-c4">↔</span>
        <p class="text-sm font-semibold text-c6 leading-snug">${escapeHtml(tgt.title)}</p>
        <p class="text-sm text-c5 mt-1">
          Score <span class="font-semibold text-c6">${link.weight}</span>/6
          <span class="text-c4"> · dimensions Imaginaires communes</span>
        </p>
      </div>
      <div class="flex flex-col gap-2.5 pt-2.5 border-t border-c3">${blocks || '<p class="text-sm text-c4">Aucun détail disponible.</p>'}</div>
    </div>`;
}

function moveNetworkTooltip(tooltip: NetworkTooltip, event: MouseEvent) {
  const offset = 14;
  let left = event.clientX + offset;
  let top = event.clientY + offset;
  const el = document.getElementById('network-tooltip');
  if (el) {
    const { offsetWidth: w, offsetHeight: h } = el;
    if (left + w > window.innerWidth - 12) left = event.clientX - w - offset;
    if (top + h > window.innerHeight - 12) top = event.clientY - h - offset;
    left = Math.max(12, left);
    top = Math.max(12, top);
  }
  tooltip.style('left', `${left}px`).style('top', `${top}px`);
}

function showNetworkTooltip(tooltip: NetworkTooltip, html: string, event: MouseEvent) {
  tooltip.html(html).style('opacity', '1');
  moveNetworkTooltip(tooltip, event);
}

function getOrCreateTooltip(): NetworkTooltip {
  let tip = d3.select<HTMLDivElement, unknown>('#network-tooltip');
  if (tip.empty()) {
    tip = d3
      .select('body')
      .append('div')
      .attr('id', 'network-tooltip')
      .attr(
        'class',
        'fixed pointer-events-none z-[9999] max-w-[360px] rounded-xl border-2 border-c3 bg-c2 shadow-xl opacity-0 transition-opacity duration-150',
      );
  }
  return tip;
}

// ─── Composant SVG force graph ────────────────────────────────────────────────
function ForceGraph({
  nodes,
  links,
  onNodeClick,
  onNodeDoubleClick,
  focalId,
}: {
  nodes: RecitNode[];
  links: ReturnType<typeof computeProximityLinks>;
  onNodeClick: (n: RecitNode) => void;
  onNodeDoubleClick?: (n: RecitNode) => void;
  focalId?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      setDimensions({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) return;

    d3.select(svg).selectAll('*').remove();
    if (simulationRef.current) simulationRef.current.stop();

    const tooltip = getOrCreateTooltip();
    const { width, height } = dimensions;

    const zoomG = d3.select(svg).append('g');

    /** Découpe le titre en lignes selon la place disponible (dépend du zoom). */
    const wrapNodeTitle = (title: string, maxCharsPerLine: number, maxLines: number): string[] => {
      const words = title.split(/\s+/).filter(Boolean);
      if (words.length === 0) return [''];
      const lines: string[] = [];
      let current = '';

      const pushCurrent = () => {
        if (current) lines.push(current);
        current = '';
      };

      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (test.length <= maxCharsPerLine) {
          current = test;
          continue;
        }
        if (current) pushCurrent();
        if (lines.length >= maxLines - 1) {
          const rest = [word, ...words.slice(words.indexOf(word) + 1)].join(' ');
          lines.push(
            rest.length <= maxCharsPerLine
              ? rest
              : `${rest.slice(0, Math.max(1, maxCharsPerLine - 1))}…`,
          );
          return lines.slice(0, maxLines);
        }
        current = word.length <= maxCharsPerLine ? word : `${word.slice(0, Math.max(1, maxCharsPerLine - 1))}…`;
      }
      if (current) lines.push(current);
      return lines.slice(0, maxLines);
    };

    const nodeLabelLayout = (node: RecitNode, zoomK: number) => {
      const hr = HIT_R(node);
      const k = Math.max(1, zoomK);
      // Police en coords graphe : léger contre-scale pour que la taille à l'écran
      // grossisse moins vite que la bulle (évite le débordement au zoom fort)
      const fontBase = Math.max(9, Math.min(14, hr * 0.28));
      const fontPx = fontBase / Math.pow(k, 0.34);
      const maxLines = k >= 2.8 ? 3 : 2;
      const baseChars = Math.floor((hr * 2 * 0.62) / (fontBase * 0.52));
      const charsPerLine = Math.max(8, Math.floor(baseChars * (1 + (k - 1) * 0.28)));
      return { fontPx, maxLines, charsPerLine, lineHeight: fontPx * 1.22 };
    };

    const updateNodeLabels = (zoomK: number) => {
      nodeG.each(function (d) {
        const node = d as SimNode;
        const { fontPx, maxLines, charsPerLine, lineHeight } = nodeLabelLayout(node, zoomK);
        const lines = wrapNodeTitle(node.title, charsPerLine, maxLines);
        const startDy = -((lines.length - 1) * lineHeight) / 2;

        const labelG = d3.select(this).select<SVGGElement>('g.node-label');
        labelG.selectAll<SVGTextElement, unknown>('text').each(function (_el, i) {
          const t = d3.select(this);
          if (i < lines.length) {
            t.text(lines[i])
              .attr('text-anchor', 'middle')
              .attr('x', 0)
              .attr('y', 0)
              .attr('dy', startDy + i * lineHeight)
              .attr('font-size', `${fontPx}px`)
              .attr('font-weight', '500')
              .attr('fill', 'rgba(255,255,255,0.92)')
              .style('display', null);
          } else {
            t.text('').style('display', 'none');
          }
        });
      });
    };

    type SimNode = RecitNode & d3.SimulationNodeDatum;
    const simNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: n.id === focalId ? width / 2 : undefined,
      y: n.id === focalId ? height / 2 : undefined,
      fx: n.id === focalId ? width / 2 : undefined,
      fy: n.id === focalId ? height / 2 : undefined,
    }));

    const idToSim = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks = links
      .map((l) => ({ ...l, source: idToSim.get(l.source)!, target: idToSim.get(l.target)! }))
      .filter((l) => l.source && l.target);

    const degree = new Map<number, number>();
    simLinks.forEach((l) => {
      const s = (l.source as SimNode).id;
      const t = (l.target as SimNode).id;
      degree.set(s, (degree.get(s) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
    });

    // ─ Tailles des nœuds ─────────────────────────────────────────────────────
    // IMG_HALF = demi-taille de l'image affichée (ombre visible autour)
    // HIT_R    = rayon du cercle hover/click (≈ 68 % de IMG_HALF)
    // IMG_Y    = décalage vertical de l'image : les PNGs ont plus d'ombre en
    //            bas → la bulle visuelle est légèrement au-dessus du centre
    const IMG_HALF = (n: RecitNode) => {
      const base = n.id === focalId ? 66 : 52;
      const deg = degree.get(n.id) ?? 0;
      return Math.max(base - 4, Math.min(base + 12, base + deg * 1.5));
    };
    const HIT_R  = (n: RecitNode) => IMG_HALF(n) * 0.66;
    const IMG_Y_OFFSET = 2; // remonte légèrement l'image pour centrer la bulle

    const maxW = Math.max(...simLinks.map((l) => l.weight), 1);
    const wScale = d3.scaleLinear().domain([1, maxW]).range([1.5, 5]);
    const opScale = d3.scaleLinear().domain([1, maxW]).range([0.25, 0.75]);

    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id((d: any) => d.id).distance((l: any) => Math.max(130, 270 - l.weight * 15)).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, height / 2))
      // collision basée sur IMG_HALF pour que les ombres ne se chevauchent pas
      .force('collision', d3.forceCollide().radius((d: any) => IMG_HALF(d) + 6));
    simulationRef.current = simulation;

    // Liens
    const link = zoomG.append('g').selectAll<SVGLineElement, any>('line')
      .data(simLinks).join('line')
      .attr('stroke', 'rgba(255,255,255,0.25)')
      .attr('stroke-width', (l) => wScale(l.weight))
      .attr('stroke-opacity', (l) => opScale(l.weight))
      .style('cursor', 'default')
      .style('transition', 'stroke-opacity 0.28s ease, stroke-width 0.2s ease');

    const NODE_FOCUS_TRANSITION = 'opacity 0.28s ease';

    // Noeuds
    const nodeG = zoomG.append('g').selectAll<SVGGElement, SimNode>('g.node')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .style('transition', NODE_FOCUS_TRANSITION)
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); if (d.id !== focalId) { d.fx = null; d.fy = null; } }),
      );

    // ─ Image bulle (taille > hitbox → ombre/halo visible autour) ─────────
    nodeG.append('image')
      .attr('href', (d) => TYPE_BUBBLE[d.type as RecitType])
      .attr('x', (d) => -IMG_HALF(d))
      .attr('y', (d) => -IMG_HALF(d) + IMG_Y_OFFSET)  // léger décalage haut
      .attr('width',  (d) => IMG_HALF(d) * 2)
      .attr('height', (d) => IMG_HALF(d) * 2)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('pointer-events', 'none')
      .style('transition', 'filter 0.28s ease');

    // ─ Hitbox invisible (≈ taille de la vraie bulle sans l'ombre) ────────
    nodeG.append('circle')
      .attr('r', (d) => HIT_R(d))
      .attr('fill', 'transparent')
      .attr('stroke', (d) => (d.id === focalId ? 'rgba(255,255,255,0.85)' : 'none'))
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', (d) => (d.id === focalId ? '0' : '0'));

    // ─ Labels texte (mis à jour au zoom : plus de lignes + même scale que les bulles) ─
    nodeG.each(function () {
      const labelG = d3.select(this).append('g').attr('class', 'node-label');
      for (let i = 0; i < 4; i += 1) {
        labelG
          .append('text')
          .attr('class', `label-line-${i}`)
          .style('text-shadow', '0 1px 3px rgba(0,0,0,0.85)')
          .style('pointer-events', 'none')
          .style('user-select', 'none');
      }
    });

    d3.select(svg).call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 6])
        .on('zoom', (e) => {
          zoomG.attr('transform', e.transform.toString());
          updateNodeLabels(e.transform.k);
        }),
    );
    updateNodeLabels(1);

    const LINK_DIM_NODE_OPACITY = 0.28;
    const LINK_DIM_OTHER_STROKE = 0.1;
    const LINK_FOCUS_DELAY_MS = 500;

    let linkFocusTimer: ReturnType<typeof setTimeout> | null = null;

    const clearLinkFocusTimer = () => {
      if (linkFocusTimer !== null) {
        clearTimeout(linkFocusTimer);
        linkFocusTimer = null;
      }
    };

    const resetLinkHoverFocus = () => {
      clearLinkFocusTimer();
      nodeG
        .style('opacity', '1')
        .select('image')
        .style('filter', 'none');
      link
        .attr('stroke', 'rgba(255,255,255,0.25)')
        .attr('stroke-width', (l) => wScale(l.weight))
        .attr('stroke-opacity', (l) => opScale(l.weight));
    };

    /** Surligne le lien tout de suite, sans atténuer le reste du graphe. */
    const highlightLinkOnly = (hovered: (typeof simLinks)[number]) => {
      const srcId = (hovered.source as SimNode).id;
      const tgtId = (hovered.target as SimNode).id;
      link.each(function (l) {
        const lSrc = (l.source as SimNode).id;
        const lTgt = (l.target as SimNode).id;
        const isHovered = lSrc === srcId && lTgt === tgtId;
        const sel = d3.select(this);
        if (isHovered) {
          sel
            .attr('stroke', 'rgba(255,255,255,0.95)')
            .attr('stroke-width', wScale(l.weight) + 1.5)
            .attr('stroke-opacity', 1);
        } else {
          sel
            .attr('stroke', 'rgba(255,255,255,0.25)')
            .attr('stroke-width', wScale(l.weight))
            .attr('stroke-opacity', opScale(l.weight));
        }
      });
    };

    const scheduleLinkHoverFocus = (hovered: (typeof simLinks)[number]) => {
      clearLinkFocusTimer();
      highlightLinkOnly(hovered);
      linkFocusTimer = setTimeout(() => {
        linkFocusTimer = null;
        applyLinkHoverFocus(hovered);
      }, LINK_FOCUS_DELAY_MS);
    };

    const applyLinkHoverFocus = (hovered: (typeof simLinks)[number]) => {
      const srcId = (hovered.source as SimNode).id;
      const tgtId = (hovered.target as SimNode).id;

      nodeG.each(function (d) {
        const g = d3.select(this);
        const isEndpoint = d.id === srcId || d.id === tgtId;
        g.style('opacity', isEndpoint ? '1' : `${LINK_DIM_NODE_OPACITY}`);
        g.select('image').style('filter', isEndpoint ? 'brightness(1.08)' : 'none');
      });

      link.each(function (l) {
        const lSrc = (l.source as SimNode).id;
        const lTgt = (l.target as SimNode).id;
        const isHovered = lSrc === srcId && lTgt === tgtId;
        const sel = d3.select(this);
        if (isHovered) {
          sel
            .attr('stroke', 'rgba(255,255,255,0.95)')
            .attr('stroke-width', wScale(l.weight) + 1.5)
            .attr('stroke-opacity', 1);
        } else {
          sel
            .attr('stroke', 'rgba(255,255,255,0.25)')
            .attr('stroke-width', wScale(l.weight))
            .attr('stroke-opacity', LINK_DIM_OTHER_STROKE * opScale(l.weight));
        }
      });
    };

    link
      .on('mouseover', function (event, l) {
        const src = l.source as SimNode;
        const tgt = l.target as SimNode;
        const linkMeta: ProximityLink = {
          source: src.id,
          target: tgt.id,
          weight: l.weight,
          sharedFigures: l.sharedFigures,
          sharedEnjeux: l.sharedEnjeux,
          sharedCadrages: l.sharedCadrages,
          sharedAffects: l.sharedAffects,
          sharedPromesses: l.sharedPromesses,
          sharedRisques: l.sharedRisques,
          sharedKeywords: l.sharedKeywords,
        };
        showNetworkTooltip(tooltip, buildLinkTooltipHtml(linkMeta, src, tgt), event);
        scheduleLinkHoverFocus(l);
      })
      .on('mousemove', (e) => moveNetworkTooltip(tooltip, e))
      .on('mouseout', () => {
        resetLinkHoverFocus();
        tooltip.style('opacity', '0');
      });

    nodeG
      .on('mouseover', function (event, d) {
        resetLinkHoverFocus();
        const deg = degree.get(d.id) ?? 0;
        showNetworkTooltip(tooltip, buildNodeTooltipHtml(d, deg), event);
        d3.select(this).select('image').style('filter', 'brightness(1.2)');
        d3.select(this).select('circle').attr('stroke', 'rgba(255,255,255,0.9)').attr('stroke-width', 2.5);
      })
      .on('mousemove', (e) => moveNetworkTooltip(tooltip, e))
      .on('mouseout', function (_e, d) {
        tooltip.style('opacity', '0');
        d3.select(this).select('image').style('filter', 'none');
        d3.select(this).select('circle')
          .attr('stroke', d.id === focalId ? 'rgba(255,255,255,0.85)' : 'none')
          .attr('stroke-width', 2.5);
      })
      .on('click', (_e, d) => {
        tooltip.style('opacity', '0');
        onNodeClick(d);
      })
      .on('dblclick', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        tooltip.style('opacity', '0');
        onNodeDoubleClick?.(d);
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (l) => (l.source as SimNode).x ?? 0).attr('y1', (l) => (l.source as SimNode).y ?? 0)
        .attr('x2', (l) => (l.target as SimNode).x ?? 0).attr('y2', (l) => (l.target as SimNode).y ?? 0);
      nodeG.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      clearLinkFocusTimer();
      simulation.stop();
      d3.select('#network-tooltip').remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, dimensions, focalId, onNodeClick, onNodeDoubleClick]);

  return (
    <div ref={containerRef} className='relative min-h-0 flex-1 h-full w-full overflow-hidden bg-c1'>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function NetworkView({
  isCanvasExpanded = false,
  onToggleCanvasExpanded,
}: NetworkViewProps) {
  const navigate = useNavigate();
  const { nodes, links, loading } = useRecitsData(1);

  // Mode d'exploration: 'landing' → choisir le mode → 'focal' ou 'thematic'
  const [mode, setMode] = useState<'landing' | ExploreMode>('landing');

  // === Mode focal : partir d'un récit ===
  const [focalNode, setFocalNode] = useState<RecitNode | null>(null);
  const [focalSearch, setFocalSearch] = useState('');

  // === Mode thématique : filtrer par propriété ===
  const [thematicDim, setThematicDim] = useState<'figures' | 'cadrages' | 'enjeux' | 'affects' | 'keywords'>('figures');
  const [thematicValue, setThematicValue] = useState<string>('');
  const [activeTypes, setActiveTypes] = useState<Set<RecitType>>(new Set(ALL_TYPES));
  const [minWeight, setMinWeight] = useState(1);

  // ─── Valeurs disponibles par dimension ─────────────────────────────────────
  const dimValues = useMemo(() => {
    const sets: Record<string, Set<string>> = { figures: new Set(), cadrages: new Set(), enjeux: new Set(), affects: new Set(), keywords: new Set() };
    for (const n of nodes) {
      n.figures.forEach((v) => sets.figures.add(v));
      n.cadrages.forEach((v) => sets.cadrages.add(v));
      n.enjeux.forEach((v) => sets.enjeux.add(v));
      n.affects.forEach((v) => sets.affects.add(v));
      n.keywordLabels.forEach((v) => sets.keywords.add(v));
    }
    return Object.fromEntries(Object.entries(sets).map(([k, s]) => [k, Array.from(s).sort()])) as Record<string, string[]>;
  }, [nodes]);

  // ─── Nœuds/liens pour le mode focal ────────────────────────────────────────
  const { focalNodes, focalLinks } = useMemo(() => {
    if (!focalNode) return { focalNodes: [], focalLinks: [] };

    const focalId = focalNode.id;
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const neighborLinks = links
      .filter((l) => (l.source === focalId || l.target === focalId) && l.weight >= minWeight)
      .filter((l) => {
        const otherId = neighborIdFromLink(l, focalId);
        const other = nodeById.get(otherId);
        return other !== undefined && activeTypes.has(other.type);
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_NODES - 1);

    const neighborIds = new Set(neighborLinks.flatMap((l) => [l.source, l.target]));
    neighborIds.add(focalId);

    const focalNodes = nodes.filter((n) => neighborIds.has(n.id));

    const secondaryLinks = links.filter(
      (l) =>
        neighborIds.has(l.source) &&
        neighborIds.has(l.target) &&
        l.weight >= minWeight,
    );

    return { focalNodes, focalLinks: secondaryLinks };
  }, [focalNode, nodes, links, minWeight, activeTypes]);

  // ─── Nœuds/liens pour le mode thématique ────────────────────────────────────
  const { thematicNodes, thematicLinks } = useMemo(() => {
    if (!thematicValue) return { thematicNodes: [], thematicLinks: [] };

    const matches = nodes.filter((n) => {
      if (!activeTypes.has(n.type)) return false;
      switch (thematicDim) {
        case 'figures': return n.figures.includes(thematicValue);
        case 'cadrages': return n.cadrages.includes(thematicValue);
        case 'enjeux': return n.enjeux.includes(thematicValue);
        case 'affects': return n.affects.includes(thematicValue);
        case 'keywords': return n.keywordLabels.includes(thematicValue);
        default: return false;
      }
    });

    // Prendre au max MAX_NODES récits
    const matchIds = new Set(matches.slice(0, MAX_NODES).map((n) => n.id));
    const candidateNodes = nodes.filter((n) => matchIds.has(n.id));
    const candidateLinks = computeProximityLinks(candidateNodes, minWeight);

    // Supprimer les nœuds sans aucune connexion au seuil courant → évite
    // les bulles isolées qui flottent hors du graphe quand on monte le slider
    const connectedIds = new Set(candidateLinks.flatMap((l) => [l.source, l.target]));
    const thematicNodes = minWeight <= 1
      ? candidateNodes
      : candidateNodes.filter((n) => connectedIds.has(n.id));
    const thematicLinks = candidateLinks;

    return { thematicNodes, thematicLinks };
  }, [thematicValue, thematicDim, nodes, activeTypes, minWeight]);

  const thematicCountByType = useMemo(() => {
    const counts = {} as Record<RecitType, number>;
    for (const t of ALL_TYPES) counts[t] = 0;
    for (const n of thematicNodes) counts[n.type] += 1;
    return counts;
  }, [thematicNodes]);

  // ─── Recherche pour le mode focal ──────────────────────────────────────────
  const focalSearchResults = useMemo(() => {
    const pool = nodes.filter((n) => activeTypes.has(n.type));
    if (!focalSearch.trim()) return pool.slice(0, 12);
    const q = focalSearch.toLowerCase();
    return pool.filter((n) => n.title.toLowerCase().includes(q)).slice(0, 12);
  }, [focalSearch, nodes, activeTypes]);

  const countFocalLinksForNode = useCallback(
    (nodeId: number) => {
      let count = 0;
      for (const l of links) {
        if (l.source !== nodeId && l.target !== nodeId) continue;
        if (l.weight < minWeight) continue;
        const otherId = neighborIdFromLink(l, nodeId);
        const other = nodes.find((n) => n.id === otherId);
        if (other && activeTypes.has(other.type)) count += 1;
      }
      return count;
    },
    [links, minWeight, activeTypes, nodes],
  );

  const handleNodeClick = useCallback((n: RecitNode) => {
    if (mode === 'focal') {
      setFocalNode(n);
    }
  }, [mode]);

  const handleNodeDoubleClick = useCallback(
    (n: RecitNode) => {
      navigate(n.url);
    },
    [navigate],
  );

  const reset = () => {
    setMode('landing');
    setFocalNode(null);
    setFocalSearch('');
    setThematicValue('');
  };

  const openRecitSearch = useCallback((prefillTitle = '') => {
    setFocalSearch(prefillTitle);
    setFocalNode(null);
  }, []);

  // ─── Chargement ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center bg-c1'>
        <div className='text-center text-c5'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-c5 mx-auto mb-4' />
          <p className='text-sm'>Chargement des récits…</p>
          <p className='text-xs text-c4 mt-1'>Analyse des {nodes.length} récits disponibles</p>
        </div>
      </div>
    );
  }

  // ─── Écran d'accueil (choix du mode) ──────────────────────────────────────
  if (mode === 'landing') {
    return (
      <div className='flex-1 flex flex-col items-center justify-center bg-c1 p-8'>
        <div className='mb-8 text-center'>
          <Network size={40} className='text-c4 mx-auto mb-3' />
          <h2 className='text-c6 text-xl font-semibold mb-2'>Réseau de proximité narrative</h2>
          <p className='text-c4 text-sm max-w-md'>
            {nodes.length} récits analysés. Explorez les connexions selon les figures, cadrages et mots-clés partagés.
          </p>
        </div>

        <div className='grid grid-cols-2 gap-4 max-w-xl w-full'>
          {/* Mode focal */}
          <button
            onClick={() => setMode('focal')}
            className='cursor-pointer flex flex-col gap-3 p-6 bg-c2 border-2 border-c3 hover:border-c4 rounded-xl text-left transition-all duration-200'>
            <div className='flex items-center gap-2 text-c6'>
              <Search size={18} />
              <span className='font-medium'>Partir d'un récit</span>
            </div>
            <p className='text-c4 text-xs leading-relaxed'>
              Choisissez un récit de départ et explorez ses voisins les plus proches. Naviguez de récit en récit.
            </p>
            <span className='text-xs text-c5 mt-auto'>Mode égo-réseau</span>
          </button>

          {/* Mode thématique */}
          <button
            onClick={() => setMode('thematic')}
            className='cursor-pointer flex flex-col gap-3 p-6 bg-c2 border-2 border-c3 hover:border-c4 rounded-xl text-left transition-all duration-200'>
            <div className='flex items-center gap-2 text-c6'>
              <Network size={18} />
              <span className='font-medium'>Explorer par thème</span>
            </div>
            <p className='text-c4 text-xs leading-relaxed'>
              Sélectionnez une figure de l'IA, un cadrage ou un mot-clé et visualisez tous les récits partageant ce concept.
            </p>
            <span className='text-xs text-c5 mt-auto'>Mode thématique</span>
          </button>
        </div>

        {/* Légende types */}
        <div className='flex flex-wrap gap-2 mt-8 justify-center'>
          {ALL_TYPES.map((t) => (
            <div key={t} className='flex items-center gap-1.5 text-xs text-c5'>
              <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: TYPE_CONFIG[t].color }} />
              {TYPE_CONFIG[t].short}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Mode focal ────────────────────────────────────────────────────────────
  if (mode === 'focal') {
    // Étape 1 : choisir le récit focal
    if (!focalNode) {
      return (
        <div className='flex-1 flex flex-col bg-c1'>
          {/* Header */}
          <div className={NETWORK_CONTROLS_BAR_CLASS}>
            <Button onPress={reset} className={outlineIconButtonClass} aria-label='Retour'>
              <ArrowLeft size={16} />
            </Button>
            <div className='relative flex-1 min-w-[12rem]'>
              <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-c4 pointer-events-none' />
              <input
                autoFocus
                value={focalSearch}
                onChange={(e) => setFocalSearch(e.target.value)}
                placeholder='Rechercher un récit par titre…'
                className={RECIT_SEARCH_INPUT_CLASS}
                aria-label='Rechercher un récit'
              />
            </div>
            <RecitTypesFilterSelect activeTypes={activeTypes} onChange={setActiveTypes} />
            <ProximityMinFilter minWeight={minWeight} onChange={setMinWeight} />
          </div>

          <div className='flex-1 flex flex-col items-center justify-start p-8 gap-4 overflow-y-auto'>
            <div className='w-full max-w-lg'>
              <div className='flex flex-col gap-2'>
                {focalSearchResults.map((n) => {
                  const linkCount = countFocalLinksForNode(n.id);
                  return (
                  <button
                    key={n.id}
                    onClick={() => setFocalNode(n)}
                    className='flex items-center gap-3 w-full px-4 py-3 bg-c2 border-2 border-c3 hover:border-c4 rounded-xl text-left transition-all duration-200'>
                    <span
                      className='w-2.5 h-2.5 rounded-full flex-shrink-0'
                      style={{ backgroundColor: TYPE_CONFIG[n.type].color }}
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='text-c6 text-sm truncate'>{n.title}</p>
                      <p className='text-c4 text-xs'>{TYPE_CONFIG[n.type].label}</p>
                    </div>
                    {linkCount > 0 && (
                      <span className='text-xs text-c4 flex-shrink-0'>
                        {linkCount} lien{linkCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                  );
                })}
                {focalSearchResults.length === 0 && (
                  <p className='text-c4 text-sm text-center py-8'>Aucun résultat</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Étape 2 : graphe focal
    const visibleNeighborCount = Math.max(0, focalNodes.length - 1);
    const filteredDirectLinks = countFocalLinksForNode(focalNode.id);
    return (
      <div className='flex flex-1 flex-col min-h-0 overflow-hidden bg-c1'>
        <div className={NETWORK_CONTROLS_BAR_CLASS}>
          <Button
            onPress={() => openRecitSearch('')}
            className={outlineIconButtonClass}
            aria-label='Retour à la recherche de récit'>
            <ArrowLeft size={16} />
          </Button>
          <div className='relative flex-1 min-w-[12rem]'>
            <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-c4 pointer-events-none' />
            <button
              type='button'
              onClick={() => openRecitSearch(focalNode.title)}
              className={FOCAL_RECIT_SEARCH_TRIGGER_CLASS}
              title='Cliquer pour rechercher un autre récit'
              aria-label='Rechercher un autre récit'>
              <span
                className='w-2.5 h-2.5 rounded-full shrink-0'
                style={{ backgroundColor: TYPE_CONFIG[focalNode.type].color }}
              />
              <span
                className='block min-w-0 flex-1 truncate text-c6 text-sm font-medium leading-none text-left'
                title={focalNode.title}>
                {focalNode.title}
              </span>
              <span className='text-c4 text-xs shrink-0 whitespace-nowrap leading-none hidden sm:inline'>
                {TYPE_CONFIG[focalNode.type].label}
              </span>
              <span className='text-c4 text-xs shrink-0 whitespace-nowrap leading-none hidden md:inline'>
                {visibleNeighborCount} voisin{visibleNeighborCount !== 1 ? 's' : ''} · {filteredDirectLinks} lien
                {filteredDirectLinks !== 1 ? 's' : ''}
              </span>
            </button>
          </div>
          <RecitTypesFilterSelect activeTypes={activeTypes} onChange={setActiveTypes} />
          <ProximityMinFilter minWeight={minWeight} onChange={setMinWeight} className='ml-auto' />
        </div>

        <NetworkGraphArea
          layoutKey={`focal-${focalNode.id}`}
          isCanvasExpanded={isCanvasExpanded}
          onToggleCanvasExpanded={onToggleCanvasExpanded}
          bottomHint='Clic → nouveau récit focal · Double-clic → ouvre la fiche EDISEM'>
          {visibleNeighborCount === 0 ? (
            <div className='flex flex-1 min-h-0 items-center justify-center p-8 text-center'>
              <p className='text-c4 text-sm max-w-md'>
                Aucun voisin avec ces filtres. Baissez la proximité minimale ou incluez plus de types de récits.
              </p>
            </div>
          ) : (
            <ForceGraph
              nodes={focalNodes}
              links={focalLinks}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              focalId={focalNode.id}
            />
          )}
        </NetworkGraphArea>
      </div>
    );
  }

  // ─── Mode thématique ──────────────────────────────────────────────────────
  const DIM_LABELS: Record<string, string> = {
    figures: "Figures de l'IA", cadrages: 'Cadrages idéologiques',
    enjeux: 'Enjeux', affects: 'Affects', keywords: 'Mots-clés',
  };

  return (
    <div className='flex flex-1 flex-col min-h-0 overflow-hidden bg-c1'>
      {/* Header contrôles */}
      <div className={NETWORK_CONTROLS_BAR_CLASS}>
        <Button onPress={reset} className={outlineIconButtonClass} aria-label='Retour'>
          <ArrowLeft size={16} />
        </Button>

        {/* Dimension */}
        <Select
          selectedKeys={[thematicDim]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as string;
            setThematicDim(val as typeof thematicDim);
            setThematicValue('');
          }}
          className='w-48'
          classNames={{ trigger: 'rounded-xl' }}
          aria-label='Dimension'>
          {Object.entries(DIM_LABELS).map(([k, v]) => (
            <SelectItem key={k}>{v}</SelectItem>
          ))}
        </Select>

        {/* Valeur */}
        <Select
          selectedKeys={thematicValue ? [thematicValue] : []}
          onSelectionChange={(keys) => setThematicValue(Array.from(keys)[0] as string ?? '')}
          placeholder={`Choisir…`}
          className='flex-1 min-w-[200px] max-w-xs'
          classNames={{ trigger: 'rounded-xl' }}
          aria-label='Valeur'>
          {(dimValues[thematicDim] ?? []).map((v) => (
            <SelectItem key={v}>{v}</SelectItem>
          ))}
        </Select>

        {thematicValue && (
          <Button onPress={() => setThematicValue('')} className={outlineIconButtonClass} aria-label='Effacer la sélection'>
            <X size={14} />
          </Button>
        )}

        <RecitTypesFilterSelect activeTypes={activeTypes} onChange={setActiveTypes} />
        <ProximityMinFilter minWeight={minWeight} onChange={setMinWeight} />

      </div>

      <NetworkGraphArea
        layoutKey={`thematic-${thematicDim}-${thematicValue}`}
        isCanvasExpanded={isCanvasExpanded}
        onToggleCanvasExpanded={thematicValue ? onToggleCanvasExpanded : undefined}
        bottomOverlay={
          thematicValue ? (
            <div
              className={`pointer-events-auto mb-1 flex w-full justify-center px-2 ${
                onToggleCanvasExpanded ? 'pr-12 sm:pr-2' : ''
              }`}>
              <div className={NETWORK_STATS_PILL_CLASS}>
                <span className='text-c5 whitespace-nowrap'>
                  <span className='font-medium text-c6'>{thematicNodes.length}</span>
                  {' '}récit{thematicNodes.length !== 1 ? 's' : ''}
                  <span className='text-c4 mx-1.5'>·</span>
                  <span className='font-medium text-c6'>{thematicLinks.length}</span>
                  {' '}lien{thematicLinks.length !== 1 ? 's' : ''}
                </span>
                {ALL_TYPES.filter((t) => thematicCountByType[t] > 0).map((t) => (
                  <span
                    key={t}
                    className='inline-flex items-center gap-1.5 text-xs text-c5 px-2 py-0.5 rounded-lg border border-c3 bg-c1/50'>
                    <span
                      className='w-2 h-2 rounded-full shrink-0'
                      style={{ backgroundColor: TYPE_CONFIG[t].color }}
                    />
                    {TYPE_CONFIG[t].short}
                    <span className='text-c6 font-medium'>({thematicCountByType[t]})</span>
                  </span>
                ))}
                {thematicNodes.length > 0 && (
                  <>
                    <span className='text-c4 text-xs hidden sm:inline' aria-hidden>
                      ·
                    </span>
                    <span className='text-c4 text-xs text-center whitespace-normal sm:whitespace-nowrap'>
                      Double-clic → ouvre la fiche EDISEM
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : undefined
        }>
        {!thematicValue ? (
          <div className='flex flex-1 min-h-0 items-center justify-center text-center p-8'>
            <div>
              <Network size={32} className='text-c4 mx-auto mb-3' />
              <p className='text-c5 text-sm mb-1'>Sélectionnez une valeur pour explorer le réseau</p>
              <p className='text-c4 text-xs'>ex : choisir "L'IA comme menace existentielle" → voir tous les récits qui partagent cette figure</p>
            </div>
          </div>
        ) : thematicNodes.length === 0 ? (
          <div className='flex flex-1 min-h-0 items-center justify-center'>
            <p className='text-c4 text-sm'>Aucun récit trouvé avec ce filtre</p>
          </div>
        ) : (
          <ForceGraph
            nodes={thematicNodes}
            links={thematicLinks}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
        )}
      </NetworkGraphArea>
    </div>
  );
}
