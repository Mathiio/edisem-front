import { normalizeQuestionTitle } from '../hooks/useQuestionsGuideData';
import type { QuestionGuideCoverage } from '../hooks/useQuestionsGuideData';
import type { RecitNode, RecitType, ProximityLink } from '../hooks/useRecitsData';
import { imaginaireProximityWeight } from '../hooks/useRecitsData';
import { TYPE_CONFIG, ALL_TYPES } from '../recitTypeConfig';

export interface LabGraphNode {
  id: string;
  label: string;
  side: 'left' | 'right';
  color: string;
  meta?: string;
  url?: string;
}

export interface LabGraphLink {
  source: string;
  target: string;
}

export interface LabGraphModel {
  nodes: LabGraphNode[];
  links: LabGraphLink[];
}

export function buildRecitsKeywordsBipartite(
  nodes: RecitNode[],
  activeTypes: Set<RecitType>,
  topKeywords = 28,
  maxRecits = 80,
): LabGraphModel {
  const filtered = nodes.filter((n) => activeTypes.has(n.type));
  const kwCount = new Map<number, { label: string; count: number }>();

  for (const n of filtered) {
    n.keywordIds.forEach((id, i) => {
      const label = n.keywordLabels[i] ?? `Mot-clé ${id}`;
      const cur = kwCount.get(id) ?? { label, count: 0 };
      cur.count++;
      kwCount.set(id, cur);
    });
  }

  const top = [...kwCount.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topKeywords);
  const topIds = new Set(top.map(([id]) => id));

  const recitScore = filtered.map((n) => ({
    n,
    k: n.keywordIds.filter((id) => topIds.has(id)).length,
  }));
  recitScore.sort((a, b) => b.k - a.k || a.n.title.localeCompare(b.n.title, 'fr'));
  const pickedRecits = recitScore.filter((r) => r.k > 0).slice(0, maxRecits).map((r) => r.n);

  const graphNodes: LabGraphNode[] = [];
  const links: LabGraphLink[] = [];

  for (const r of pickedRecits) {
    graphNodes.push({
      id: `r-${r.id}`,
      label: r.title,
      side: 'left',
      color: TYPE_CONFIG[r.type].color,
      meta: TYPE_CONFIG[r.type].short,
      url: r.url,
    });
    r.keywordIds.forEach((id, i) => {
      if (!topIds.has(id)) return;
      const kid = `k-${id}`;
      links.push({ source: `r-${r.id}`, target: kid });
      if (!graphNodes.some((x) => x.id === kid)) {
        graphNodes.push({
          id: kid,
          label: kwCount.get(id)?.label ?? r.keywordLabels[i] ?? String(id),
          side: 'right',
          color: '#94a3b8',
        });
      }
    });
  }

  return { nodes: graphNodes, links };
}

export function buildQuestionsRecitsBipartite(
  coverage: QuestionGuideCoverage[],
  activeTypes: Set<RecitType>,
  maxQuestions = 40,
): LabGraphModel {
  const rows = coverage
    .map((c) => ({
      ...c,
      typed: c.recits.filter((r) => activeTypes.has(r.type)),
    }))
    .filter((c) => c.typed.length > 0)
    .sort((a, b) => b.typed.length - a.typed.length)
    .slice(0, maxQuestions);

  const nodes: LabGraphNode[] = [];
  const links: LabGraphLink[] = [];

  for (const { question, typed } of rows) {
    const qid = `q-${question.id}`;
    nodes.push({
      id: qid,
      label: question.title.length > 52 ? `${question.title.slice(0, 50)}…` : question.title,
      side: 'left',
      color: '#f97316',
      meta: question.domain || undefined,
    });
    for (const r of typed) {
      const rid = `r-${r.id}`;
      links.push({ source: qid, target: rid });
      if (!nodes.some((n) => n.id === rid)) {
        nodes.push({
          id: rid,
          label: r.title.length > 44 ? `${r.title.slice(0, 42)}…` : r.title,
          side: 'right',
          color: TYPE_CONFIG[r.type].color,
          meta: TYPE_CONFIG[r.type].short,
          url: r.url,
        });
      }
    }
  }

  return { nodes, links };
}

