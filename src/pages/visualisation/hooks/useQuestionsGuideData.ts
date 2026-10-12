import { useCallback, useEffect, useMemo, useState } from 'react';

import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';
import {
  fetchQuestionsGuideFromApi,
  type QuestionsGuideCoverageRow,
} from '@/services/DatavisCorpus';

import {
  clearQuestionsGuideCache,
  readQuestionsGuideCache,
  writeQuestionsGuideCache,
} from './questionsGuideCache';
import { useRecitsCorpusOptional } from './RecitsCorpusContext';
import { fetchAllRecitNodes, type RecitNode } from './useRecitsData';

export const QUESTIONS_GUIDE_TEMPLATE_ID = 134;

export interface QuestionGuideItem {
  id: number;
  title: string;
  identifier: string;
  description: string;
  domain: string;
  position: number | null;
}

export interface QuestionGuideCoverage {
  question: QuestionGuideItem;
  recits: RecitNode[];
}

function extractLiteral(item: Record<string, unknown>, property: string): string {
  const vals = item[property] as Array<{ '@value'?: string }> | undefined;
  const v = vals?.[0]?.['@value'];
  return typeof v === 'string' ? v.trim() : '';
}

function extractLinkedLabel(item: Record<string, unknown>, property: string): string {
  const vals = item[property] as Array<{ display_title?: string }> | undefined;
  const v = vals?.[0]?.display_title;
  return typeof v === 'string' ? v.trim() : '';
}

function parsePosition(raw: string): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function normalizeQuestionTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function fetchAllQuestionsGuide(): Promise<QuestionGuideItem[]> {
  const items: QuestionGuideItem[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      omekaApiUrl(
        `${OMEKA_API_BASE}items?resource_template_id=${QUESTIONS_GUIDE_TEMPLATE_ID}&per_page=100&page=${page}`,
      ),
    );
    if (!res.ok) break;
    const batch: Record<string, unknown>[] = await res.json();
    if (!batch?.length) break;

    for (const item of batch) {
      const id = item['o:id'] as number | undefined;
      if (typeof id !== 'number') continue;
      items.push({
        id,
        title: (item['o:title'] as string) ?? extractLiteral(item, 'dcterms:title') ?? 'Sans titre',
        identifier: extractLiteral(item, 'dcterms:identifier'),
        description: extractLiteral(item, 'dcterms:description'),
        domain: extractLinkedLabel(item, 'dcterms:subject'),
        position: parsePosition(extractLiteral(item, 'schema:position')),
      });
    }

    if (batch.length < 100) break;
    page++;
  }

  items.sort((a, b) => {
    if (a.position != null && b.position != null && a.position !== b.position) {
      return a.position - b.position;
    }
    if (a.position != null && b.position == null) return -1;
    if (a.position == null && b.position != null) return 1;
    return a.title.localeCompare(b.title, 'fr');
  });

  return items;
}

function mergeRecitsUnique(...groups: RecitNode[][]): RecitNode[] {
  const byId = new Map<number, RecitNode>();
  for (const group of groups) {
    for (const r of group) byId.set(r.id, r);
  }
  return [...byId.values()];
}

export function buildQuestionCoverage(
  questions: QuestionGuideItem[],
  recits: RecitNode[],
): QuestionGuideCoverage[] {
  const titleToQuestion = new Map<string, QuestionGuideItem>();
  const questionById = new Map(questions.map((q) => [q.id, q]));
  for (const q of questions) {
    titleToQuestion.set(normalizeQuestionTitle(q.title), q);
  }

  const recitsByQuestionKey = new Map<string, RecitNode[]>();
  const recitsByQuestionId = new Map<number, RecitNode[]>();

  for (const recit of recits) {
    for (const qid of recit.discussQuestionIds ?? []) {
      if (!questionById.has(qid)) continue;
      const list = recitsByQuestionId.get(qid) ?? [];
      if (!list.some((r) => r.id === recit.id)) list.push(recit);
      recitsByQuestionId.set(qid, list);
    }
    for (const raw of recit.discusses) {
      const key = normalizeQuestionTitle(raw);
      if (!key) continue;
      const list = recitsByQuestionKey.get(key) ?? [];
      if (!list.some((r) => r.id === recit.id)) list.push(recit);
      recitsByQuestionKey.set(key, list);
    }
  }

  return questions.map((question) => ({
    question,
    recits: mergeRecitsUnique(
      recitsByQuestionId.get(question.id) ?? [],
      recitsByQuestionKey.get(normalizeQuestionTitle(question.title)) ?? [],
    ),
  }));
}

