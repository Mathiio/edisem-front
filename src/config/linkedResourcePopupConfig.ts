import { inferViewCreateOnly } from '@/lib/resourceEditHelpers';

export type LinkedResourcePopupViewKey =
  | 'AnalyseCritique'
  | 'ElementsNarratifs'
  | 'ElementsEsthetiques'
  | 'Feedbacks'
  | 'schema:description';

export interface LinkedResourcePopupState {
  resourceId: string | number;
  viewKey: string;
}

type PopupEligibleView = {
  renderType?: string;
  createOnly?: boolean;
  resourceTemplateId?: number;
  resourceTemplateIds?: number[];
};

/** Vues « items » liées au parent uniquement (analyse, éléments, retours…) → popup en lecture. */
export function shouldOpenInLinkedResourcePopup(view: PopupEligibleView): boolean {
  if (view.renderType !== 'items') return false;
  return inferViewCreateOnly(view);
}

/** Sections catégories affichées dans la popup retour d'expérience. */
export const FEEDBACK_POPUP_CATEGORY_VIEWS: { key: string; title: string }[] = [
  { key: 'experimentation', title: 'Expérimentation' },
  { key: 'reactions', title: 'Réactions' },
  { key: 'perspectives', title: 'Perspectives' },
];

export function isFeedbackPopupViewKey(viewKey: string): boolean {
  return viewKey === 'Feedbacks' || viewKey === 'schema:description';
}
