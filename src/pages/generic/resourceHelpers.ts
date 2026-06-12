import type { UserData } from '@/hooks/useAuth';
import { getResourceConfigByTemplateId, isParentLinkedOnlyResourceType, getParentLinkedOnlyTemplateIds } from '@/config/resourceConfig';

/** Templates pour lesquels l'utilisateur connecté est pré-rempli comme contributeur/intervenant à la création */
export interface AutoContributorConfig {
  property: string;
  fieldKey: string;
}

export const AUTO_CONTRIBUTOR_BY_TEMPLATE: Record<number, AutoContributorConfig> = {
  101: { property: 'schema:contributor', fieldKey: 'contributors' }, // analyse critique
  108: { property: 'schema:agent', fieldKey: 'contributors' }, // expérimentation
  127: { property: 'schema:agent', fieldKey: 'contributors' }, // expérimentation étudiant
  110: { property: 'schema:contributor', fieldKey: 'contributors' }, // retour d'expérience
  128: { property: 'schema:contributor', fieldKey: 'contributors' }, // retour d'expérience étudiant
  114: { property: 'dcterms:contributor', fieldKey: 'contributors' }, // outil chercheur
  129: { property: 'dcterms:contributor', fieldKey: 'contributors' }, // outil étudiant
};

export const getAutoContributorConfig = (templateId?: number): AutoContributorConfig | undefined =>
  templateId != null ? AUTO_CONTRIBUTOR_BY_TEMPLATE[templateId] : undefined;

const readStoredUser = (): UserData | null => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserData) : null;
  } catch {
    return null;
  }
};

