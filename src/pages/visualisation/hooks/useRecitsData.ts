import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchRecitsCorpusFromApi } from '@/services/DatavisCorpus';

import { useRecitsCorpusOptional } from './RecitsCorpusContext';

import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';

// Template IDs → type de récit
const TEMPLATE_TO_TYPE: Record<number, RecitType> = {
  119: 'recit_citoyen',
  120: 'recit_mediatique',
  124: 'recit_scientifique',
  103: 'recit_artistique',
  117: 'recit_techno_industriel',
};

export type RecitType =
  | 'recit_citoyen'
  | 'recit_mediatique'
  | 'recit_scientifique'
  | 'recit_artistique'
  | 'recit_techno_industriel';

export interface RecitNode {
  id: number;
  title: string;
  type: RecitType;
  // Propriétés "Imaginaires de l'IA" (valeurs string)
  figures: string[];        // storyline:hasRole (vocab 55)
  enjeux: string[];         // storyline:hasTheme (vocab 50)
  cadrages: string[];       // genstory:hasParam (vocab 56)
  promesses: string[];      // genstory:hasMonde (vocab 51)
  risques: string[];        // storyline:hasRisk (vocab 54)
  affects: string[];        // storyline:hasAffect (vocab 53)
  // Mots-clés thésaurus (IDs des items Omeka)
  keywordIds: number[];
  keywordLabels: string[];
  // Domaine(s) du récit
  domaines: string[];
  /** Questions guide (cito:discusses — titres affichés) */
  discusses: string[];
  /** Liens directs vers items Questions guide (template 134), si type resource */
  discussQuestionIds: number[];
  // Date brute (dcterms:issued, sinon dcterms:date) et année extraite
  date: string;
  year: number | null;
  // URL page EDISEM
  url: string;
}

export interface ProximityLink {
  source: number;
  target: number;
  weight: number;
  // Détail des propriétés partagées (pour tooltip)
  sharedFigures: string[];
  sharedEnjeux: string[];
  sharedCadrages: string[];
  sharedAffects: string[];
  sharedPromesses: string[];
  sharedRisques: string[];
  sharedKeywords: string[];
}