export function buildQuestionCoverageFromIds(
  questions: QuestionGuideItem[],
  recits: RecitNode[],
  rows: QuestionsGuideCoverageRow[],
): QuestionGuideCoverage[] {
  const recitsById = new Map(recits.map((r) => [r.id, r]));
  const byQuestion = new Map(rows.map((r) => [r.questionId, r.recitIds]));
  return questions.map((question) => ({
    question,
    recits: (byQuestion.get(question.id) ?? [])
      .map((id) => recitsById.get(id))
      .filter((r): r is RecitNode => r != null),
  }));
}

export interface QuestionsGuideDataState {
  questions: QuestionGuideItem[];
  coverage: QuestionGuideCoverage[];
  recits: RecitNode[];
  domains: string[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useQuestionsGuideData(): QuestionsGuideDataState {
  const corpus = useRecitsCorpusOptional();
  const [fallbackRecits, setFallbackRecits] = useState<RecitNode[]>([]);
  const [fallbackRecitsLoading, setFallbackRecitsLoading] = useState(!corpus);
  const [fallbackRecitsError, setFallbackRecitsError] = useState<string | null>(null);

  const loadFallbackRecits = useCallback(async () => {
    setFallbackRecitsLoading(true);
    setFallbackRecitsError(null);
    try {
      setFallbackRecits(await fetchAllRecitNodes());
    } catch (e) {
      setFallbackRecitsError(String(e));
      setFallbackRecits([]);
    } finally {
      setFallbackRecitsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (corpus) return;
    void loadFallbackRecits();
  }, [corpus, loadFallbackRecits]);

  const recits = corpus?.nodes ?? fallbackRecits;
  const recitsLoading = corpus?.loading ?? fallbackRecitsLoading;
  const recitsError = corpus?.error ?? fallbackRecitsError;
  const reloadRecits = corpus?.reload ?? loadFallbackRecits;

  const cachedGuide = readQuestionsGuideCache();
  const [questions, setQuestions] = useState<QuestionGuideItem[]>(() => cachedGuide?.questions ?? []);
  const [coverageRows, setCoverageRows] = useState<QuestionsGuideCoverageRow[] | null>(
    () => cachedGuide?.coverage ?? null,
  );
  const [questionsLoading, setQuestionsLoading] = useState(() => !cachedGuide?.questions?.length);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setQuestionsError(null);
    const cached = readQuestionsGuideCache();
    if (cached?.questions?.length) {
      setQuestions(cached.questions);
      setCoverageRows(cached.coverage);
      setQuestionsLoading(false);
    } else {
      setQuestionsLoading(true);
    }

    try {
      const api = await fetchQuestionsGuideFromApi();
      if (api?.questions?.length) {
        setQuestions(api.questions);
        setCoverageRows(api.coverage);
        writeQuestionsGuideCache(api.questions, api.coverage);
      } else if (!cached?.questions?.length) {
        const fallback = await fetchAllQuestionsGuide();
        setQuestions(fallback);
        setCoverageRows(null);
      }
    } catch (e) {
      if (!cached?.questions?.length) {
        setQuestionsError(String(e));
        setQuestions([]);
        setCoverageRows(null);
      }
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const coverage = useMemo(() => {
    if (coverageRows && recits.length) {
      return buildQuestionCoverageFromIds(questions, recits, coverageRows);
    }
    return buildQuestionCoverage(questions, recits);
  }, [questions, recits, coverageRows]);

  const domains = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.domain) set.add(q.domain);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [questions]);

  const reload = useCallback(() => {
    clearQuestionsGuideCache();
    reloadRecits();
    void loadQuestions();
  }, [reloadRecits, loadQuestions]);

  return {
    questions,
    coverage,
    recits,
    domains,
    loading: recitsLoading || questionsLoading,
    error: recitsError ?? questionsError,
    reload,
  };
}