export type ImaginaireDim =
  | 'figures'
  | 'enjeux'
  | 'cadrages'
  | 'promesses'
  | 'risques'
  | 'affects'
  | 'keywords';

export interface TermYearDiff {
  term: string;
  countA: number;
  countB: number;
  delta: number;
  status: 'new' | 'lost' | 'up' | 'down' | 'stable';
}

export function buildCorpusTimeDiff(
  nodes: RecitNode[],
  activeTypes: Set<RecitType>,
  yearA: number,
  yearB: number,
  dimension: ImaginaireDim,
): TermYearDiff[] {
  const inYear = (n: RecitNode, y: number) => n.year === y && activeTypes.has(n.type);
  const setA = nodes.filter((n) => inYear(n, yearA));
  const setB = nodes.filter((n) => inYear(n, yearB));

  const countTerms = (list: RecitNode[]) => {
    const m = new Map<string, number>();
    for (const n of list) {
      const terms =
        dimension === 'keywords'
          ? n.keywordLabels
          : (n[dimension] as string[]);
      for (const t of new Set(terms)) {
        if (!t.trim()) continue;
        m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return m;
  };

  const mapA = countTerms(setA);
  const mapB = countTerms(setB);
  const all = new Set([...mapA.keys(), ...mapB.keys()]);

  const rows: TermYearDiff[] = [];
  for (const term of all) {
    const countA = mapA.get(term) ?? 0;
    const countB = mapB.get(term) ?? 0;
    const delta = countB - countA;
    let status: TermYearDiff['status'] = 'stable';
    if (countA === 0 && countB > 0) status = 'new';
    else if (countB === 0 && countA > 0) status = 'lost';
    else if (delta > 0) status = 'up';
    else if (delta < 0) status = 'down';
    rows.push({ term, countA, countB, delta, status });
  }

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.countB - a.countB);
  return rows;
}

export function listRecitYears(nodes: RecitNode[], activeTypes: Set<RecitType>): number[] {
  const years = new Set<number>();
  for (const n of nodes) {
    if (activeTypes.has(n.type) && n.year != null) years.add(n.year);
  }
  return [...years].sort((a, b) => a - b);
}

export interface PromesseRisqueCell {
  promesse: string;
  risque: string;
  count: number;
}

export function buildPromesseRisqueOppositions(
  nodes: RecitNode[],
  activeTypes: Set<RecitType>,
  topEach = 12,
): { promesses: string[]; risques: string[]; cells: PromesseRisqueCell[]; max: number } {
  const filtered = nodes.filter((n) => activeTypes.has(n.type));
  const pCount = new Map<string, number>();
  const rCount = new Map<string, number>();
  for (const n of filtered) {
    for (const p of new Set(n.promesses)) pCount.set(p, (pCount.get(p) ?? 0) + 1);
    for (const r of new Set(n.risques)) rCount.set(r, (rCount.get(r) ?? 0) + 1);
  }

  const promesses = [...pCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topEach)
    .map(([p]) => p);
  const risques = [...rCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topEach)
    .map(([r]) => r);
  const pSet = new Set(promesses);
  const rSet = new Set(risques);

  const pair = new Map<string, number>();
  for (const n of filtered) {
    const ps = [...new Set(n.promesses)].filter((p) => pSet.has(p));
    const rs = [...new Set(n.risques)].filter((r) => rSet.has(r));
    for (const p of ps) {
      for (const r of rs) {
        const key = `${p}\0${r}`;
        pair.set(key, (pair.get(key) ?? 0) + 1);
      }
    }
  }

  const cells: PromesseRisqueCell[] = [];
  let max = 0;
  for (const [key, count] of pair) {
    const [promesse, risque] = key.split('\0');
    cells.push({ promesse, risque, count });
    max = Math.max(max, count);
  }
  cells.sort((a, b) => b.count - a.count);

  return { promesses, risques, cells, max: Math.max(max, 1) };
}

export interface HubScoreRow {
  recit: RecitNode;
  degree: number;
  weightedDegree: number;
  betweennessApprox: number;
}

export function computeHubScores(
  nodes: RecitNode[],
  links: ProximityLink[],
  activeTypes: Set<RecitType>,
): HubScoreRow[] {
  const activeIds = new Set(nodes.filter((n) => activeTypes.has(n.type)).map((n) => n.id));
  const degree = new Map<number, number>();
  const weighted = new Map<number, number>();

  for (const l of links) {
    if (!activeIds.has(l.source) || !activeIds.has(l.target)) continue;
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    weighted.set(l.source, (weighted.get(l.source) ?? 0) + l.weight);
    weighted.set(l.target, (weighted.get(l.target) ?? 0) + l.weight);
  }

  const rows: HubScoreRow[] = nodes
    .filter((n) => activeIds.has(n.id))
    .map((recit) => {
      const d = degree.get(recit.id) ?? 0;
      const w = weighted.get(recit.id) ?? 0;
      const betweennessApprox = w * d;
      return { recit, degree: d, weightedDegree: w, betweennessApprox };
    });

  rows.sort(
    (a, b) =>
      b.weightedDegree - a.weightedDegree ||
      b.degree - a.degree ||
      a.recit.title.localeCompare(b.recit.title, 'fr'),
  );
  return rows;
}

export function collectVocabTerms(nodes: RecitNode[], field: keyof Pick<RecitNode, 'figures' | 'enjeux' | 'cadrages' | 'promesses' | 'risques' | 'affects'>): string[] {
  const set = new Set<string>();
  for (const n of nodes) {
    for (const t of n[field]) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
}

export interface WhatIfMatch {
  recit: RecitNode;
  weight: number;
}

export function simulateWhatIfRecit(
  nodes: RecitNode[],
  activeTypes: Set<RecitType>,
  draft: Pick<RecitNode, 'type' | 'figures' | 'enjeux' | 'cadrages' | 'promesses' | 'risques' | 'affects'>,
  minWeight = 1,
): WhatIfMatch[] {
  const virtual: RecitNode = {
    id: -1,
    title: 'Récit simulé',
    type: draft.type,
    figures: draft.figures,
    enjeux: draft.enjeux,
    cadrages: draft.cadrages,
    promesses: draft.promesses,
    risques: draft.risques,
    affects: draft.affects,
    keywordIds: [],
    keywordLabels: [],
    domaines: [],
    discusses: [],
    discussQuestionIds: [],
    date: '',
    year: null,
    url: '#',
  };

  const matches: WhatIfMatch[] = [];
  for (const n of nodes) {
    if (!activeTypes.has(n.type)) continue;
    const weight = imaginaireProximityWeight(virtual, n);
    if (weight >= minWeight) matches.push({ recit: n, weight });
  }
  matches.sort((a, b) => b.weight - a.weight || a.recit.title.localeCompare(b.recit.title, 'fr'));
  return matches;
}

export function questionCoverageIfDiscusses(
  coverage: QuestionGuideCoverage[],
  questionTitle: string,
): QuestionGuideCoverage | null {
  const key = normalizeQuestionTitle(questionTitle);
  return (
    coverage.find((c) => normalizeQuestionTitle(c.question.title) === key) ??
    coverage.find((c) => normalizeQuestionTitle(c.question.title).includes(key)) ??
    null
  );
}

export const IMAGINAIRE_DIM_LABELS: Record<ImaginaireDim, string> = {
  figures: 'Figures',
  enjeux: 'Enjeux',
  cadrages: 'Cadrages',
  promesses: 'Promesses',
  risques: 'Risques',
  affects: 'Affects',
  keywords: 'Mots-clés',
};

export { ALL_TYPES, TYPE_CONFIG };
