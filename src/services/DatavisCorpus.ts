/**
 * Endpoints Analytics (helper PHP) pour le corpus dataviz — payload minimal vs REST Omeka item complet.
 * Fallback : le front continue d'utiliser fetchAllRecitNodes() si l'action n'existe pas encore.
 */

import { edisemHelperAjaxUrl, parseFetchJsonLoose } from '@/utils/omekaApi';

import type { QuestionGuideItem } from '@/pages/visualisation/hooks/useQuestionsGuideData';
import type { RecitNode, RecitType } from '@/pages/visualisation/hooks/useRecitsData';

const datavisUrl = (action: string, extra?: Record<string, string | number | undefined>) =>
  edisemHelperAjaxUrl('Analytics', { json: '1', action, ...extra });

export interface RecitsCorpusApiPayload {
  nodes: RecitNode[];
  generatedAt?: string;
}

export interface QuestionsGuideCoverageRow {
  questionId: number;
  recitIds: number[];
}

export interface QuestionsGuideApiPayload {
  questions: QuestionGuideItem[];
  coverage: QuestionsGuideCoverageRow[];
  generatedAt?: string;
}

const RECIT_TEMPLATE_TO_TYPE: Record<number, RecitType> = {
  119: 'recit_citoyen',
  120: 'recit_mediatique',
  124: 'recit_scientifique',
  103: 'recit_artistique',
  117: 'recit_techno_industriel',
};

const TYPE_TO_URL: Record<RecitType, string> = {
  recit_citoyen: '/corpus/recit-citoyen',
  recit_mediatique: '/corpus/recit-mediatique',
  recit_scientifique: '/corpus/recit-scientifique',
  recit_artistique: '/corpus/recit-artistique',
  recit_techno_industriel: '/corpus/recit-techno-industriel',
};

function normalizeRecitNode(raw: RecitNode): RecitNode {
  const type = raw.type;
  const url =
    raw.url && raw.url !== '#'
      ? raw.url
      : type && raw.id
        ? `${TYPE_TO_URL[type]}/${raw.id}`
        : '#';
  return {
    ...raw,
    url,
    discussQuestionIds: Array.isArray(raw.discussQuestionIds) ? raw.discussQuestionIds : [],
  };
}

/** Corpus récits (5 templates) — champs Imaginaire + discusses + mots-clés. */
export async function fetchRecitsCorpusFromApi(): Promise<RecitNode[] | null> {
  try {
    const res = await fetch(datavisUrl('getRecitsCorpus'));
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) return null;
    const data = (await parseFetchJsonLoose(res)) as RecitsCorpusApiPayload & { error?: string };
    if (data.error || !Array.isArray(data.nodes)) return null;
    return data.nodes.map(normalizeRecitNode);
  } catch {
    return null;
  }
}

/** Référentiel questions guide + couverture (ids récits par question). */
export async function fetchQuestionsGuideFromApi(): Promise<QuestionsGuideApiPayload | null> {
  try {
    const res = await fetch(datavisUrl('getQuestionsGuideBundle'));
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) return null;
    const data = (await parseFetchJsonLoose(res)) as QuestionsGuideApiPayload & { error?: string };
    if (data.error || !Array.isArray(data.questions) || !Array.isArray(data.coverage)) return null;
    return data;
  } catch {
    return null;
  }
}

export { RECIT_TEMPLATE_TO_TYPE, TYPE_TO_URL };