/** Extrait les valeurs string d'une propriété custom vocab */
function extractStringValues(item: any, property: string): string[] {
  const vals: any[] = item[property] ?? [];
  return vals
    .map((v: any) => v['@value'] as string | undefined)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

/** Extrait les labels de ressources liées (display_title) */
function extractLinkedLabels(item: any, property: string): string[] {
  const vals: any[] = item[property] ?? [];
  return vals
    .map((v: any) => v.display_title as string | undefined)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

/** Extrait les IDs de ressources liées (value_resource_id) */
function extractLinkedIds(item: any, property: string): number[] {
  const vals: any[] = item[property] ?? [];
  return vals
    .map((v: any) => v.value_resource_id as number | undefined)
    .filter((v): v is number => typeof v === 'number');
}

/**
 * cito:discusses — souvent type resource (value_resource_id + display_title), pas @value literal.
 */
function extractDiscusses(item: any): { titles: string[]; questionIds: number[] } {
  const vals: any[] = item['cito:discusses'] ?? [];
  const titles: string[] = [];
  const questionIds: number[] = [];
  const seenTitle = new Set<string>();
  const seenId = new Set<number>();

  for (const v of vals) {
    if (typeof v.value_resource_id === 'number') {
      const id = v.value_resource_id;
      if (!seenId.has(id)) {
        seenId.add(id);
        questionIds.push(id);
      }
    }
    const raw = (v['@value'] ?? v.display_title) as string | undefined;
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (t && !seenTitle.has(t)) {
        seenTitle.add(t);
        titles.push(t);
      }
    }
  }

  return { titles, questionIds };
}

const TYPE_TO_URL: Record<RecitType, string> = {
  recit_citoyen: '/corpus/recit-citoyen',
  recit_mediatique: '/corpus/recit-mediatique',
  recit_scientifique: '/corpus/recit-scientifique',
  recit_artistique: '/corpus/recit-artistique',
  recit_techno_industriel: '/corpus/recit-techno-industriel',
};

/** Les dates Omeka sont du texte libre (« 13 août 2025 », « 2014-2019 », « Mai 2024 (…) ») : on garde la première année. */
function extractYear(raw: string): number | null {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

/** Normalise un item Omeka brut en RecitNode */
function normalizeItem(item: any): RecitNode | null {
  const templateId: number = item['o:resource_template']?.['o:id'];
  const type = TEMPLATE_TO_TYPE[templateId];
  if (!type) return null;

  const date = (
    extractStringValues(item, 'dcterms:issued')[0] ??
    extractStringValues(item, 'dcterms:date')[0] ??
    ''
  ).trim();

  const { titles: discusses, questionIds: discussQuestionIds } = extractDiscusses(item);

  return {
    id: item['o:id'],
    title: item['o:title'] ?? 'Sans titre',
    type,
    figures: extractStringValues(item, 'storyline:hasRole'),
    enjeux: extractStringValues(item, 'storyline:hasTheme'),
    cadrages: extractStringValues(item, 'genstory:hasParam'),
    promesses: extractStringValues(item, 'genstory:hasMonde'),
    risques: extractStringValues(item, 'storyline:hasRisk'),
    affects: extractStringValues(item, 'storyline:hasAffect'),
    keywordIds: extractLinkedIds(item, 'jdc:hasConcept'),
    keywordLabels: extractLinkedLabels(item, 'jdc:hasConcept'),
    domaines: extractLinkedLabels(item, 'dcterms:subject'),
    discusses,
    discussQuestionIds,
    date,
    year: extractYear(date),
    url: `${TYPE_TO_URL[type]}/${item['o:id']}`,
  };
}

/** Récupère toutes les pages d'un template donné */
async function fetchAllByTemplate(templateId: number): Promise<RecitNode[]> {
  const nodes: RecitNode[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      omekaApiUrl(`${OMEKA_API_BASE}items?resource_template_id[]=${templateId}&per_page=100&page=${page}`),
    );
    if (!res.ok) break;
    const items: any[] = await res.json();
    if (!items || items.length === 0) break;

    for (const item of items) {
      const node = normalizeItem(item);
      if (node) nodes.push(node);
    }

    if (items.length < 100) break;
    page++;
  }

  return nodes;
}

/** Charge tous les récits (5 templates) — API Analytics si dispo, sinon REST Omeka paginé. */
export async function fetchAllRecitNodes(): Promise<RecitNode[]> {
  const fromApi = await fetchRecitsCorpusFromApi();
  if (fromApi?.length) return fromApi;

  const templateIds = Object.keys(TEMPLATE_TO_TYPE).map(Number);
  const results = await Promise.allSettled(templateIds.map(fetchAllByTemplate));
  const nodes: RecitNode[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') nodes.push(...result.value);
  }
  return nodes;
}

/** Filtre des liens pré-calculés (minWeight=1) sans recalculer O(n²). */
export function filterProximityLinks(links: ProximityLink[], minWeight: number): ProximityLink[] {
  if (minWeight <= 1) return links;
  return links.filter((l) => l.weight >= minWeight);
}

/** Nombre de dimensions Imaginaire de l'IA partagées (0–6), hors mots-clés. */
export function imaginaireProximityWeight(a: RecitNode, b: RecitNode): number {
  let w = 0;
  if (intersection(a.figures, b.figures).length > 0) w++;
  if (intersection(a.enjeux, b.enjeux).length > 0) w++;
  if (intersection(a.cadrages, b.cadrages).length > 0) w++;
  if (intersection(a.affects, b.affects).length > 0) w++;
  if (intersection(a.promesses, b.promesses).length > 0) w++;
  if (intersection(a.risques, b.risques).length > 0) w++;
  return w;
}

/** Intersection de deux tableaux de strings */
function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

/** Intersection de deux tableaux de numbers */
function intersectionNumbers(a: number[], b: number[]): number[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

/**
 * Calcule les liens de proximité entre tous les récits.
 *
 * Le `weight` est le nombre de **dimensions** Imaginaires de l'IA partagées
 * (figures, enjeux, cadrages, promesses, risques, affects — max 6).
 * Les mots-clés sont stockés pour le tooltip mais n'influencent pas le poids
 * afin d'éviter l'inflation due aux nombreux tags communs sur l'IA.
 */
export function computeProximityLinks(nodes: RecitNode[], minWeight = 1): ProximityLink[] {
  const links: ProximityLink[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      const sharedFigures   = intersection(a.figures,   b.figures);
      const sharedEnjeux    = intersection(a.enjeux,    b.enjeux);
      const sharedCadrages  = intersection(a.cadrages,  b.cadrages);
      const sharedAffects   = intersection(a.affects,   b.affects);
      const sharedPromesses = intersection(a.promesses, b.promesses);
      const sharedRisques   = intersection(a.risques,   b.risques);

      const sharedKeywordIds = intersectionNumbers(a.keywordIds, b.keywordIds);
      const keywordIdToLabel = new Map<number, string>();
      a.keywordIds.forEach((id, idx) => {
        if (a.keywordLabels[idx]) keywordIdToLabel.set(id, a.keywordLabels[idx]);
      });
      const sharedKeywords = sharedKeywordIds.map((id) => keywordIdToLabel.get(id) ?? String(id));

      // Poids = nombre de dimensions ayant au moins 1 valeur partagée (max 6)
      const weight =
        (sharedFigures.length   > 0 ? 1 : 0) +
        (sharedEnjeux.length    > 0 ? 1 : 0) +
        (sharedCadrages.length  > 0 ? 1 : 0) +
        (sharedAffects.length   > 0 ? 1 : 0) +
        (sharedPromesses.length > 0 ? 1 : 0) +
        (sharedRisques.length   > 0 ? 1 : 0);

      if (weight >= minWeight) {
        links.push({
          source: a.id,
          target: b.id,
          weight,
          sharedFigures,
          sharedEnjeux,
          sharedCadrages,
          sharedAffects,
          sharedPromesses,
          sharedRisques,
          sharedKeywords,
        });
      }
    }
  }

  return links;
}

export interface RecitsDataState {
  nodes: RecitNode[];
  links: ProximityLink[];
  loading: boolean;
  error: string | null;
}

/** Hook principal — utilise le cache RecitsCorpusProvider si présent. */
export function useRecitsData(minWeight = 1): RecitsDataState & { reload: () => void } {
  const corpus = useRecitsCorpusOptional();
  const linksFromCorpus = useMemo(
    () => (corpus ? filterProximityLinks(corpus.baseLinks, minWeight) : []),
    [corpus, minWeight],
  );

  const [fallback, setFallback] = useState<RecitsDataState>({
    nodes: [],
    links: [],
    loading: true,
    error: null,
  });

  const loadFallback = useCallback(async () => {
    setFallback((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const nodes = await fetchAllRecitNodes();
      const baseLinks = computeProximityLinks(nodes, 1);
      setFallback({
        nodes,
        links: filterProximityLinks(baseLinks, minWeight),
        loading: false,
        error: null,
      });
    } catch (err) {
      setFallback({ nodes: [], links: [], loading: false, error: String(err) });
    }
  }, [minWeight]);

  useEffect(() => {
    if (corpus) return;
    void loadFallback();
  }, [corpus, loadFallback]);

  if (corpus) {
    return {
      nodes: corpus.nodes,
      links: linksFromCorpus,
      loading: corpus.loading,
      error: corpus.error,
      reload: corpus.reload,
    };
  }

  return { ...fallback, reload: loadFallback };
}
