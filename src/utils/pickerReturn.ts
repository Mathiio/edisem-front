export const PICKER_RETURN_STORAGE_KEY = 'edisem:pickerReturn';
export const FORM_DRAFT_STORAGE_KEY = 'edisem:formDraft';

export type PickerReturnContext =
  | {
      type: 'keywords';
      viewKey: string;
      resourceTemplateId?: number;
    }
  | {
      type: 'activeField';
      fieldKey: string;
      fieldLabel: string;
      templateId: number;
      displayMode?: 'grid' | 'alphabetic';
    };

export interface PickerCreatedItem {
  id: number;
  title: string;
}

export function savePickerReturnContext(ctx: PickerReturnContext): void {
  sessionStorage.setItem(PICKER_RETURN_STORAGE_KEY, JSON.stringify(ctx));
}

export function loadPickerReturnContext(): PickerReturnContext | null {
  const raw = sessionStorage.getItem(PICKER_RETURN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PickerReturnContext;
  } catch {
    return null;
  }
}

export function clearPickerReturnContext(): void {
  sessionStorage.removeItem(PICKER_RETURN_STORAGE_KEY);
}

export function saveFormDraft(route: string, draft: Record<string, unknown>): void {
  sessionStorage.setItem(FORM_DRAFT_STORAGE_KEY, JSON.stringify({ route, draft }));
}

export function loadFormDraft(route: string): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(FORM_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { route: string; draft: Record<string, unknown> };
    if (parsed.route === route) return parsed.draft;
  } catch {
    return null;
  }
  return null;
}

export function clearFormDraft(): void {
  sessionStorage.removeItem(FORM_DRAFT_STORAGE_KEY);
}

export function buildCreateFromPickerUrl(createUrl: string, returnUrl?: string): string {
  const currentReturn = returnUrl ?? `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ fromPicker: '1', returnUrl: currentReturn });
  return `${createUrl}?${params.toString()}`;
}

export function getPickerReturnUrl(search: string): string | null {
  const returnUrl = new URLSearchParams(search).get('returnUrl');
  return returnUrl ? decodeURIComponent(returnUrl) : null;
}
