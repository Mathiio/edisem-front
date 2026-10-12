import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

import type { RecitNode, RecitType } from '../../hooks/useRecitsData';
import { buildTypeEnjeuxSankey } from '../../utils/guideInsightsData';

interface TypeEnjeuxSankeyProps {
  nodes: RecitNode[];
  activeTypes: Set<RecitType>;
  topEnjeux: number;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  h: number;
  label: string;
  color: string;
}

interface LayoutLink {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  sy0: number;
  sy1: number;
  ty0: number;
  ty1: number;
}

function stackNodes(
  items: { id: string; label: string; color: string; total: number }[],
  x: number,
  innerHeight: number,
  gap: number,
  minH: number,
): LayoutNode[] {
  const weights = items.map((d) => Math.max(d.total, 1));
  const sum = d3.sum(weights) || 1;
  const totalGap = gap * Math.max(0, items.length - 1);
  const scale = (innerHeight - totalGap) / sum;
  let y = 0;
  return items.map((item, i) => {
    const h = Math.max(minH, weights[i] * scale);
    const node: LayoutNode = { id: item.id, x, y, h, label: item.label, color: item.color };
    y += h + gap;
    return node;
  });
}

function assignLinkBands(links: LayoutLink[], side: 'source' | 'target') {
  const byNode = new Map<string, LayoutLink[]>();
  for (const link of links) {
    const id = side === 'source' ? link.source.id : link.target.id;
    const list = byNode.get(id) ?? [];
    list.push(link);
    byNode.set(id, list);
  }
  for (const [, nodeLinks] of byNode) {
    nodeLinks.sort((a, b) => b.value - a.value);
    const node = side === 'source' ? nodeLinks[0].source : nodeLinks[0].target;
    let offset = node.y;
    const total = d3.sum(nodeLinks, (l) => l.value) || nodeLinks.length;
    for (const link of nodeLinks) {
      const band = (link.value / total) * node.h;
      if (side === 'source') {
        link.sy0 = offset;
        link.sy1 = offset + band;
      } else {
        link.ty0 = offset;
        link.ty1 = offset + band;
      }
      offset += band;
    }
  }
}

export function TypeEnjeuxSankey({ nodes, activeTypes, topEnjeux }: TypeEnjeuxSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const model = useMemo(
    () => buildTypeEnjeuxSankey(nodes, activeTypes, topEnjeux),
    [nodes, activeTypes, topEnjeux],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || model.links.length === 0) return;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 420;
    const margin = { top: 12, right: 168, bottom: 12, left: 88 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const leftX = margin.left;
    const rightX = margin.left + innerW;
    const leftNodes = stackNodes(model.types, leftX, innerH, 6, 16);
    const rightNodes = stackNodes(
      model.enjeux.map((e) => ({ ...e, color: '#64748b' })),
      rightX,
      innerH,
      4,
      12,
    );

    const leftById = new Map(leftNodes.map((n) => [n.id, n]));
    const rightById = new Map(rightNodes.map((n) => [n.id, n]));

    const layoutLinks: LayoutLink[] = model.links
      .map((l) => {
        const source = leftById.get(l.source);
        const target = rightById.get(l.target);
        if (!source || !target) return null;
        return {
          source,
          target,
          value: l.value,
          sy0: 0,
          sy1: 0,
          ty0: 0,
          ty1: 0,
        };
      })
      .filter((l): l is LayoutLink => l != null);

    assignLinkBands(layoutLinks, 'source');
    assignLinkBands(layoutLinks, 'target');

    const root = d3.select(svg);
    root.selectAll('*').remove();

    const g = root.append('g');

    g.selectAll('path.link')
      .data(layoutLinks)
      .join('path')
      .attr('fill', (d) => d.source.color)
      .attr('fill-opacity', 0.28)
      .attr('stroke', 'none')
      .attr('d', (d) => {
        const x0 = d.source.x + 12;
        const x1 = d.target.x;
        const mx = (x1 - x0) / 2;
        return `
            M ${x0},${d.sy0 + margin.top}
            C ${x0 + mx},${d.sy0 + margin.top} ${x1 - mx},${d.ty0 + margin.top} ${x1},${d.ty0 + margin.top}
            L ${x1},${d.ty1 + margin.top}
            C ${x1 - mx},${d.ty1 + margin.top} ${x0 + mx},${d.sy1 + margin.top} ${x0},${d.sy1 + margin.top}
            Z
          `;
      })
      .append('title')
      .text((d) => `${d.source.label} → ${d.target.label} (${d.value})`);

    const drawNodes = (nodeData: LayoutNode[], anchor: 'left' | 'right') => {
      const ng = g.selectAll(`g.node-${anchor}`).data(nodeData).join('g').attr('class', `node-${anchor}`);

      ng.selectAll('rect')
        .data((d) => [d])
        .join('rect')
        .attr('x', (d) => (anchor === 'left' ? d.x : d.x - 12))
        .attr('y', (d) => d.y + margin.top)
        .attr('width', 12)
        .attr('height', (d) => d.h)
        .attr('fill', (d) => d.color)
        .attr('rx', 2);

      ng.selectAll('text')
        .data((d) => [d])
        .join('text')
        .attr('x', (d) => (anchor === 'left' ? d.x - 6 : d.x + 18))
        .attr('y', (d) => d.y + margin.top + d.h / 2)
        .attr('text-anchor', anchor === 'left' ? 'end' : 'start')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#cbd5e1')
        .attr('font-size', 11)
        .text((d) => (d.label.length > 42 ? `${d.label.slice(0, 40)}…` : d.label));

      ng.selectAll('title')
        .data((d) => [d])
        .join('title')
        .text((d) => d.label);
    };

    drawNodes(leftNodes, 'left');
    drawNodes(rightNodes, 'right');
  }, [model]);

  if (model.enjeux.length === 0) {
    return (
      <p className='text-sm text-c4 p-4'>
        Aucun enjeu Imaginaire sur les récits filtrés — le Sankey nécessite des annotations storyline:hasTheme.
      </p>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <svg ref={svgRef} className='h-full min-h-[320px] w-full text-c6' aria-label='Sankey type de récit vers enjeux' />
      <p className='text-xs text-c4 shrink-0 px-1'>
        {model.links.length} flux · épaisseur = nombre de récits · top {topEnjeux} enjeux
      </p>
    </div>
  );
}