export const buildConnectedUserContributorItem = (
  userData?: UserData | null,
): { id: number; 'o:id': number; title: string; name: string } | null => {
  const storedUser = userData ?? readStoredUser();
  const parsedId = storedUser?.id ?? (localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')!, 10) : NaN);
  if (!Number.isFinite(parsedId)) return null;

  const title =
    [storedUser?.firstname, storedUser?.lastname].filter(Boolean).join(' ').trim() || `Item ${parsedId}`;

  return { id: parsedId, 'o:id': parsedId, title, name: title };
};

export const buildAutoContributorFormValues = (
  templateId: number | undefined,
  userData?: UserData | null,
  options?: { includePersonnes?: boolean },
): Record<string, unknown> | null => {
  const autoConfig = getAutoContributorConfig(templateId);
  const item = buildConnectedUserContributorItem(userData);
  if (!autoConfig || !item) return null;

  const values: Record<string, unknown> = {
    [autoConfig.fieldKey]: [item],
    [autoConfig.property]: [item],
  };
  if (options?.includePersonnes) {
    values.personnes = [item];
  }
  return values;
};

const PARENT_LINKED_ONLY_TEMPLATE_IDS = new Set(getParentLinkedOnlyTemplateIds());

export const CREATE_ONLY_TEMPLATE_IDS = PARENT_LINKED_ONLY_TEMPLATE_IDS;

type ViewTemplateMeta = {
  createOnly?: boolean;
  resourceTemplateId?: number;
  resourceTemplateIds?: number[];
};

export const isCreateOnlyTemplate = (templateId?: number): boolean =>
  templateId != null && PARENT_LINKED_ONLY_TEMPLATE_IDS.has(templateId);

export const isCreateOnlyView = (viewOption: ViewTemplateMeta | undefined, resourceTemplateId?: number): boolean =>
  viewOption?.createOnly ?? isCreateOnlyTemplate(resourceTemplateId) ?? false;

/** Analyses critiques, retours d'expérience, etc. — suppression Omeka depuis le parent (popup) */
export const shouldHardDeleteLinkedResource = (resourceTemplateId?: number): boolean => {
  if (resourceTemplateId == null) return false;
  const config = getResourceConfigByTemplateId(resourceTemplateId);
  return isParentLinkedOnlyResourceType(config?.type);
};

/** Résout le templateId principal d'une vue (create-only, picker, onglet enfant). */
export const resolveViewResourceTemplateId = (
  viewKey: string,
  viewOption?: ViewTemplateMeta,
  options?: { resourceTemplateIds?: number[] },
  defaults: { single?: Record<string, number>; multi?: Record<string, number[]> } = {},
): number | undefined => {
  if (options?.resourceTemplateIds?.length === 1) {
    return options.resourceTemplateIds[0];
  }
  if (options?.resourceTemplateIds) {
    return undefined;
  }
  if (viewOption?.resourceTemplateId != null) {
    return viewOption.resourceTemplateId;
  }
  if (defaults.single?.[viewKey] != null) {
    return defaults.single[viewKey];
  }
  const fromList = viewOption?.resourceTemplateIds?.find((id) => isCreateOnlyTemplate(id));
  return fromList;
};

export const getResourceFallbackTitle = (id: number | string, templateId?: number | string): string => {
  if (templateId) {
    const config = getResourceConfigByTemplateId(templateId);
    if (config) return `${config.label} #${id}`;
  }
  return `Item #${id}`;
};

export const getLinkedResourceId = (item: any): string | number | undefined => {
  if (item == null) return undefined;
  const id = item.id ?? item['o:id'] ?? item.value_resource_id;
  return id !== undefined && id !== null ? id : undefined;
};

export const getResourceOwnerId = (item: any): number | undefined => {
  if (item == null) return undefined;
  const raw = item.ownerId ?? item.owner_id ?? item['o:owner']?.['o:id'];
  if (raw == null) return undefined;
  const id = Number(raw);
  return Number.isFinite(id) ? id : undefined;
};

/** Ressource éditable si créée dans la session ou si l'utilisateur courant est o:owner */
export const canEditLinkedResource = (
  item: { id?: string | number; ownerId?: number },
  currentOmekaUserId: number | null | undefined,
  userCreatedResourceIds?: Set<string>,
): boolean => {
  if (item.id != null && userCreatedResourceIds?.has(String(item.id))) {
    return true;
  }
  const ownerId = item.ownerId ?? getResourceOwnerId(item);
  if (ownerId == null || !currentOmekaUserId) return false;
  return ownerId === currentOmekaUserId;
};

/** Suppression définitive — propriétaire Omeka uniquement */
export const canDeleteLinkedResource = canEditLinkedResource;

const resolveLinkedItemTemplateId = (
  item: { resource_template_id?: number | string; template?: number | string; template_id?: number | string },
  viewTemplateId?: number,
): number | undefined => {
  if (viewTemplateId != null) return viewTemplateId;
  const raw = item.resource_template_id ?? item.template ?? item.template_id;
  if (raw == null) return undefined;
  const id = Number(raw);
  return Number.isFinite(id) ? id : undefined;
};

/**
 * Afficher la croix « délier » depuis une ressource parente.
 * - Analyses / retours (parentLinkedOnly) : propriétaire seulement (+ suppression Omeka)
 * - Outils, bibliographies, etc. : délier sans supprimer l'item transverse
 */
export const canUnlinkLinkedResource = (
  item: { id?: string | number; ownerId?: number; resource_template_id?: number | string; template?: number | string },
  viewTemplateId: number | undefined,
  currentOmekaUserId: number | null | undefined,
  userCreatedResourceIds?: Set<string>,
): boolean => {
  const templateId = resolveLinkedItemTemplateId(item, viewTemplateId);
  if (shouldHardDeleteLinkedResource(templateId)) {
    return canDeleteLinkedResource(item, currentOmekaUserId, userCreatedResourceIds);
  }
  return true;
};

export const getLinkedResourceTitle = (item: any, templateId?: number | string): string => {
  const title =
    item?.title ||
    item?.name ||
    item?.display_title ||
    item?.['o:title'] ||
    item?.['dcterms:title']?.[0]?.['@value'];
  if (title) return String(title);
  const id = getLinkedResourceId(item);
  return id !== undefined ? getResourceFallbackTitle(id, templateId) : '';
};
