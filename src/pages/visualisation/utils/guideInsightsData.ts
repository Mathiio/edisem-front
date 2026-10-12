import type { RecitNode, RecitType } from '../hooks/useRecitsData';
import { TYPE_CONFIG, ALL_TYPES } from '../recitTypeConfig';

export interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
}

export interface SankeySideNode {
  id: string;
  label: string;
  color: string;
  total: number;
}

export interface TypeEnjeuxSankeyModel {
  types: SankeySideNode[];
  enjeux: SankeySideNode[];
  links: SankeyLinkDatum[];
  maxLink: number;
}

export function buildTypeEnjeuxSankey(
  nodes: RecitNode[],
  activeTypes: Set<RecitType>,
  topEnjeux = 14,
): TypeEnjeuxSankeyModel {
  const filtered = nodes.filter((n) => activeTypes.has(n.type));

  const enjeuGlobal = new Map<string, number>();
  for (const n of filtered) {
    for (const e of new Set(n.enjeux)) {
      enjeuGlobal.set(e, (enjeuGlobal.get(e) ?? 0) + 1);
    }
  }

  const top = [...enjeuGlobal.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, topEnjeux)
    .map(([label]) => label);

  const topSet = new Set(top);
  const linkMap = new Map<string, number>();

  for (const n of filtered) {
    const typeId = n.type;
    for (const e of new Set(n.enjeux)) {
      if (!topSet.has(e)) continue;
      const key = `${typeId}\0${e}`;
      linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
    }
  }

  const links: SankeyLinkDatum[] = [];
  let maxLink = 0;
  for (const [key, value] of linkMap) {
    const [source, target] = key.split('\0');
    links.push({ source, target, value });
    maxLink = Math.max(maxLink, value);
  }

  const types: SankeySideNode[] = ALL_TYPES.filter((t) => activeTypes.has(t)).map((t) => ({
    id: t,
    label: TYPE_CONFIG[t].short,
    color: TYPE_CONFIG[t].color,
    total: links.filter((l) => l.source === t).reduce((s, l) => s + l.value, 0),
  }));

  const enjeux: SankeySideNode[] = top.map((label) => ({
    id: label,
    label,
    color: '#94a3b8',
    total: links.filter((l) => l.target === label).reduce((s, l) => s + l.value, 0),
  }));

  return { types, enjeux, links, maxLink };
}
