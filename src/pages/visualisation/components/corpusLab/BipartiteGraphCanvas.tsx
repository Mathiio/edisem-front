import { useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import type { LabGraphLink, LabGraphNode } from '../../utils/corpusLabData';

interface BipartiteGraphCanvasProps {
  model: { nodes: LabGraphNode[]; links: LabGraphLink[] };
  leftLabel?: string;
  rightLabel?: string;
}

const ROW_H = 28;
const PAD_TOP = 8;
const HOVER_CLEAR_MS = 120;

export function BipartiteGraphCanvas({
  model,
  leftLabel = 'Gauche',
  rightLabel = 'Droite',
}: BipartiteGraphCanvasProps) {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const hoverClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusId = pinnedId ?? hoverId;

  const nodeById = useMemo(() => new Map(model.nodes.map((n) => [n.id, n])), [model.nodes]);

  const { leftNodes, rightNodes, yById, contentHeight } = useMemo(() => {
    const left = model.nodes.filter((n) => n.side === 'left');
    const right = model.nodes.filter((n) => n.side === 'right');
    const degree = new Map<string, number>();
    for (const l of model.links) {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    const byDegree = (a: LabGraphNode, b: LabGraphNode) =>
      (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.label.localeCompare(b.label, 'fr');
    left.sort(byDegree);
    right.sort(byDegree);

    const yMap = new Map<string, number>();
    left.forEach((n, i) => yMap.set(n.id, PAD_TOP + i * ROW_H + ROW_H / 2));
    right.forEach((n, i) => yMap.set(n.id, PAD_TOP + i * ROW_H + ROW_H / 2));
    const rows = Math.max(left.length, right.length, 1);
    const h = PAD_TOP + rows * ROW_H + 8;
    return { leftNodes: left, rightNodes: right, yById: yMap, contentHeight: h };
  }, [model]);

  const neighborIds = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const l of model.links) {
      if (l.source === focusId) set.add(l.target);
      if (l.target === focusId) set.add(l.source);
    }
    return set;
  }, [focusId, model.links]);

  const focusNode = focusId ? nodeById.get(focusId) : null;
  const focusNeighbors = useMemo(() => {
    if (!focusId) return [];
    return model.links
      .filter((l) => l.source === focusId || l.target === focusId)
      .map((l) => nodeById.get(l.source === focusId ? l.target : l.source))
      .filter((n): n is LabGraphNode => n != null);
  }, [focusId, model.links, nodeById]);

  const scheduleHoverClear = useCallback(() => {
    if (hoverClearRef.current) clearTimeout(hoverClearRef.current);
    hoverClearRef.current = setTimeout(() => {
      setHoverId(null);
      hoverClearRef.current = null;
    }, HOVER_CLEAR_MS);
  }, []);

  const cancelHoverClear = useCallback(() => {
    if (hoverClearRef.current) {
      clearTimeout(hoverClearRef.current);
      hoverClearRef.current = null;
    }
  }, []);

  const onNodeEnter = useCallback(
    (id: string) => {
      cancelHoverClear();
      setHoverId(id);
    },
    [cancelHoverClear],
  );

  const onNodeLeave = useCallback(() => {
    if (pinnedId) return;
    scheduleHoverClear();
  }, [pinnedId, scheduleHoverClear]);

  const onPaneEnter = useCallback(() => {
    cancelHoverClear();
  }, [cancelHoverClear]);

  const onPaneLeave = useCallback(() => {
    if (!pinnedId) setHoverId(null);
  }, [pinnedId]);

  const onNodeClick = useCallback(
    (n: LabGraphNode) => {
      cancelHoverClear();
      if (n.url && n.url !== '#') {
        navigate(n.url);
        return;
      }
      setPinnedId((prev) => (prev === n.id ? null : n.id));
      setHoverId(n.id);
    },
    [navigate, cancelHoverClear],
  );

  if (model.nodes.length === 0) {
    return <p className='text-sm text-c4 p-4'>Pas de données à afficher pour ces filtres.</p>;
  }

  const hasFocus = neighborIds != null;
  const svgWidth = 200;
  const lx = 24;
  const rx = svgWidth - 24;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-2'>
      <div
        className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-c3 bg-c1/40'
        onMouseEnter={onPaneEnter}
        onMouseLeave={onPaneLeave}>
        <div className='grid shrink-0 grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)] border-b border-c3/60 bg-c2/80 text-[10px] font-medium uppercase tracking-wide text-c4'>
          <span className='px-2 py-1.5 truncate'>{leftLabel}</span>
          <span className='px-2 py-1.5 text-center border-x border-c3/40'>Liens</span>
          <span className='px-2 py-1.5 truncate'>{rightLabel}</span>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden'>
          <div
            className='grid grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)]'
            style={{ height: contentHeight }}>
            <ColumnRows
              nodes={leftNodes}
              side='left'
              focusId={focusId}
              neighborIds={neighborIds}
              onEnter={onNodeEnter}
              onLeave={onNodeLeave}
              onClick={onNodeClick}
            />

            <svg
              width={svgWidth}
              height={contentHeight}
              className='shrink-0 border-x border-c3/40 bg-c1/20'
              aria-hidden>
              {model.links.map((l) => {
                const y1 = yById.get(l.source);
                const y2 = yById.get(l.target);
                if (y1 == null || y2 == null) return null;
                const active =
                  !hasFocus || (neighborIds!.has(l.source) && neighborIds!.has(l.target));
                const mid = svgWidth / 2;
                return (
                  <path
                    key={`${l.source}-${l.target}`}
                    d={`M ${lx} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${rx} ${y2}`}
                    fill='none'
                    stroke={active ? 'rgba(56, 189, 248, 0.85)' : 'rgba(100, 116, 139, 0.08)'}
                    strokeWidth={active ? 2 : 0.5}
                  />
                );
              })}
              {model.nodes.map((n) => {
                const y = yById.get(n.id);
                if (y == null) return null;
                const x = n.side === 'left' ? lx : rx;
                const lit = !hasFocus || neighborIds!.has(n.id);
                return (
                  <circle
                    key={n.id}
                    cx={x}
                    cy={y}
                    r={focusId === n.id ? 8 : 6}
                    fill={n.color}
                    fillOpacity={lit ? 1 : 0.15}
                    stroke={focusId === n.id ? '#38bdf8' : 'transparent'}
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => onNodeEnter(n.id)}
                    onMouseLeave={onNodeLeave}
                    onClick={() => onNodeClick(n)}
                  />
                );
              })}
            </svg>

            <ColumnRows
              nodes={rightNodes}
              side='right'
              focusId={focusId}
              neighborIds={neighborIds}
              onEnter={onNodeEnter}
              onLeave={onNodeLeave}
              onClick={onNodeClick}
            />
          </div>
        </div>

        {/* Hauteur fixe : pas de reflow au survol */}
        <div className='shrink-0 h-[4.25rem] border-t border-c3/60 bg-c2/90 px-3 py-2 overflow-hidden'>
          {focusNode ? (
            <>
              <p className='text-sm text-c6 font-medium leading-snug line-clamp-1'>{focusNode.label}</p>
              <p className='text-xs text-c4 mt-0.5 line-clamp-1'>
                {focusNode.meta ? `${focusNode.meta} · ` : ''}
                {focusNeighbors.length} connexion(s)
                {focusNeighbors.length > 0
                  ? ` — ${focusNeighbors
                      .slice(0, 3)
                      .map((n) => n.label)
                      .join(', ')}${focusNeighbors.length > 3 ? '…' : ''}`
                  : ''}
              </p>
              {pinnedId ? (
                <button
                  type='button'
                  className='cursor-pointer text-xs text-action mt-1'
                  onClick={() => {
                    setPinnedId(null);
                    setHoverId(null);
                  }}>
                  Désépingler (Échap le survol)
                </button>
              ) : (
                <p className='text-[10px] text-c4 mt-1'>Clic pour épingler · clic récit → fiche</p>
              )}
            </>
          ) : (
            <p className='text-xs text-c4 leading-relaxed'>
              Survolez une ligne à gauche ou à droite pour mettre en évidence ses connexions. Le panneau
              du bas affiche le détail sans déplacer la liste.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnRows({
  nodes,
  side,
  focusId,
  neighborIds,
  onEnter,
  onLeave,
  onClick,
}: {
  nodes: LabGraphNode[];
  side: 'left' | 'right';
  focusId: string | null;
  neighborIds: Set<string> | null;
  onEnter: (id: string) => void;
  onLeave: () => void;
  onClick: (n: LabGraphNode) => void;
}) {
  return (
    <div className='relative h-full'>
      {nodes.map((n, i) => {
        const lit = !neighborIds || neighborIds.has(n.id);
        const isFocus = focusId === n.id;
        const top = PAD_TOP + i * ROW_H;
        return (
          <button
            key={n.id}
            type='button'
            title={n.label}
            style={{ top, height: ROW_H }}
            onMouseEnter={() => onEnter(n.id)}
            onMouseLeave={onLeave}
            onClick={() => onClick(n)}
            className={`absolute inset-x-0 flex items-center cursor-pointer px-2 text-[11px] leading-tight transition-colors ${
              side === 'left' ? 'justify-end text-right' : 'justify-start text-left'
            } ${
              isFocus
                ? 'bg-action/20 text-c6 z-10'
                : lit
                  ? 'text-c5 hover:bg-c3/40'
                  : 'text-c4/30'
            }`}>
            <span className='line-clamp-2 max-w-full'>{n.label}</span>
          </button>
        );
      })}
    </div>
  );
}
