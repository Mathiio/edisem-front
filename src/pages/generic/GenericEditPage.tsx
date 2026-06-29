import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useBlocker } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { Spinner } from '@heroui/react';
import { addToast } from '@/theme/components';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, modalCloseButtonClasses, ModalCloseIcon } from '@/theme/components';
import { Button } from '@/theme/components/button';
import { ModalTitle } from '@/components/ui/ModalTitle';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  dropdownContentClassNames,
  dropdownTriggerButtonClass,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
} from '@/theme/components/dropdown';
import { Select, SelectItem } from '@/theme/components/select';
import { FormTextInput, FormAutoResizeTextareaInput, FormDateInput, formFieldLabelClass } from '@/components/features/forms/edit/FormFields';
import { KeywordsCarouselSkeleton } from '@/components/features/resource-links/KeywordsCards';
import { Layouts } from '@/components/layout/Layouts';
import { SearchModal, SearchModalRef } from '@/components/features/shared/search/SearchModal';
import { ArrowIcon, AddIcon } from '@/components/ui/icons';
import { AlertModal } from '@/components/ui/AlertModal';
import { EditSaveBar } from '@/components/ui/EditSaveBar';
import { EditModeBanner } from '@/components/ui/EditModeBanner';
import { ResourcePicker } from '@/components/features/forms/modals/ResourcePicker';
import { getTemplatePropertiesMap } from '@/services/Items';
import { getEditExitPath, getResourceEditUrl, getGlobalAdminEditUrl, getResourceConfigByTemplateId, getRessourceLabel, TEMPLATE_ID_TO_TYPE, resolveResourceTypeFromOmekaItem, OMEKA_PROPERTY_IDS } from '@/config/resourceConfig';
import {
  buildConferenceTypeOmekaValue,
  CONFERENCE_TEMPLATE_ID,
  CONFERENCE_TYPE_VOCAB_ID,
  isConferenceTypeOmekaProperty,
} from '@/config/conferenceTypeConfig';
import { QUICK_CREATE_CONFIGS } from '@/components/features/forms/modals/QuickCreateModal';
import {
  getLinkedResourceId,
  getLinkedResourceTitle,
  getResourceOwnerId,
  getResourceFallbackTitle,
  getAutoContributorConfig,
  buildAutoContributorFormValues,
  buildConnectedUserContributorItem,
  isCreateOnlyView,
  resolveViewResourceTemplateId,
  shouldHardDeleteLinkedResource,
  canDeleteLinkedResource,
} from '@/lib/resourceEditHelpers';
import { deleteUserResource } from '@/services/UserSpace';
import { useFormState } from '@/hooks/useFormState';
import { useAuth } from '@/hooks/useAuth';
import { OMEKA_API_BASE as API_BASE, omekaApiUrl, omekaAuthErrorMessage } from '@/utils/omekaApi';
import { resolveOmekaPropertyId, deleteMedia } from './simplifiedConfigAdapter';
import { MediaFile, DEFAULT_AUTHOR_TEMPLATE_IDS } from '@/components/features/forms/edit/MediaDropzone';
import { GenericDetailPageConfig, PageMode } from './config';

// ================================
// Re-export de l'interface des props partagées
// ================================
interface PendingLink {
  linkedField: string;
  resourceId: string | number;
  resourceTitle?: string;
}

export interface GenericEditPageProps {
  config: GenericDetailPageConfig;
  initialMode?: PageMode;
  itemId?: string;
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  onCreateNewResource?: (viewKey: string, resourceTemplateId?: number) => void;
  onSaveComplete?: (savedItemId: string | number, savedItemTitle?: string) => void;
  onEditResource?: (viewKey: string, resourceId: string | number, templateId?: number) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  pendingLinks?: PendingLink[];
  onPendingLinksProcessed?: () => void;
  updatedResources?: Record<string, { title?: string; thumbnail?: string }>;
  saveLabel?: string;
  resourceTree?: { root: string; children: { title: string; isActive: boolean }[] };
  parentResourceId?: string | number;
  parentResourceTitle?: string;
  /** Déjà résolu par GenericDetailPage */
  isDraft?: boolean;
}

// ================================
// Styles partagés
// ================================
const selectedResourceChipClass = 'flex items-center gap-2 pl-4 pr-2 h-12 border-2 border-c3 text-c6 rounded-xl text-sm';
const selectedResourceRemoveButtonClass = [
  modalCloseButtonClasses,
  'inline-flex items-center justify-center shrink-0 p-1 text-sm',
].join(' ');

// ================================
// Composant local: sélecteur depuis un item set Omeka
// ================================
const ItemSetFormField: React.FC<{
  label: string;
  itemSetId: number;
  multiple?: boolean;
  value?: { id: number; title: string }[];
  onChange: (items: { id: number; title: string }[]) => void;
}> = ({ label, itemSetId, multiple = false, value = [], onChange }) => {
  const [items, setItems] = React.useState<{ id: number; title: string }[]>([]);

  React.useEffect(() => {
    fetch(`/omk/api/items?item_set_id=${itemSetId}&per_page=100`)
      .then((r) => r.json())
      .then((data) =>
        setItems(
          data.map((item: any) => ({
            id: item['o:id'],
            title: item['o:title'] ?? `Item ${item['o:id']}`,
          }))
        )
      )
      .catch(console.error);
  }, [itemSetId]);

  const selected = Array.isArray(value) ? value : [];

  if (multiple) {
    const available = items.filter((item) => !selected.some((s) => s.id === item.id));
    return (
      <div className='w-full flex flex-col gap-2'>
        <label className={formFieldLabelClass}>{label}</label>
        <div className='flex flex-wrap gap-2 items-center'>
          {selected.map((item) => (
            <div key={item.id} className={selectedResourceChipClass}>
              <span>{item.title || `Item ${item.id}`}</span>
              <button
                type='button'
                onClick={() => onChange(selected.filter((s) => s.id !== item.id))}
                className={selectedResourceRemoveButtonClass}
                aria-label='Retirer'>
                <ModalCloseIcon />
              </button>
            </div>
          ))}
          {available.length > 0 && (
            <Dropdown classNames={dropdownContentClassNames}>
              <DropdownTrigger>
                <button type='button' className={dropdownTriggerButtonClass}>
                  <AddIcon size={14} className='text-c4 shrink-0' />
                  Ajouter
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label={label} className='p-2 max-h-64 overflow-auto' classNames={dropdownMenuClassNames}>
                {available.map((item) => (
                  <DropdownItem
                    key={String(item.id)}
                    className={dropdownMenuItemClass}
                    onPress={() => onChange([...selected, item])}>
                    <div className={`${dropdownItemInnerPadding} rounded-lg text-c6`}>{item.title}</div>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='w-full flex flex-col gap-2'>
      <label className={formFieldLabelClass}>{label}</label>
      <Select
        selectedKeys={selected.length > 0 ? [String(selected[0].id)] : []}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0];
          if (!key) return;
          const found = items.find((i) => String(i.id) === String(key));
          if (found) onChange([found]);
        }}>
        {items.map((item) => (
          <SelectItem key={String(item.id)}>{item.title}</SelectItem>
        ))}
      </Select>
    </div>
  );
};

// ================================
// Animations
// ================================
const fadeIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ================================
// Composant principal GenericEditPage
// ================================
export const GenericEditPage: React.FC<GenericEditPageProps> = ({
  config,
  initialMode = 'edit',
  itemId: propItemId,
  onSave,
  onCancel,
  onCreateNewResource,
  onEditResource,
  onSaveComplete,
  onDirtyChange,
  pendingLinks,
  onPendingLinksProcessed,
  updatedResources,
  saveLabel,
  resourceTree,
  parentResourceId,
  parentResourceTitle,
  isDraft: isDraftProp = false,
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = initialMode === 'create' && propItemId === undefined ? undefined : propItemId || paramId;
  const navigate = useNavigate();
  const { userData } = useAuth();
  const isGlobalAdminEdit =
    searchParams.get('globalAdmin') === '1' && userData?.role === 'global_admin';
  const editExitPath = getEditExitPath(isGlobalAdminEdit, userData?.type);
  const currentOmekaUserId = userData?.omekaUserId ?? (localStorage.getItem('omekaUserId') ? parseInt(localStorage.getItem('omekaUserId')!, 10) : null);

  const mode: PageMode = initialMode;
  const isDraft = isDraftProp;

  // Ressources créées par l'utilisateur dans cette session
  const [userCreatedResourceIds, setUserCreatedResourceIds] = useState<Set<string>>(() => new Set());
  const markResourceAsUserCreated = useCallback((resourceId: string | number) => {
    setUserCreatedResourceIds((prev) => {
      const next = new Set(prev);
      next.add(String(resourceId));
      return next;
    });
  }, []);

  const handleEditLinkedResource = useCallback(
    (viewKey: string, resourceId: string | number, templateId?: number) => {
      if (onEditResource) {
        onEditResource(viewKey, resourceId, templateId);
        return;
      }
      const type = templateId != null ? TEMPLATE_ID_TO_TYPE[templateId] : undefined;
      if (!type) return;
      navigate(
        isGlobalAdminEdit
          ? getGlobalAdminEditUrl(type, resourceId)
          : getResourceEditUrl(type, resourceId),
      );
    },
    [onEditResource, isGlobalAdminEdit, navigate],
  );

  const effectiveOnEditResource = onEditResource ?? (isGlobalAdminEdit ? handleEditLinkedResource : undefined);

  // ================================
  // Form state
  // ================================
  const {
    state: formState,
    actions: formActions,
    setIsSubmitting,
  } = useFormState({
    initialData: {},
    fields: config.formFields || [],
  });

  const { data: formData, errors: formErrors, isDirty, isSubmitting } = formState;
  const { setFieldValue: setValue, setMultipleValues: setFormData, resetForm: reset, patchBaseline, validateForm: validate } = formActions;

  // Retourne formData complet comme "champs modifiés" (même logique que GenericDetailPage)
  const getChangedFields = useCallback(() => formData, [formData]);

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const formInitializedRef = useRef(false);
  const autoContributorAppliedRef = useRef(false);
  const autoContributorConfig = useMemo(
    () => getAutoContributorConfig(config.resourceTemplateId),
    [config.resourceTemplateId],
  );
  const prevIsDirtyRef = useRef(isDirty);
  useEffect(() => {
    if (prevIsDirtyRef.current !== isDirty) {
      prevIsDirtyRef.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);

  // ================================
  // Data loading (for form initialization)
  // ================================
  const [itemDetails, setItemDetails] = useState<any>(mode === 'create' || isDraft ? {} : null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [viewData, setViewData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(mode !== 'create' && !isDraft);
  const [loadingKeywords, setLoadingKeywords] = useState(mode !== 'create' && !isDraft);
  const [selected, setSelected] = useState(config.defaultView || config.viewOptions[0]?.key || '');

  // Media state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
  const [removedMediaIndexes, setRemovedMediaIndexes] = useState<number[]>([]);
  const [propertiesMap, setPropertiesMap] = useState<Record<string, number>>({});

  // Auto-save refs
  const bypassBlockerRef = useRef(false);
  const prevIdRef = useRef<string | undefined>(undefined);
  const silentFetchRef = useRef(false); // skip loading spinner on next fetchData (e.g. after publishing draft)
  const pendingAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSaveRef = useRef<() => Promise<void>>(async () => {});
  const processedLinksRef = useRef<Set<string>>(new Set());
  const searchModalRef = useRef<SearchModalRef>(null);

  // Modal states
  const [draftDeleteConfirmOpen, setDraftDeleteConfirmOpen] = useState(false);
  const [unsavedChangesWarningOpen, setUnsavedChangesWarningOpen] = useState(false);
  const [orphanWarningOpen, setOrphanWarningOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isSavingBeforeCancel, setIsSavingBeforeCancel] = useState(false);

  // Resource picker state
  const [pickerState, setPickerState] = useState<{
    isOpen: boolean;
    viewKey: string;
    resourceTemplateId?: number;
    resourceTemplateIds?: number[];
    itemSetIds?: number[];
    multiSelect?: boolean;
    pickerTitle?: string;
    createOnly?: boolean;
  }>({ isOpen: false, viewKey: '' });

  const [activeResourceField, setActiveResourceField] = useState<{
    key: string;
    label: string;
    templateId: number;
    displayMode?: 'grid' | 'alphabetic';
  } | null>(null);

  const [createItemSetModalState, setCreateItemSetModalState] = useState<{
    isOpen: boolean;
    viewKey: string;
    itemSetIds: number[];
  }>({ isOpen: false, viewKey: '', itemSetIds: [] });
  const [createItemSetTitle, setCreateItemSetTitle] = useState('');
  const [createItemSetLoading, setCreateItemSetLoading] = useState(false);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    viewKey: string;
    itemId: string | number | null;
    itemTitle?: string;
    hardDelete?: boolean;
  }>({ isOpen: false, viewKey: '', itemId: null, itemTitle: '', hardDelete: false });
  const [isDeletingLinkedItem, setIsDeletingLinkedItem] = useState(false);

  // ================================
  // Navigation blocker
  // ================================
  const blocker = useBlocker(
    useCallback(
      () => !bypassBlockerRef.current && (isDraft || isDirty),
      [isDirty, isDraft],
    ),
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (isDraft) {
        setDraftDeleteConfirmOpen(true);
      } else {
        setUnsavedChangesWarningOpen(true);
      }
    }
  }, [blocker.state, isDraft]);

  // ================================
  // Data fetch (for edit mode — simplified, no recommendations)
  // ================================
  const fetchData = useCallback(async () => {
    if (mode === 'create' || isDraft) {
      setLoading(false);
      setLoadingKeywords(false);
      setItemDetails({});
      return;
    }
    if (!id) return;

    const silent = silentFetchRef.current;
    silentFetchRef.current = false;

    if (!silent) {
      setLoading(true);
      setLoadingKeywords(true);
    }

    try {
      if ((config as any).progressiveDataFetcher) {
        const result = await (config as any).progressiveDataFetcher(id, (partial: any) => {
          if (partial.itemDetails) {
            setItemDetails(partial.itemDetails);
            if (!silent) setLoading(false);
          }
          if (partial.keywords) {
            setKeywords(partial.keywords);
            if (!silent) setLoadingKeywords(false);
          }
          if (partial.viewData) setViewData(partial.viewData);
        });
        setItemDetails(result.itemDetails);
        setKeywords(result.keywords || []);
        setViewData(result.viewData || {});
        if (!silent) { setLoading(false); setLoadingKeywords(false); }
      } else {
        const result = await config.dataFetcher(id);
        setItemDetails(result.itemDetails);
        setKeywords(result.keywords || []);
        setViewData(result.viewData || {});
        if (!silent) { setLoading(false); setLoadingKeywords(false); }
      }
    } catch (error) {
      console.error('GenericEditPage: Error fetching data:', error);
      setItemDetails({});
      if (!silent) { setLoading(false); setLoadingKeywords(false); }
    }
  }, [id, config, mode, isDraft]);

  // Reset on ID change (not when isDraft alone changes — e.g. after publishing a draft)
  useEffect(() => {
    const idChanged = id !== prevIdRef.current;
    prevIdRef.current = id;

    if (mode === 'create' || isDraft) {
      setSelected(config.defaultView || config.viewOptions[0]?.key || '');
      return;
    }

    // If only isDraft changed (same resource just published), skip the full reset —
    // fetchData() is already triggered via the fetchData useCallback changing.
    if (!idChanged) return;

    formInitializedRef.current = false;
    setItemDetails({});
    setKeywords([]);
    setViewData({});
    setLoading(true);
    setLoadingKeywords(true);
    setSelected(config.defaultView || config.viewOptions[0]?.key || '');
  }, [id, config.defaultView, config.viewOptions, mode, isDraft]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load properties map in create mode
  useEffect(() => {
    if (mode === 'create' && config.resourceTemplateId) {
      getTemplatePropertiesMap(config.resourceTemplateId).then(setPropertiesMap);
    }
  }, [mode, config.resourceTemplateId]);

  // ================================
  // Form initialization from itemDetails
  // ================================
  useEffect(() => {
    if (mode !== 'edit') {
      if (mode === 'view') {
        formInitializedRef.current = false;
        setMediaFiles([]);
        setRemovedMediaIndexes([]);
      }
      return;
    }

    // Ne pas initialiser sur itemDetails vide ({} avant le fetch) — évite isDirty=false positif
    if (String(itemDetails?.['o:id']) !== String(id)) return;

    const displayOnlyKeys = new Set([
        'bibliographicCitations', 'references', 'sources', 'reviews', 'documentations',
        'resourceCache', 'associatedMedia', 'associatedMediaRefs', 'citations', 'microresumes',
      ]);
      const managedFormProperties = new Set<string>();
      config.formFields?.forEach((field) => {
        const prop = field.dataPath?.split('.')[0];
        if (prop) managedFormProperties.add(prop);
      });
      const extractedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(itemDetails)) {
        if (!displayOnlyKeys.has(key) && !managedFormProperties.has(key)) {
          extractedData[key] = value;
        }
      }

      config.formFields?.forEach((field) => {
        const isItemSetField = field.type === 'selection' && field.selectionConfig?.itemSetId;
        if (field.dataPath && !isItemSetField) {
          const pathParts = field.dataPath.split('.');
          let value: any = itemDetails;
          for (const part of pathParts) {
            if (value === undefined || value === null) break;
            value = value[part];
          }
          if (value !== undefined && value !== null) {
            extractedData[field.key] = value;
          }
        }

        if (field.type === 'multiselection' && field.selectionConfig) {
          const property = field.dataPath?.split('.')[0];
          if (property) {
            const linkedResources = itemDetails[property];
            if (Array.isArray(linkedResources) && linkedResources.length > 0) {
              const resourceCache = itemDetails.resourceCache || {};
              const hydratedResources = linkedResources
                .map((ref: any) => {
                  const resourceId = getLinkedResourceId(ref);
                  if (!resourceId) return null;
                  const cached = resourceCache[resourceId];
                  return {
                    id: resourceId,
                    'o:id': resourceId,
                    title: cached?.title || getLinkedResourceTitle(ref),
                    name: getLinkedResourceTitle(ref),
                    display_title: ref.display_title,
                  };
                })
                .filter(Boolean);
              extractedData[field.key] = hydratedResources;
              const contributorProperties = ['schema:agent', 'jdc:hasActant', 'dcterms:contributor', 'schema:contributor', 'cito:credits'];
              const prop2 = field.dataPath?.split('.')[0] || '';
              if (contributorProperties.includes(prop2)) {
                extractedData.personnes = hydratedResources;
                extractedData.actants = hydratedResources;
              }
            }
          }
        }

        if (field.type === 'selection' && field.selectionConfig?.itemSetId) {
          const property = field.dataPath?.split('.')[0];
          const linked = property ? itemDetails[property] : null;
          if (Array.isArray(linked) && linked.length > 0) {
            const resourceCache = itemDetails.resourceCache || {};
            const entries = linked
              .filter((entry: any) => entry?.value_resource_id)
              .map((entry: any) => {
                const resourceId = entry.value_resource_id;
                const cached = resourceCache[resourceId];
                return { id: resourceId, title: cached?.title || entry.display_title || `Item ${resourceId}` };
              });
            if (entries.length > 0) {
              extractedData[field.key] = field.selectionConfig.multiple ? entries : [entries[0]];
            }
          }
        }
      });

      const urlField = config.formFields?.find((f) => f.type === 'url');
      if (urlField && extractedData[urlField.key]) {
        extractedData.fullUrl = extractedData[urlField.key];
      }

      // Hydrater les clés de vue (ex. target ← oa:hasTarget) pour l'édition d'items liés
      Object.entries(config.viewKeyToProperty ?? {}).forEach(([viewKey, property]) => {
        if (extractedData[viewKey] !== undefined) return;
        const linked = itemDetails[property];
        if (!Array.isArray(linked) || linked.length === 0) return;
        const resourceCache = itemDetails.resourceCache || {};
        const hydrated = linked
          .map((ref: any) => {
            const resourceId = getLinkedResourceId(ref);
            if (resourceId == null) return null;
            const cached = resourceCache[resourceId];
            return {
              id: resourceId,
              'o:id': resourceId,
              title: cached?.title || getLinkedResourceTitle(ref),
              ownerId: cached?.ownerId,
            };
          })
          .filter(Boolean);
        if (hydrated.length > 0) extractedData[viewKey] = hydrated;
      });

      if (!formInitializedRef.current) {
        reset(extractedData);
        setMediaFiles([]);
        setRemovedMediaIndexes([]);
        formInitializedRef.current = true;
      } else {
        const updates: Record<string, any> = {};
        for (const [key, value] of Object.entries(extractedData)) {
          if (formData[key] === undefined || formData[key] === null) {
            updates[key] = value;
          }
        }
        if (Object.keys(updates).length > 0) {
          setFormData({ ...formData, ...updates });
          patchBaseline(updates);
        }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemDetails, mode, id, setFormData, config.formFields, config.viewKeyToProperty]);

  // Inject keywords when they load (without full form reset)
  useEffect(() => {
    if (!formInitializedRef.current) return;
    if (keywords && keywords.length > 0) {
      setValue('keywords', keywords);
      patchBaseline({ keywords });
    }
  }, [keywords, setValue, patchBaseline]);

  // Auto-contributor for create mode
  useEffect(() => {
    autoContributorAppliedRef.current = false;
  }, [config.resourceTemplateId, mode]);

  useEffect(() => {
    if (mode !== 'create' || autoContributorAppliedRef.current) return;
    const values = buildAutoContributorFormValues(config.resourceTemplateId, userData, {
      includePersonnes: Boolean(autoContributorConfig),
    });
    if (!values) return;
    autoContributorAppliedRef.current = true;
    setFormData(values);
  }, [mode, config.resourceTemplateId, autoContributorConfig, userData, setFormData]);

  // Pre-fill hidden views with parent resource (create mode only — en edit le lien est déjà dans Omeka)
  useEffect(() => {
    if (!parentResourceId || mode !== 'create') return;
    config.viewOptions.forEach((view) => {
      if (!view.hiddenInForm) return;
      const currentItems: any[] = Array.isArray(formData[view.key]) ? formData[view.key] : [];
      const alreadyLinked = currentItems.some(
        (item) => String(getLinkedResourceId(item)) === String(parentResourceId),
      );
      if (alreadyLinked) return;
      const newValue = [
        ...currentItems,
        {
          id: parentResourceId,
          'o:id': parentResourceId,
          title: parentResourceTitle || getResourceFallbackTitle(parentResourceId),
        },
      ];
      setValue(view.key, newValue);
      patchBaseline({ [view.key]: newValue });
    });
  }, [parentResourceId, parentResourceTitle, config.viewOptions, mode, formData, setValue, patchBaseline]);

  // ================================
  // Pending links processing
  // ================================
  useEffect(() => {
    if (!pendingLinks || pendingLinks.length === 0) return;

    let hasProcessedNew = false;

    pendingLinks.forEach((link) => {
      const linkKey = `${link.linkedField}-${link.resourceId}`;
      if (processedLinksRef.current.has(linkKey)) return;

      const resolveCurrentLinkedItems = (linkedField: string): any[] => {
        if (Array.isArray(formData[linkedField])) return formData[linkedField];
        if (Array.isArray(itemDetails?.[linkedField])) return itemDetails[linkedField];
        const property = (config.viewKeyToProperty || {})[linkedField];
        if (property && Array.isArray(itemDetails?.[property])) {
          const cache = itemDetails?.resourceCache || {};
          return itemDetails[property]
            .map((ref: any) => {
              const rid = ref.value_resource_id ?? ref.id ?? ref['o:id'];
              if (rid == null) return null;
              const c = cache[rid];
              return { id: rid, 'o:id': rid, title: c?.title || ref['o:title'] || `Item #${rid}`, ownerId: c?.ownerId };
            })
            .filter(Boolean);
        }
        return [];
      };

      const currentItems = resolveCurrentLinkedItems(link.linkedField);
      const linkedViewOption = config.viewOptions.find((v) => v.key === link.linkedField);
      const linkedFormField = config.formFields?.find((f) => f.key === link.linkedField);
      const linkedTemplateId =
        linkedViewOption?.resourceTemplateId ||
        linkedViewOption?.resourceTemplateIds?.[0] ||
        linkedFormField?.selectionConfig?.templateId;
      const newItem = {
        id: link.resourceId,
        'o:id': link.resourceId,
        title: link.resourceTitle || getResourceFallbackTitle(link.resourceId, linkedTemplateId),
        ownerId: currentOmekaUserId ?? undefined,
      };
      const alreadyLinked = currentItems.some((item: any) => item.id === link.resourceId || item['o:id'] === link.resourceId);
      if (!alreadyLinked) {
        setValue(link.linkedField, [...currentItems, newItem]);
        markResourceAsUserCreated(link.resourceId);

        if (autoContributorConfig?.property === link.linkedField) {
          const personnes: any[] = Array.isArray(formData.personnes) ? formData.personnes : [];
          const alreadyInPersonnes = personnes.some(
            (p: any) => String(getLinkedResourceId(p)) === String(link.resourceId),
          );
          if (!alreadyInPersonnes) {
            setValue('personnes', [...personnes, newItem]);
          }
        }
      }

      processedLinksRef.current.add(linkKey);
      hasProcessedNew = true;
    });

    if (hasProcessedNew && onPendingLinksProcessed) {
      onPendingLinksProcessed();

      if (mode === 'edit' && id) {
        const newlySavedLinks: { linkedField: string; resourceId: string | number }[] = [];
        pendingLinks.forEach((link) => {
          const linkKey = `${link.linkedField}-${link.resourceId}`;
          if (processedLinksRef.current.has(linkKey)) {
            newlySavedLinks.push({ linkedField: link.linkedField, resourceId: link.resourceId });
          }
        });

        const surgicalSaveLinks = async () => {
          try {
            const rawResp = await fetch(omekaApiUrl(`${API_BASE}items/${id}`));
            if (!rawResp.ok) {
              console.error('[surgicalSaveLinks] GET failed:', rawResp.status);
              return;
            }
            const rawItem = await rawResp.json();
            const templateId = rawItem['o:resource_template']?.['o:id'] ?? config.resourceTemplateId;
            const propMap = templateId ? await getTemplatePropertiesMap(templateId) : {};
            const updatedItem = { ...rawItem };
            let hadChanges = false;

            for (const { linkedField, resourceId } of newlySavedLinks) {
              const omekaProperty = config.viewKeyToProperty?.[linkedField];
              if (!omekaProperty) continue;
              const propertyId = await resolveOmekaPropertyId(omekaProperty, propMap, rawItem);
              if (!propertyId) {
                console.error('[surgicalSaveLinks] propertyId null for', omekaProperty);
                continue;
              }
              const existing: any[] = Array.isArray(updatedItem[omekaProperty]) ? updatedItem[omekaProperty] : [];
              if (existing.some((v: any) => Number(v.value_resource_id) === Number(resourceId))) continue;
              updatedItem[omekaProperty] = [
                ...existing,
                { type: 'resource', property_id: propertyId, value_resource_id: Number(resourceId), is_public: true },
              ];
              hadChanges = true;
            }

            if (!hadChanges) return;

            const putResp = await fetch(omekaApiUrl(`${API_BASE}items/${id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedItem),
            });

            if (!putResp.ok) {
              console.error('[surgicalSaveLinks] PUT failed:', putResp.status);
              return;
            }

            // Surgical save OK — rafraîchir itemDetails pour que la colonne droite affiche le nouvel item
            // Ne pas appeler fetchData() en mode brouillon : il vide itemDetails (comportement voulu pour les drafts)
            if (!isDraft) fetchData();

            // Afficher le toast
            addToast({
              title: 'Lien sauvegardé',
              description: 'La ressource liée a bien été enregistrée.',
              classNames: { base: 'bg-success border-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
              timeout: 2500,
            });
          } catch (err) {
            console.error('[surgicalSaveLinks] Failed:', err);
          }
        };

        surgicalSaveLinks();
      }
    }
  }, [pendingLinks, formData, setValue, onPendingLinksProcessed, mode, id, markResourceAsUserCreated, config.viewOptions, config.formFields, config.viewKeyToProperty, config.resourceTemplateId, autoContributorConfig, currentOmekaUserId, fetchData]);

  // ================================
  // Helpers
  // ================================
  const getFormFieldOmekaProperty = (fieldKey: string): string | null => {
    const field = config.formFields?.find((f) => f.key === fieldKey);
    return field?.dataPath?.split('.')[0] ?? null;
  };

  const findOmekaPropertyKey = (rawItem: any, simpleKey: string): string | null => {
    const keyMappings: Record<string, string[]> = {
      keywords: ['jdc:hasConcept', 'jdc:hasKeyword', 'dcterms:subject'],
      title: ['dcterms:title'],
      description: ['dcterms:description'],
      date: ['dcterms:date'],
      personnes: ['schema:agent', 'jdc:hasActant', 'dcterms:contributor', 'schema:contributor'],
      actants: ['jdc:hasActant', 'schema:agent'],
      percentage: ['schema:ratingValue'],
      fullUrl: ['schema:url', 'bibo:uri'],
      externalLink: ['bibo:uri', 'schema:url'],
      url: ['schema:url', 'bibo:uri'],
      'schema:description': ['schema:description'],
      'theatre:credit': ['theatre:credit'],
      references: ['dcterms:references'],
      'dcterms:references': ['dcterms:references'],
      'dcterms:bibliographicCitation': ['dcterms:bibliographicCitation'],
    };
    const possibleKeys = keyMappings[simpleKey] || [simpleKey];
    for (const omekaKey of possibleKeys) {
      if (rawItem[omekaKey] !== undefined) return omekaKey;
    }
    return possibleKeys[0] || null;
  };

  const getPropertyId = (omekaPropertyKey: string, propMap?: Record<string, number>): number | null => {
    const map = propMap || propertiesMap;
    const propId = map[omekaPropertyKey];
    if (propId) return propId;
    const localName = omekaPropertyKey.split(':')[1];
    if (localName && map[localName]) return map[localName];
    return OMEKA_PROPERTY_IDS[omekaPropertyKey] ?? null;
  };

  // ================================
  // Save to Omeka S (edit mode)
  // ================================
  const saveToOmekaS = async (data: any) => {
    if (!id) throw new Error('No item ID');

    const rawResponse = await fetch(omekaApiUrl(`${API_BASE}items/${id}`));
    if (!rawResponse.ok) throw new Error('Failed to fetch item');
    const rawItem = await rawResponse.json();

    const templateId = rawItem['o:resource_template']?.['o:id'] || config.resourceTemplateId;
    const templatePropMap = templateId ? await getTemplatePropertiesMap(templateId) : {};
    const updatedItem = { ...rawItem };

    if (data.__publishDraft || !data.__isAutoSave) {
      updatedItem['o:is_public'] = true;
    }

    const writtenOmekaProperties = new Set<string>();
    const formPropertyToKey: Record<string, string> = {};
    const formFieldKeyToProperty: Record<string, string> = {};
    config.formFields?.forEach((field) => {
      const prop = field.dataPath?.split('.')[0];
      if (prop) {
        formPropertyToKey[prop] = field.key;
        formFieldKeyToProperty[field.key] = prop;
      }
    });

    for (const field of config.formFields ?? []) {
      if (field.type !== 'selection' && field.type !== 'multiselection') continue;
      const raw = data[field.key];
      if (raw === undefined || raw === null) continue;
      const omekaPropertyKey = formFieldKeyToProperty[field.key] ?? field.dataPath?.split('.')[0];
      if (!omekaPropertyKey || writtenOmekaProperties.has(omekaPropertyKey)) continue;
      const items = Array.isArray(raw) ? raw : typeof raw === 'number' ? [{ id: raw }] : [];
      const propertyId = await resolveOmekaPropertyId(omekaPropertyKey, templatePropMap, updatedItem);
      if (!propertyId) continue;
      updatedItem[omekaPropertyKey] =
        items.length === 0
          ? []
          : items
              .map((item: any) => item.id || item['o:id'] || item.value_resource_id)
              .filter((itemId: unknown) => itemId != null && itemId !== '')
              .map((resourceId: number) => ({
                type: 'resource',
                property_id: propertyId,
                value_resource_id: Number(resourceId),
                is_public: true,
              }));
      writtenOmekaProperties.add(omekaPropertyKey);
    }

    // Propriétés Omeka des vues « ressources liées » uniquement (pas vocabGroup / text).
    // Ex : 'dcterms:description' via 'AnalyseCritique', pas 'schema:characterAttribute' via 'ImagiaireIA'.
    const linkedResourceViewProperties = new Set<string>();
    config.viewOptions?.forEach((view) => {
      if (view.viewKind === 'resources' && view.key) {
        const prop = config.viewKeyToProperty?.[view.key];
        if (prop) linkedResourceViewProperties.add(prop);
      }
    });

    for (const [key, value] of Object.entries(data)) {
      // Sauter les propriétés Omeka brutes gérées via une clé de vue ressources liées.
      if (linkedResourceViewProperties.has(key)) continue;

      if (key.includes(':')) {
        const preferredKey = formPropertyToKey[key];
        if (preferredKey && data[preferredKey] !== undefined) continue;
      }

      const viewMappedProperty = config.viewKeyToProperty?.[key];
      const isViewOmekaProperty = false; // plus jamais vrai : clés brutes filtrées ci-dessus
      const isFormResourceKey =
        key === 'keywords' ||
        config.formFields?.some((f) => f.key === key && (f.type === 'multiselection' || f.type === 'selection'));
      const isResourceArray =
        Array.isArray(value) &&
        (viewMappedProperty != null ||
          isViewOmekaProperty ||
          isFormResourceKey ||
          (value.length > 0 &&
            (value[0]?.id !== undefined || value[0]?.['o:id'] !== undefined || value[0]?.value_resource_id !== undefined)));

      if (isResourceArray) {
        if (writtenOmekaProperties.has(formFieldKeyToProperty[key] ?? key)) continue;
        let omekaPropertyKey = viewMappedProperty || formFieldKeyToProperty[key] || key;
        const keyToOmekaProp: Record<string, string> = {
          keywords: 'jdc:hasConcept',
          personnes: 'schema:agent',
          actants: 'jdc:hasActant',
          'theatre:credit': 'theatre:credit',
          'schema:description': 'schema:description',
          references: 'dcterms:references',
          'dcterms:references': 'dcterms:references',
          'dcterms:bibliographicCitation': 'dcterms:bibliographicCitation',
        };
        if (!viewMappedProperty && !formFieldKeyToProperty[key]) {
          omekaPropertyKey = keyToOmekaProp[key] || key;
        }
        if (writtenOmekaProperties.has(omekaPropertyKey)) continue;
        const propertyId = await resolveOmekaPropertyId(omekaPropertyKey, templatePropMap, updatedItem);
        if (omekaPropertyKey && propertyId) {
          updatedItem[omekaPropertyKey] =
            (value as any[]).length === 0
              ? []
              : (value as any[])
                  .map((item: any) => ({
                    type: 'resource',
                    property_id: propertyId,
                    value_resource_id: item.id || item['o:id'] || item.value_resource_id,
                    is_public: true,
                  }))
                  .filter((item: any) => item.value_resource_id);
          writtenOmekaProperties.add(omekaPropertyKey);
        }
        continue;
      }

      const isLiteralArray =
        Array.isArray(value) &&
        !isResourceArray &&
        (value.length === 0 ||
          typeof value[0] === 'string' ||
          (typeof value[0] === 'object' && value[0]?.['@value'] !== undefined && !value[0]?.value_resource_id && !value[0]?.id));

      if (isLiteralArray) {
        const omekaKey = key.includes(':') ? key : (getFormFieldOmekaProperty(key) || findOmekaPropertyKey(updatedItem, key));
        if (omekaKey && !writtenOmekaProperties.has(omekaKey)) {
          const existingEntries: any[] = Array.isArray(updatedItem[omekaKey]) ? updatedItem[omekaKey] : [];
          const useConferenceTypeVocab = isConferenceTypeOmekaProperty(omekaKey, templateId);
          const existingOmekaType = useConferenceTypeVocab
            ? `customvocab:${CONFERENCE_TYPE_VOCAB_ID}`
            : existingEntries.length > 0 && existingEntries[0]?.type?.startsWith('customvocab:')
              ? existingEntries[0].type
              : null;
          const propertyId =
            existingEntries[0]?.property_id ??
            templatePropMap[omekaKey] ??
            OMEKA_PROPERTY_IDS[omekaKey];
          if (propertyId || value.length === 0) {
            if (value.length === 0) {
              updatedItem[omekaKey] = [];
            } else {
              updatedItem[omekaKey] = (value as any[])
                .map((v: any) => {
                  if (typeof v === 'object' && v?.property_id && v?.type && v?.['@value']) return v;
                  const str = typeof v === 'string' ? v : String(v?.['@value'] ?? '');
                  if (!str.trim()) return null;
                  return { type: existingOmekaType ?? 'literal', property_id: propertyId, '@value': str, is_public: true };
                })
                .filter(Boolean);
            }
            writtenOmekaProperties.add(omekaKey);
          }
        }
        continue;
      }

      if (typeof value === 'string') {
        const omekaPropertyKey = getFormFieldOmekaProperty(key) || findOmekaPropertyKey(updatedItem, key);
        if (omekaPropertyKey) {
          const isUrlProperty =
            omekaPropertyKey === 'schema:url' ||
            omekaPropertyKey === 'bibo:uri' ||
            key === 'fullUrl' ||
            key === 'externalLink' ||
            key === 'url' ||
            config.formFields?.find((f) => f.key === key)?.type === 'url';

          if (updatedItem[omekaPropertyKey] && Array.isArray(updatedItem[omekaPropertyKey]) && updatedItem[omekaPropertyKey].length > 0) {
            if (isUrlProperty) {
              updatedItem[omekaPropertyKey][0]['@id'] = value;
              updatedItem[omekaPropertyKey][0]['type'] = 'uri';
              delete updatedItem[omekaPropertyKey][0]['@value'];
            } else {
              updatedItem[omekaPropertyKey][0]['@value'] = value;
            }
          } else if (value.trim() !== '') {
            const propertyId = getPropertyId(omekaPropertyKey, templatePropMap);
            if (propertyId) {
              if (isUrlProperty) {
                updatedItem[omekaPropertyKey] = [{ type: 'uri', property_id: propertyId, '@id': value, is_public: true }];
              } else {
                updatedItem[omekaPropertyKey] = [{ type: 'literal', property_id: propertyId, '@value': value, is_public: true }];
              }
            }
          }
        }
      } else if (typeof value === 'number') {
        const omekaPropertyKey = getFormFieldOmekaProperty(key) || findOmekaPropertyKey(updatedItem, key);
        if (omekaPropertyKey) {
          if (updatedItem[omekaPropertyKey] && Array.isArray(updatedItem[omekaPropertyKey]) && updatedItem[omekaPropertyKey].length > 0) {
            updatedItem[omekaPropertyKey][0]['@value'] = String(value);
          } else {
            const propertyId = getPropertyId(omekaPropertyKey, templatePropMap);
            if (propertyId) {
              updatedItem[omekaPropertyKey] = [{ type: 'literal', property_id: propertyId, '@value': String(value), is_public: true }];
            }
          }
        }
      }
    }

    const saveResponse = await fetch(omekaApiUrl(`${API_BASE}items/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem),
    });
    if (!saveResponse.ok) {
      const errorData = await saveResponse.json();
      throw new Error(errorData.errors?.[0]?.message || 'Erreur lors de la sauvegarde');
    }
    const result = await saveResponse.json();

    // Supprimer les médias marqués
    const mediaIdsToDelete = data.mediaToDelete || [];
    if (Array.isArray(mediaIdsToDelete) && mediaIdsToDelete.length > 0) {
      for (const mediaId of mediaIdsToDelete) {
        await deleteMedia(Number(mediaId));
      }
    }

    // Créer les médias YouTube
    const youtubeUrlsToCreate = data.youtubeUrls || [];
    for (const ytUrl of youtubeUrlsToCreate) {
      try {
        const videoIdMatch = ytUrl.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (!videoId) continue;
        await fetch(omekaApiUrl(`${API_BASE}media`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 'o:ingester': 'youtube', 'o:renderer': 'youtube', 'o:source': ytUrl, 'o:item': { 'o:id': id }, data: { id: videoId }, is_public: true }),
        });
      } catch (err) {
        console.error('[saveToOmekaS] YouTube error:', err);
      }
    }

    // Upload fichiers médias
    const mediaFilesToUpload = data.mediaFiles || [];
    for (const mediaFile of mediaFilesToUpload) {
      const file = mediaFile.file || mediaFile;
      if (file instanceof File) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('data', JSON.stringify({ 'o:ingester': 'upload', 'o:item': { 'o:id': id }, file_index: '0' }));
          formDataUpload.append('file[0]', file);
          await fetch(omekaApiUrl(`${API_BASE}media`), { method: 'POST', body: formDataUpload });
        } catch (err) {
          console.error('[saveToOmekaS] Media upload error:', err);
        }
      }
    }

    return result;
  };

  // ================================
  // Create in Omeka S (create mode)
  // ================================
  const createInOmekaS = async (data: any) => {
    if (!config.resourceTemplateId) throw new Error('resourceTemplateId non défini');

    const userId = localStorage.getItem('userId');
    const omekaUserId = localStorage.getItem('omekaUserId');
    const propMap = Object.keys(propertiesMap).length > 0 ? propertiesMap : await getTemplatePropertiesMap(config.resourceTemplateId!);
    const itemData: Record<string, any> = { 'o:resource_template': { 'o:id': config.resourceTemplateId } };

    if (omekaUserId && parseInt(omekaUserId, 10) > 0) {
      itemData['o:owner'] = { 'o:id': parseInt(omekaUserId, 10) };
    }

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    if (courseId) {
      const coursePropertyId = propMap['dcterms:isPartOf'] || 33;
      itemData['dcterms:isPartOf'] = [{ type: 'resource', property_id: coursePropertyId, value_resource_id: parseInt(courseId, 10), is_public: true }];
    }

    const autoContributor = getAutoContributorConfig(config.resourceTemplateId);
    if (autoContributor) {
      const formContributors = data[autoContributor.fieldKey] ?? data[autoContributor.property];
      const contributors: any[] = Array.isArray(formContributors) ? formContributors : [];
      if (contributors.length > 0) {
        const propertyId = propMap[autoContributor.property] ?? OMEKA_PROPERTY_IDS[autoContributor.property];
        if (propertyId) {
          itemData[autoContributor.property] = contributors
            .map((c: any) => c.id || c['o:id'] || c.value_resource_id)
            .filter(Boolean)
            .map((resourceId: number) => ({ type: 'resource', property_id: propertyId, value_resource_id: Number(resourceId), is_public: true }));
        }
      } else if (userId) {
        void userId;
        const connectedContributor = buildConnectedUserContributorItem(userData);
        if (connectedContributor) {
          const propertyId = propMap[autoContributor.property] ?? OMEKA_PROPERTY_IDS[autoContributor.property];
          if (propertyId) {
            itemData[autoContributor.property] = [{ type: 'resource', property_id: propertyId, value_resource_id: connectedContributor.id, is_public: true }];
          }
        }
      }
    }

    // Title
    const titlePropertyId = propMap['dcterms:title'] ?? 1;
    const titleValue = data.title || data['dcterms:title']?.[0]?.['@value'] || '';
    if (titleValue) {
      itemData['dcterms:title'] = [{ type: 'literal', property_id: titlePropertyId, '@value': titleValue, is_public: true }];
    }

    // Other fields
    for (const field of config.formFields ?? []) {
      if (field.key === 'title') continue;
      const raw = data[field.key];
      if (raw === undefined || raw === null) continue;
      const omekaPropertyKey = field.dataPath?.split('.')[0];
      if (!omekaPropertyKey) continue;
      const propertyId = propMap[omekaPropertyKey] ?? OMEKA_PROPERTY_IDS[omekaPropertyKey];
      if (!propertyId) continue;

      if (field.type === 'multiselection' || field.type === 'selection') {
        const items: any[] = Array.isArray(raw) ? raw : typeof raw === 'number' ? [{ id: raw }] : [];
        if (items.length > 0) {
          itemData[omekaPropertyKey] = items
            .map((item: any) => item.id || item['o:id'])
            .filter(Boolean)
            .map((resourceId: number) => ({ type: 'resource', property_id: propertyId, value_resource_id: Number(resourceId), is_public: true }));
        }
      } else if (typeof raw === 'string' && raw.trim()) {
        const isUrl = field.type === 'url' || omekaPropertyKey === 'bibo:uri' || omekaPropertyKey === 'schema:url';
        if (isUrl) {
          itemData[omekaPropertyKey] = [{ type: 'uri', property_id: propertyId, '@id': raw, is_public: true }];
        } else {
          // Handle conference type
          if (isConferenceTypeOmekaProperty(omekaPropertyKey, config.resourceTemplateId ?? CONFERENCE_TEMPLATE_ID)) {
            const confValue = buildConferenceTypeOmekaValue(raw, propertyId);
            if (confValue) { itemData[omekaPropertyKey] = [confValue]; continue; }
          }
          itemData[omekaPropertyKey] = [{ type: 'literal', property_id: propertyId, '@value': raw, is_public: true }];
        }
      } else if (typeof raw === 'number') {
        itemData[omekaPropertyKey] = [{ type: 'literal', property_id: propertyId, '@value': String(raw), is_public: true }];
      }
    }

    // View keys → Omeka properties
    if (config.viewKeyToProperty) {
      for (const [viewKey, omekaProperty] of Object.entries(config.viewKeyToProperty)) {
        const value = data[viewKey];
        if (!value || (Array.isArray(value) && value.length === 0)) continue;
        const propertyId = propMap[omekaProperty] ?? OMEKA_PROPERTY_IDS[omekaProperty];
        if (!propertyId) continue;
        if (Array.isArray(value)) {
          itemData[omekaProperty] = value
            .map((item: any) => item.id || item['o:id'])
            .filter(Boolean)
            .map((resourceId: number) => ({ type: 'resource', property_id: propertyId, value_resource_id: Number(resourceId), is_public: true }));
        }
      }
    }

    const response = await fetch(omekaApiUrl(`${API_BASE}items`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(omekaAuthErrorMessage(response.status) || errorData.errors?.[0]?.message || 'Échec de la création');
    }
    const result = await response.json();
    const newItemId = result['o:id'];

    // Upload media
    const mediaFilesToUpload = data.mediaFiles || [];
    for (const mediaFile of mediaFilesToUpload) {
      const file = mediaFile.file || mediaFile;
      if (file instanceof File) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('data', JSON.stringify({ 'o:ingester': 'upload', 'o:item': { 'o:id': newItemId }, file_index: '0' }));
          formDataUpload.append('file[0]', file);
          await fetch(omekaApiUrl(`${API_BASE}media`), { method: 'POST', body: formDataUpload });
        } catch (err) { console.error('[createInOmekaS] Media error:', err); }
      }
    }

    // YouTube media
    for (const ytUrl of data.youtubeUrls || []) {
      try {
        const videoIdMatch = ytUrl.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (!videoId) continue;
        await fetch(omekaApiUrl(`${API_BASE}media`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 'o:ingester': 'youtube', 'o:renderer': 'youtube', 'o:source': ytUrl, 'o:item': { 'o:id': newItemId }, data: { id: videoId }, is_public: true }),
        });
      } catch (err) { console.error('[createInOmekaS] YouTube error:', err); }
    }

    const savedTitle = data.title || result?.['o:title'] || result?.['dcterms:title']?.[0]?.['@value'];

    const pickerParams = new URLSearchParams(window.location.search);
    if (pickerParams.get('fromPicker') === '1' && window.opener) {
      window.opener.postMessage({ type: 'RESOURCE_CREATED', id: newItemId, title: savedTitle || `Item ${newItemId}` }, window.location.origin);
      window.close();
      return result;
    }

    if (onSaveComplete) {
      onSaveComplete(newItemId, savedTitle);
      return result;
    }

    if (config.formOnly) {
      const resourceType = config.resourceType || config.type;
      if (resourceType) navigate(getResourceEditUrl(resourceType, newItemId));
      else navigate(editExitPath);
      return result;
    }

    const resourceType = config.resourceType || config.type;
    if (resourceType) navigate(getResourceEditUrl(resourceType, newItemId));
    else navigate('/espace-etudiant/');
    return result;
  };

  // ================================
  // handleSave
  // ================================
  const handleSave = async () => {
    const isAutoSave = pendingAutoSaveRef.current;
    pendingAutoSaveRef.current = false;

    if (!validate()) {
      if (!isAutoSave) {
        addToast({
          title: 'Erreur de validation',
          description: 'Veuillez corriger les erreurs avant de sauvegarder.',
          classNames: { base: 'bg-danger', title: 'text-c6', description: 'text-c5', icon: 'text-c6' },
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const changedData = getChangedFields();

      if (config.viewKeyToProperty) {
        Object.entries(config.viewKeyToProperty).forEach(([viewKey, property]) => {
          const vData = formData[viewKey];
          if (vData !== undefined && vData !== null) {
            changedData[viewKey] = vData;
            if (typeof vData === 'string' || Array.isArray(vData)) {
              changedData[property] = vData;
            }
          }
        });
      }

      changedData.mediaFiles = mediaFiles;
      changedData.youtubeUrls = youtubeUrls;

      if (isAutoSave) changedData.__isAutoSave = true;
      if (isDraft && !isAutoSave) changedData.__publishDraft = true;

      if (removedMediaIndexes.length > 0) {
        const mediaToDelete: number[] = [];
        removedMediaIndexes.forEach((index) => {
          const idFromMeta = itemDetails?.associatedMediaIds?.[index];
          if (typeof idFromMeta === 'number') { mediaToDelete.push(idFromMeta); return; }
          const mediaRef = itemDetails?.['o:media']?.[index];
          if (mediaRef?.['o:id']) mediaToDelete.push(mediaRef['o:id']);
        });
        if (mediaToDelete.length > 0) changedData.mediaToDelete = mediaToDelete;
      }

      if (mode === 'create') {
        await createInOmekaS(changedData);
        if (!onSaveComplete) {
          addToast({
            title: 'Ressource créée',
            description: 'La ressource a été créée avec succès.',
            classNames: { base: 'bg-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
          });
        }
        return;
      } else if (onSave) {
        await onSave(changedData);
        if (id) {
          const savedTitle = changedData.title || formData.title;
          onSaveComplete?.(id, savedTitle);
        }
      } else {
        const result = await saveToOmekaS(changedData);
        if (result?.['o:id']) {
          const savedTitle = changedData.title || result?.['o:title'] || result?.['dcterms:title']?.[0]?.['@value'];
          onSaveComplete?.(result['o:id'], savedTitle);
        }
      }

      if (isAutoSave) {
        addToast({
          title: 'Lien sauvegardé',
          description: 'La ressource liée a bien été enregistrée.',
          classNames: { base: 'bg-success border-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
          timeout: 2500,
        });
      } else {
        addToast({
          title: 'Sauvegardé',
          description: 'Les modifications ont été enregistrées.',
          classNames: { base: 'bg-success border-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
        });
      }

      setYoutubeUrls([]);
      setMediaFiles([]);
      setRemovedMediaIndexes([]);

      if (!isAutoSave && isDraft) {
        // Silent fetch so the form doesn't flash a spinner when publishing the draft
        silentFetchRef.current = true;
        // Bypass the navigation blocker so the URL update isn't intercepted
        bypassBlockerRef.current = true;
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('draft');
        setSearchParams(newParams, { replace: true });
        // Re-enable blocker after the URL change has been processed
        setTimeout(() => { bypassBlockerRef.current = false; }, 100);
        // fetchData() will be triggered automatically via the useEffect
        // when isDraft becomes false after the URL change re-render
      } else if (!isDraft) {
        reset(formData);
      }
      onDirtyChange?.(false);
    } catch (error) {
      console.error('Error saving:', error);
      addToast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        classNames: { base: 'bg-danger', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  handleSaveRef.current = handleSave;

  // ================================
  // Cancel / Draft deletion
  // ================================
  const performCancel = () => {
    reset();
    bypassBlockerRef.current = true;
    if (onCancel) { onCancel(); return; }
    if (mode === 'create') {
      const pickerParams = new URLSearchParams(window.location.search);
      if (pickerParams.get('fromPicker') === '1' && window.opener) { window.close(); return; }
      if (config.formOnly) navigate(editExitPath);
      else navigate(-1);
    } else {
      navigate(editExitPath);
    }
  };

  const deleteDraftAndLeave = async () => {
    if (!id) { performCancel(); return; }
    setIsDeletingDraft(true);
    try {
      await deleteUserResource(id);
      bypassBlockerRef.current = true;
      if (blocker.state === 'blocked') blocker.proceed();
      navigate(editExitPath);
    } catch (err) {
      console.error('Error deleting draft:', err);
      addToast({
        title: 'Erreur',
        description: 'Impossible de supprimer le brouillon.',
        classNames: { base: 'bg-danger', title: 'text-c6', description: 'text-c5' },
      });
    } finally {
      setIsDeletingDraft(false);
    }
  };

  const handleDeleteDraft = () => deleteDraftAndLeave();

  const handleCancelEdit = () => {
    const hadPendingAutoSave = autoSaveTimerRef.current !== null;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      pendingAutoSaveRef.current = false;
    }

    if (isDraft) { setDraftDeleteConfirmOpen(true); return; }
    if (hadPendingAutoSave && userCreatedResourceIds.size > 0) { setOrphanWarningOpen(true); return; }
    if (isDirty) { setUnsavedChangesWarningOpen(true); return; }
    performCancel();
  };

  // ================================
  // Resource picker & linking
  // ================================
  const openLinkedResourceCreate = useCallback(
    (viewKey: string, options?: { resourceTemplateIds?: number[]; pickerTitle?: string }) => {
      if (viewKey === 'keywords') {
        setPickerState({ isOpen: true, viewKey, resourceTemplateId: 34, resourceTemplateIds: undefined, itemSetIds: undefined, multiSelect: true, pickerTitle: 'Ajouter des mots-clés', createOnly: false });
        return;
      }

      const viewOption = config.viewOptions.find((v) => v.key === viewKey);
      const defaultTemplateIds: Record<string, number> = { keywords: 34 };
      const defaultMultiTemplateIds: Record<string, number[]> = {
        personnes: [...DEFAULT_AUTHOR_TEMPLATE_IDS],
        actants: [...DEFAULT_AUTHOR_TEMPLATE_IDS],
      };

      const resourceTemplateIds = options?.resourceTemplateIds ?? viewOption?.resourceTemplateIds ?? defaultMultiTemplateIds[viewKey];
      const resourceTemplateId = resolveViewResourceTemplateId(viewKey, viewOption, options, { single: defaultTemplateIds, multi: defaultMultiTemplateIds });
      const itemSetIds = viewOption?.itemSetIds;
      const createOnly = isCreateOnlyView(viewOption, resourceTemplateId);

      if (createOnly && onCreateNewResource && resourceTemplateId) {
        onCreateNewResource(viewKey, resourceTemplateId);
        return;
      }

      if (createOnly && !onCreateNewResource) {
        setPickerState({ isOpen: true, viewKey, resourceTemplateId, resourceTemplateIds: undefined, itemSetIds, multiSelect: false, pickerTitle: options?.pickerTitle, createOnly: true });
        return;
      }

      setPickerState({ isOpen: true, viewKey, resourceTemplateId, resourceTemplateIds, itemSetIds, multiSelect: true, pickerTitle: options?.pickerTitle, createOnly: false });
    },
    [config.viewOptions, onCreateNewResource],
  );

  const handleLinkExisting = openLinkedResourceCreate;

  const handleCreateNewFromView = useCallback(
    (viewKey: string) => { openLinkedResourceCreate(viewKey); },
    [openLinkedResourceCreate],
  );

  const handlePickerCreateInTab = useCallback(() => {
    if (!pickerState.viewKey || !onCreateNewResource) return;
    const viewOption = config.viewOptions.find((v) => v.key === pickerState.viewKey);
    const templateId = pickerState.resourceTemplateId ?? pickerState.resourceTemplateIds?.[0] ?? viewOption?.resourceTemplateId ?? viewOption?.resourceTemplateIds?.[0];
    if (!templateId) return;
    onCreateNewResource(pickerState.viewKey, templateId);
    setPickerState({ isOpen: false, viewKey: '' });
  }, [pickerState.viewKey, pickerState.resourceTemplateId, pickerState.resourceTemplateIds, config.viewOptions, onCreateNewResource]);

  const handleFieldCreateInTab = useCallback(() => {
    if (!activeResourceField || !onCreateNewResource) return;
    onCreateNewResource(activeResourceField.key, activeResourceField.templateId);
    setActiveResourceField(null);
  }, [activeResourceField, onCreateNewResource]);

  const pickerAllowsCreate = useMemo(() => {
    if (!pickerState.isOpen) return false;
    if (pickerState.itemSetIds?.length) return true;
    const ids = pickerState.resourceTemplateIds || (pickerState.resourceTemplateId ? [pickerState.resourceTemplateId] : []);
    return ids.some((tid) => {
      const cfg = getResourceConfigByTemplateId(tid);
      return cfg?.createUrl || QUICK_CREATE_CONFIGS[tid];
    });
  }, [pickerState]);

  const handlePickerCreateOverride = useCallback(() => {
    if (!pickerState.itemSetIds?.length || !pickerState.viewKey) return;
    setPickerState({ isOpen: false, viewKey: '' });
    setCreateItemSetModalState({ isOpen: true, viewKey: pickerState.viewKey, itemSetIds: pickerState.itemSetIds });
  }, [pickerState.viewKey, pickerState.itemSetIds]);

  const resolveLinkedItemsForView = useCallback(
    (viewKey: string): any[] => {
      if (formData[viewKey] !== undefined) return Array.isArray(formData[viewKey]) ? formData[viewKey] : [];
      if (Array.isArray(itemDetails?.[viewKey])) return itemDetails[viewKey];
      const property = config.viewKeyToProperty?.[viewKey];
      if (property && Array.isArray(itemDetails?.[property])) {
        const resourceCache = itemDetails.resourceCache || {};
        return itemDetails[property]
          .map((ref: any) => {
            const resourceId = getLinkedResourceId(ref);
            if (resourceId == null) return null;
            const cached = resourceCache[resourceId];
            return {
              id: resourceId,
              'o:id': resourceId,
              value_resource_id: ref.value_resource_id ?? resourceId,
              title: cached ? getLinkedResourceTitle({ ...cached, id: resourceId }) : getLinkedResourceTitle(ref),
              ownerId: getResourceOwnerId(cached) ?? getResourceOwnerId(ref),
            };
          })
          .filter(Boolean);
      }
      return [];
    },
    [formData, itemDetails, config.viewKeyToProperty],
  );

  const unlinkItemFromView = useCallback(
    (viewKey: string, itemId: string | number) => {
      const currentItems = resolveLinkedItemsForView(viewKey);
      const updatedItems = currentItems.filter((item: any) => {
        const iid = item.id || item['o:id'] || item.value_resource_id;
        return iid !== itemId && String(iid) !== String(itemId);
      });
      setValue(viewKey, updatedItems);
    },
    [resolveLinkedItemsForView, setValue],
  );

  const handleRemoveItem = (viewKey: string, itemId: string | number) => {
    const currentItems = resolveLinkedItemsForView(viewKey);
    const itemToDelete = currentItems.find((item: any) => {
      const iid = item.id || item['o:id'] || item.value_resource_id;
      return iid === itemId || String(iid) === String(itemId);
    });

    const viewOption = config.viewOptions.find((v) => v.key === viewKey);
    const templateId = resolveViewResourceTemplateId(viewKey, viewOption);
    const hardDelete = shouldHardDeleteLinkedResource(templateId);

    if (!hardDelete) { unlinkItemFromView(viewKey, itemId); return; }

    // Enrichir avec l'ownerId du resourceCache si manquant dans formData
    // (le formData peut avoir été initialisé avant que le cache soit chargé)
    const cachedOwner = itemDetails?.resourceCache?.[itemId];
    const enrichedItem = itemToDelete
      ? { ...itemToDelete, ownerId: itemToDelete.ownerId ?? getResourceOwnerId(cachedOwner) ?? getResourceOwnerId(itemToDelete) }
      : itemToDelete;

    if (!canDeleteLinkedResource(enrichedItem, currentOmekaUserId, userCreatedResourceIds, isGlobalAdminEdit)) {
      addToast({ title: 'Action non autorisée', description: 'Seul le propriétaire de la ressource peut la supprimer.', classNames: { base: 'bg-warning', title: 'text-c6', description: 'text-c5', icon: 'text-c6' } });
      return;
    }

    const itemTitle = itemToDelete?.title || getLinkedResourceTitle(itemToDelete) || '';
    setDeleteModalState({ isOpen: true, viewKey, itemId, itemTitle, hardDelete: true });
  };

  const handleConfirmDelete = async () => {
    const { viewKey, itemId } = deleteModalState;
    if (itemId === null) return;
    setIsDeletingLinkedItem(true);
    try {
      await deleteUserResource(itemId);
      unlinkItemFromView(viewKey, itemId);
      addToast({ title: 'Suppression réussie', description: "L'élément a été supprimé définitivement.", classNames: { base: 'bg-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' }, timeout: 2000 });
      setDeleteModalState({ isOpen: false, viewKey: '', itemId: null, hardDelete: false });
    } catch (error) {
      addToast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur lors de la suppression.', classNames: { base: 'bg-danger', title: 'text-c6', description: 'text-c5', icon: 'text-c6' } });
    } finally {
      setIsDeletingLinkedItem(false);
    }
  };

  const handleItemsChange = (viewKey: string, items: any[]) => {
    if (items.length > 0 && items[0].dataPath) {
      setValue(viewKey, items[0].value);
      setValue(items[0].dataPath, items[0].value);
    } else {
      setValue(viewKey, items);
    }
  };

  const handleResourceSelect = (resources: any[]) => {
    const { viewKey, resourceTemplateId: pickerTemplateId } = pickerState;
    const currentItems = resolveLinkedItemsForView(viewKey);
    const normalizedResources = resources.map((r) => {
      const title = r['o:title'] || r['dcterms:title']?.[0]?.['@value'] || r.title || r.display_title || '';
      const templateId = r['o:resource_template']?.['o:id'] || r.resource_template_id || pickerTemplateId;
      let type = r.type;
      if (!type && templateId) type = resolveResourceTypeFromOmekaItem(r) ?? TEMPLATE_ID_TO_TYPE[Number(templateId)];
      const thumbnailUrl = r['thumbnail_display_urls']?.square || r.thumbnailUrl || r.thumbnail || r.picture || null;
      // owner_id vient du ResourcePickerViewHelper (backend) ou du champ o:owner Omeka
      const rawOwnerId = r.owner_id ?? r['o:owner']?.['o:id'] ?? null;
      const ownerId = rawOwnerId != null ? Number(rawOwnerId) : undefined;
      return {
        id: r['o:id'] || r.id,
        title,
        name: title,
        short_resume: r['dcterms:description']?.[0]?.['@value'] || r.short_resume || '',
        picture: thumbnailUrl,
        thumbnail: thumbnailUrl,
        thumbnailUrl,
        '@id': r['@id'],
        'o:id': r['o:id'] || r.id,
        _sessionCreated: r._sessionCreated,
        resource_template_id: templateId,
        type,
        template: r.template || (templateId ? { id: templateId } : undefined),
        ownerId,
      };
    });
    const updatedItems = [...currentItems, ...normalizedResources];
    normalizedResources.forEach((r) => { if (r._sessionCreated && r.id != null) markResourceAsUserCreated(r.id); });
    setValue(viewKey, updatedItems);
    setPickerState({ isOpen: false, viewKey: '' });
  };

  const handleCreateItemSetResource = async () => {
    if (!createItemSetTitle.trim()) return;
    setCreateItemSetLoading(true);
    try {
      const body = {
        'o:item_set': createItemSetModalState.itemSetIds.map((setId) => ({ 'o:id': setId })),
        'dcterms:title': [{ type: 'literal', '@value': createItemSetTitle.trim(), property_id: 1, is_public: true }],
      };
      const response = await fetch(omekaApiUrl(`${API_BASE}items`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('Erreur création');
      const created = await response.json();
      const newId = created['o:id'];
      const { viewKey } = createItemSetModalState;
      const currentItems = formData[viewKey] || itemDetails?.[viewKey] || [];
      setValue(viewKey, [...currentItems, { id: newId, 'o:id': newId, title: createItemSetTitle.trim() }]);
      setCreateItemSetModalState({ isOpen: false, viewKey: '', itemSetIds: [] });
      setCreateItemSetTitle('');
      addToast({ title: 'Créé avec succès', classNames: { base: 'bg-success', title: 'text-c6' }, timeout: 2000 });
    } catch {
      addToast({ title: 'Erreur lors de la création', classNames: { base: 'bg-danger', title: 'text-c6' }, timeout: 3000 });
    } finally {
      setCreateItemSetLoading(false);
    }
  };

  const handleRemoveExistingMedia = (index: number) => {
    setRemovedMediaIndexes((prev) => [...prev, index]);
  };

  // ================================
  // Views for right column
  // ================================
  // In edit mode: show ALL views that are editable and not hidden in form
  const editableViews = useMemo(
    () => config.viewOptions.filter((v) => v.editable !== false && !v.hiddenInForm),
    [config.viewOptions],
  );

  const shouldShowRightColumn = editableViews.length > 0 && !config.editSingleColumn;
  const useSingleColumnEdit = config.editSingleColumn;
  const useCenteredSingleColumn = config.editSingleColumn || !shouldShowRightColumn;
  const leftColumnSpan = shouldShowRightColumn ? 'col-span-10 lg:col-span-6' : 'col-span-10';
  const centeredShellClass = useCenteredSingleColumn ? 'w-full max-w-3xl' : 'w-full';
  const leftColumnOuterClassName = `${leftColumnSpan}${useCenteredSingleColumn ? ' flex justify-center' : ''}`;
  const leftColumnInnerClassName = `${centeredShellClass} flex flex-col gap-5 h-fit`;
  const singleColumnEditShell = useCenteredSingleColumn ? 'w-full flex flex-col gap-12' : 'flex flex-col gap-6 w-full';

  const selectedOption = editableViews.find((option) => option.key === selected) ?? config.viewOptions.find((option) => option.key === selected);

  // Ensure selected is always a valid view
  useEffect(() => {
    if (editableViews.length > 0 && !editableViews.some((v) => v.key === selected)) {
      const defaultView = config.defaultView && editableViews.find((v) => v.key === config.defaultView);
      setSelected(defaultView ? defaultView.key : editableViews[0].key);
    }
  }, [editableViews, selected, config.defaultView]);

  // ================================
  // Keywords (sorted)
  // ================================
  const sortedKeywords = useMemo(() => {
    let allKeywords: any[];
    if (formData.keywords !== undefined) {
      allKeywords = Array.isArray(formData.keywords) ? formData.keywords : [];
    } else {
      allKeywords = Array.isArray(keywords) ? keywords : [];
    }
    return [...allKeywords].sort((a, b) => {
      const popA = a.popularity || a.count || 0;
      const popB = b.popularity || b.count || 0;
      return popB - popA;
    });
  }, [formData.keywords, keywords]);

  // ================================
  // Rendered content for selected view
  // In edit mode: ALWAYS render content, no viewHasRenderableContent gate
  // ================================
  const renderedContent = useMemo(() => {
    const viewOption = config.viewOptions.find((opt) => opt.key === selected);
    if (!viewOption?.renderContent) return null;

    const dataSource = { ...itemDetails, ...formData };

    const content = viewOption.renderContent({
      itemDetails: dataSource,
      viewData,
      loading: false,
      loadingViews: false,
      onTimeChange: () => {},
      isEditing: viewOption.editable !== false,
      onLinkExisting: handleLinkExisting,
      onCreateNew: handleCreateNewFromView,
      onRemoveItem: handleRemoveItem,
      onItemsChange: handleItemsChange,
      onEditResource: effectiveOnEditResource,
      formData,
      onNavigate: undefined,
      updatedResources,
      userCreatedResourceIds,
      currentOmekaUserId,
      isGlobalAdminEdit,
    });

    return content || null;
  }, [
    itemDetails,
    formData,
    selected,
    viewData,
    config.viewOptions,
    updatedResources,
    effectiveOnEditResource,
    handleLinkExisting,
    handleCreateNewFromView,
    userCreatedResourceIds,
    currentOmekaUserId,
    isGlobalAdminEdit,
    // handleRemoveItem and handleItemsChange are stable useCallback/functions
  ]);

  // ================================
  // Auto-resource tree (for EditSaveBar)
  // ================================
  const autoResourceTree = useMemo(() => {
    if (resourceTree) return undefined;
    if (!config.type || !itemDetails) return undefined;
    const rootLabel = getRessourceLabel(config.type);
    if (!rootLabel) return undefined;

    const singularize = (title: string): string =>
      title.split(' ').map((w) => (w.length > 2 && w.endsWith('s') ? w.slice(0, -1) : w)).join(' ');
    const pluralize = (title: string, count: number): string =>
      count === 1 ? `${count} ${singularize(title)}` : `${count} ${title}`;

    const children = editableViews
      .flatMap((v) => {
        const count = v.getItemCount ? v.getItemCount(itemDetails, formData) : 0;
        if (count === 0) return [];
        const displayTitle = (v as any).viewKind === 'text' ? v.title : pluralize(v.title, count);
        return [{ title: displayTitle, isActive: false }];
      });

    if (children.length === 0) return undefined;
    return { root: rootLabel, children };
  }, [config.type, editableViews, itemDetails, formData, resourceTree]);

  // ================================
  // Loading spinner while fetching initial data
  // ================================
  if (loading && mode !== 'create' && !isDraft) {
    return (
      <>
        <Layouts className='grid grid-cols-10 col-span-10 gap-6 overflow-visible z-0'>
          <div className='col-span-10 overflow-visible'>
            <EditModeBanner mode='edit' resourceType={config.type || 'Ressource'} labelOverride={config.resourceLabel} />
          </div>
          <motion.div className='col-span-10 flex flex-col gap-4 h-fit items-center justify-center py-5' variants={fadeIn}>
            <Spinner color="current" className="text-c6" />
            <p className="text-c6">Chargement en cours...</p>
          </motion.div>
        </Layouts>
      </>
    );
  }

  // ================================
  // Main render
  // ================================
  const OverviewComponent = config.overviewComponent;

  return (
    <>
      <Layouts className='grid grid-cols-10 col-span-10 gap-6 overflow-visible z-0'>
        {/* Edit Mode Banner */}
        <div className='col-span-10 overflow-visible'>
          <EditModeBanner mode={mode === 'create' ? 'create' : 'edit'} resourceType={config.type || 'Ressource'} labelOverride={config.resourceLabel} />
        </div>

        {/* Left column */}
        <motion.div className={leftColumnOuterClassName} variants={fadeIn} initial='hidden' animate='visible'>
          <div className={leftColumnInnerClassName}>

            {/* Keywords section */}
            {config.showKeywords && (
              loadingKeywords ? (
                <KeywordsCarouselSkeleton />
              ) : (
                <div className='flex flex-col gap-2'>
                  <div className='flex flex-wrap gap-2 items-center w-full'>
                    {sortedKeywords?.map((keyword: any) => (
                      <div key={keyword.id || keyword.title} className={selectedResourceChipClass}>
                        <span>{keyword.title}</span>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            const current = formData.keywords || [];
                            setValue('keywords', current.filter((k: any) => k.id !== keyword.id));
                          }}
                          className={selectedResourceRemoveButtonClass}
                          aria-label='Retirer le mot-clé'>
                          <ModalCloseIcon />
                        </button>
                      </div>
                    ))}
                    <button
                      type='button'
                      onClick={() => handleLinkExisting('keywords')}
                      className={dropdownTriggerButtonClass}>
                      <AddIcon size={14} className='text-c4 shrink-0' />
                      Ajouter un mot-clé
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Edit form */}
            <div className={`${singleColumnEditShell} ${useCenteredSingleColumn ? 'items-stretch' : ''}`}>
              {/* Media section */}
              {config.mediaUploadMode !== 'none' && OverviewComponent && (
                <div className='w-full flex flex-col gap-4'>
                  <OverviewComponent
                    {...config.mapOverviewProps({ ...itemDetails, ...formData }, 0)}
                    videoSeek={null}
                    type={config.type}
                    isEditing={true}
                    loadingMedia={false}
                    mediaUploadMode={config.mediaUploadMode}
                    onTitleChange={(value: string) => setValue('title', value)}
                    onMediasChange={(files: MediaFile[]) => setMediaFiles(files)}
                    onLinkChange={(value: string) => setValue('fullUrl', value)}
                    youtubeUrls={config.mediaUploadMode === 'gallery' ? youtubeUrls : []}
                    onYouTubeUrlsChange={
                      config.mediaUploadMode === 'gallery' ? (urls: string[]) => setYoutubeUrls(urls) : undefined
                    }
                    mediaFiles={mediaFiles}
                    removedMediaIndexes={removedMediaIndexes}
                    onRemoveExistingMedia={handleRemoveExistingMedia}
                  />
                </div>
              )}

              {/* Contributor buttons */}
              {config.contributorButtons && config.contributorButtons.length > 0 && (() => {
                const seen = new Set<string>();
                const allContributors: any[] = [];
                config.contributorButtons!.forEach((btn) => {
                  const items: any[] = Array.isArray(formData[btn.property])
                    ? formData[btn.property]
                    : Array.isArray(formData['personnes'])
                      ? formData['personnes']
                      : [];
                  items.forEach((item) => {
                    const itemId = getLinkedResourceId(item);
                    if (itemId == null || seen.has(String(itemId))) return;
                    seen.add(String(itemId));
                    allContributors.push({ ...item, id: itemId, title: getLinkedResourceTitle(item, btn.templateId), _property: btn.property });
                  });
                });
                return (
                  <div className='flex flex-wrap gap-2 items-center w-full'>
                    {allContributors.map((item: any, idx: number) => {
                      const isUserCreated =
                        isGlobalAdminEdit ||
                        userCreatedResourceIds?.has(String(item.id)) ||
                        String(item.ownerId) === String(currentOmekaUserId);
                      const canEditChip = isUserCreated && effectiveOnEditResource;
                      const btn = config.contributorButtons!.find((b) => b.property === item._property);
                      return (
                        <div key={item.id || idx} className={selectedResourceChipClass}>
                          <span
                            onClick={() => { if (canEditChip && btn) effectiveOnEditResource(item._property, item.id, btn.templateId); }}
                            className={canEditChip ? 'cursor-pointer hover:underline' : ''}>
                            {item.title || item.name}
                          </span>
                          <button
                            type='button'
                            onClick={() => {
                              const prop = item._property;
                              const current: any[] = Array.isArray(formData[prop]) ? formData[prop] : [];
                              setValue(prop, current.filter((c: any) => String(getLinkedResourceId(c)) !== String(item.id)));
                              const legacy: any[] = Array.isArray(formData['personnes']) ? formData['personnes'] : [];
                              if (legacy.some((c: any) => String(getLinkedResourceId(c)) === String(item.id))) {
                                setValue('personnes', legacy.filter((c: any) => String(getLinkedResourceId(c)) !== String(item.id)));
                              }
                            }}
                            className={selectedResourceRemoveButtonClass}
                            aria-label='Retirer'>
                            <ModalCloseIcon />
                          </button>
                        </div>
                      );
                    })}
                    {config.contributorButtons!.map((btn) => (
                      <button
                        key={`${btn.property}-${btn.templateId}`}
                        type='button'
                        onClick={() => setActiveResourceField({ key: btn.property, label: btn.label, templateId: btn.templateId })}
                        className={dropdownTriggerButtonClass}>
                        <AddIcon size={14} className='text-c4 shrink-0' />
                        {btn.label}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Unified form section */}
              <div className={`${useSingleColumnEdit ? 'border-t border-c3 pt-6' : 'rounded-xl p-6 border-2 border-c3'} flex flex-col gap-8 items-start w-full`}>
                <FormTextInput
                  label='Titre'
                  value={formData.title || ''}
                  onChange={(value) => setValue('title', value)}
                  placeholder='Titre de la ressource'
                />

                {config.formFields?.filter((f) => f.key === 'description').map((field) => (
                  <FormAutoResizeTextareaInput
                    key={field.key}
                    label={field.label}
                    value={formData.description || ''}
                    onChange={(value) => setValue('description', value)}
                    placeholder={field.placeholder ?? 'Décrivez votre ressource...'}
                  />
                ))}

                {config.formFields?.filter((f) => f.key === 'date').map((field) => (
                  <FormDateInput
                    key={field.key}
                    label={field.label}
                    value={formData.date || ''}
                    onChange={(value) => setValue('date', value)}
                    isRequired={field.required}
                    errorMessage={formErrors.date}
                    isInvalid={!!formErrors.date}
                  />
                ))}

                {config.formFields?.find((f) => f.key === 'percentage') && (
                  <div className='w-full'>
                    <div className='flex justify-between items-center'>
                      <span className={formFieldLabelClass}>Avancement</span>
                      <span className='text-c6 font-semibold'>{formData.percentage || 0}%</span>
                    </div>
                    <input
                      type='range' min='0' max='100' step='5'
                      value={formData.percentage || 0}
                      onChange={(e) => setValue('percentage', parseInt(e.target.value))}
                      className='w-full mt-2.5 accent-action'
                    />
                  </div>
                )}

                {config.formFields?.find((f) => f.key === 'status') && (
                  <FormTextInput label='Statut' value={formData.status || ''} onChange={(value) => setValue('status', value)} placeholder='En cours, Terminé...' />
                )}

                {config.formFields?.find((f) => f.key === 'category') && (
                  <FormTextInput label="Type d'outil" value={formData.category || ''} onChange={(value) => setValue('category', value)} placeholder='Logiciel, Bibliothèque, Framework...' />
                )}

                {config.formFields?.filter((f) => f.key === 'purpose').map((purposeField) => (
                  <FormAutoResizeTextareaInput
                    key={purposeField.key}
                    label={purposeField.label}
                    value={formData.purpose || ''}
                    onChange={(value) => setValue('purpose', value)}
                    placeholder={purposeField.placeholder}
                  />
                ))}

                {/* Dynamic text/url/textarea/date fields */}
                {config.formFields
                  ?.filter((f) => {
                    const handled = new Set(['title', 'description', 'date', 'percentage', 'status', 'category', 'purpose']);
                    return !handled.has(f.key) && ['text', 'url', 'textarea', 'date'].includes(f.type);
                  })
                  .map((field) => {
                    if (field.type === 'textarea') {
                      return (
                        <FormAutoResizeTextareaInput
                          key={field.key}
                          label={field.label}
                          value={formData[field.key] || ''}
                          onChange={(value) => setValue(field.key, value)}
                          placeholder={field.placeholder}
                        />
                      );
                    }
                    if (field.type === 'date') {
                      return (
                        <FormDateInput
                          key={field.key}
                          label={field.label}
                          value={formData[field.key] || ''}
                          onChange={(value) => setValue(field.key, value)}
                          isRequired={field.required}
                          errorMessage={formErrors[field.key]}
                          isInvalid={!!formErrors[field.key]}
                        />
                      );
                    }
                    return (
                      <FormTextInput
                        key={field.key}
                        label={field.label}
                        type={field.type === 'url' ? 'url' : 'text'}
                        value={formData[field.key] || ''}
                        onChange={(value) => setValue(field.key, value)}
                        placeholder={field.placeholder}
                      />
                    );
                  })}

                {/* Static select fields */}
                {config.formFields
                  ?.filter((f) => f.type === 'selection' && Array.isArray(f.options) && f.options!.length > 0)
                  .map((field) => {
                    const currentValue = formData[field.key] || field.options![0].value;
                    return (
                      <Select
                        key={field.key}
                        label={field.label}
                        selectedKeys={[currentValue]}
                        onSelectionChange={(keys) => {
                          const key = Array.from(keys)[0];
                          if (key) setValue(field.key, String(key));
                        }}>
                        {field.options!.map((opt) => <SelectItem key={opt.value}>{opt.label}</SelectItem>)}
                      </Select>
                    );
                  })}

                {/* ItemSet select fields */}
                {config.formFields
                  ?.filter((f) => f.type === 'selection' && f.selectionConfig?.itemSetId)
                  .map((field) => (
                    <ItemSetFormField
                      key={field.key}
                      label={field.label}
                      itemSetId={field.selectionConfig!.itemSetId!}
                      multiple={field.selectionConfig?.multiple}
                      value={
                        Array.isArray(formData[field.key])
                          ? formData[field.key]
                          : typeof formData[field.key] === 'number'
                            ? [{ id: formData[field.key], title: '' }]
                            : []
                      }
                      onChange={(items) => setValue(field.key, items)}
                    />
                  ))}

                {/* Multiselection resource fields */}
                {config.formFields
                  ?.filter((f) => f.type === 'multiselection' && f.selectionConfig?.templateId)
                  .filter((f) => {
                    if (autoContributorConfig && f.key === autoContributorConfig.fieldKey) return false;
                    if (config.showKeywords && f.key === 'keywords') return false;
                    return true;
                  })
                  .map((field) => {
                    const fieldSelected: any[] = Array.isArray(formData[field.key]) ? formData[field.key] : [];
                    return (
                      <div key={field.key} className='flex flex-col gap-2'>
                        <label className={formFieldLabelClass}>{field.label}</label>
                        <div className='flex flex-wrap gap-2 items-center'>
                          {fieldSelected.map((item: any, idx: number) => {
                            const itemId = getLinkedResourceId(item);
                            return (
                              <div key={itemId ?? idx} className={selectedResourceChipClass}>
                                <span>{getLinkedResourceTitle(item, field.selectionConfig?.templateId)}</span>
                                <button
                                  type='button'
                                  onClick={() => setValue(field.key, fieldSelected.filter((s: any) => String(getLinkedResourceId(s)) !== String(itemId)))}
                                  className={selectedResourceRemoveButtonClass}
                                  aria-label='Retirer'>
                                  <ModalCloseIcon />
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type='button'
                            onClick={() => setActiveResourceField({ key: field.key, label: field.label, templateId: field.selectionConfig!.templateId!, displayMode: config.resourcePickerDisplay })}
                            className={dropdownTriggerButtonClass}>
                            <AddIcon size={14} className='text-c4 shrink-0' />
                            Ajouter
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Single-column views (editSingleColumn config) */}
              {useSingleColumnEdit && editableViews.length > 0 && (
                <div className='w-full border-t border-c3 pt-6'>
                  {renderSingleColumnViews()}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right column — clean, no viewHasRenderableContent gate */}
        {shouldShowRightColumn && (
          <motion.div
            className='col-span-10 lg:col-span-4 flex flex-col gap-5'
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } }}>

            {/* View selector */}
            <div className='flex items-center justify-between gap-3 w-full min-w-0'>
              <h2 className='text-2xl font-medium text-c6 truncate flex-1 min-w-0'>{selectedOption?.title}</h2>
              <Dropdown classNames={dropdownContentClassNames}>
                <DropdownTrigger className='shrink-0 p-0 bg-transparent border-0 data-[hover=true]:bg-transparent'>
                  <div className={dropdownTriggerButtonClass}>
                    <span className='text-base font-normal text-c6 whitespace-nowrap'>Autres choix</span>
                    <ArrowIcon size={12} className='rotate-90 text-c6 shrink-0' />
                  </div>
                </DropdownTrigger>
                <DropdownMenu aria-label='View options' className='p-2' classNames={dropdownMenuClassNames}>
                  {editableViews.map((option) => (
                    <DropdownItem
                      key={option.key}
                      className={dropdownMenuItemClass}
                      onPress={() => setSelected(option.key)}>
                      <div className={`flex items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 ${selected === option.key ? 'bg-c3 text-c6 font-medium' : 'text-c6 hover:bg-c3'}`}>
                        <span className='text-base font-normal'>{option.title}</span>
                      </div>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </div>

            {/* Content — ALWAYS shown, no viewHasRenderableContent check */}
            <div className='w-full'>
              {renderedContent}
            </div>
          </motion.div>
        )}

        <SearchModal ref={searchModalRef} notrigger={true} />

        {/* Resource Picker Modal */}
        <ResourcePicker
          isOpen={pickerState.isOpen}
          onClose={() => setPickerState({ isOpen: false, viewKey: '' })}
          onSelect={handleResourceSelect}
          title={pickerState.pickerTitle || `Sélectionner ${pickerState.viewKey === 'keywords' ? 'des mots-clés' : 'des ressources'}`}
          resourceTemplateId={pickerState.resourceTemplateId}
          resourceTemplateIds={pickerState.resourceTemplateIds}
          itemSetIds={pickerState.itemSetIds}
          multiSelect={pickerState.multiSelect}
          selectedIds={[]}
          displayMode={pickerState.viewKey === 'keywords' || pickerState.itemSetIds ? 'alphabetic' : 'grid'}
          allowCreate={pickerAllowsCreate}
          createOnly={pickerState.createOnly}
          onCreateOverride={
            pickerState.itemSetIds?.length ? handlePickerCreateOverride : onCreateNewResource ? handlePickerCreateInTab : undefined
          }
        />

        {/* Field resource picker (multiselection form fields) */}
        {activeResourceField && (
          <ResourcePicker
            isOpen={true}
            onClose={() => setActiveResourceField(null)}
            onSelect={(resources) => {
              const existingItems: any[] = Array.isArray(formData[activeResourceField.key]) ? formData[activeResourceField.key] : [];
              const normalizedNew = resources.map((r) => ({
                id: r['o:id'] || r.id,
                'o:id': r['o:id'] || r.id,
                title: r['o:title'] || r.title || `Item ${r['o:id'] || r.id}`,
              }));
              const merged = [...existingItems, ...normalizedNew.filter((r) => !existingItems.some((e) => String(e.id) === String(r.id)))];

              if (autoContributorConfig && activeResourceField.key === autoContributorConfig.fieldKey) {
                const personnes: any[] = Array.isArray(formData['personnes']) ? formData['personnes'] : [];
                const mergedPersonnes = [...personnes, ...normalizedNew.filter((r) => !personnes.some((p: any) => String(getLinkedResourceId(p)) === String(r.id)))];
                setValue('personnes', mergedPersonnes);
              }
              setValue(activeResourceField.key, merged);
              setActiveResourceField(null);
            }}
            title={activeResourceField.label}
            resourceTemplateId={activeResourceField.templateId}
            multiSelect={true}
            displayMode={activeResourceField.displayMode === 'alphabetic' ? 'alphabetic' : 'grid'}
            allowCreate={
              activeResourceField.displayMode === 'alphabetic'
                ? activeResourceField.templateId === 34
                : !!(getResourceConfigByTemplateId(activeResourceField.templateId)?.createUrl || QUICK_CREATE_CONFIGS[activeResourceField.templateId])
            }
            selectedIds={[]}
            filterFn={(resource) => {
              const alreadySelected = (Array.isArray(formData[activeResourceField.key]) ? formData[activeResourceField.key] : [])
                .map((r: any) => r.id)
                .filter(Boolean);
              const resourceId = resource['o:id'] || resource.id;
              return !alreadySelected.includes(resourceId);
            }}
            onCreateOverride={onCreateNewResource ? handleFieldCreateInTab : undefined}
          />
        )}

        {/* ItemSet creation modal */}
        <Modal
          isOpen={createItemSetModalState.isOpen}
          onClose={() => { setCreateItemSetModalState({ isOpen: false, viewKey: '', itemSetIds: [] }); setCreateItemSetTitle(''); }}
          backdrop='blur' size='md' scrollBehavior='inside'
          classNames={{ closeButton: modalCloseButtonClasses }}
          motionProps={{ variants: { enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }, exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } } } }}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className='flex flex-col gap-px'>
                  <ModalTitle title='Créer une nouvelle entrée' icon={AddIcon} iconColor='text-action' iconBg='bg-action/20' titleClassName='text-c6 text-xl font-semibold' />
                </ModalHeader>
                <ModalBody>
                  <FormTextInput
                    label='Titre'
                    value={createItemSetTitle}
                    onChange={setCreateItemSetTitle}
                    placeholder="Nom de l'entrée..."
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateItemSetResource(); }}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button variant='light' onPress={onClose} className='text-c5 rounded-lg'>Annuler</Button>
                  <Button onPress={() => void handleCreateItemSetResource()} isLoading={createItemSetLoading} isDisabled={!createItemSetTitle.trim()} className='bg-action text-selected rounded-lg'>Créer</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Delete linked item modal */}
        <AlertModal
          isOpen={deleteModalState.isOpen}
          onClose={() => !isDeletingLinkedItem && setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
          title='Confirmer la suppression'
          type='danger'
          confirmLabel='Supprimer'
          onConfirm={handleConfirmDelete}
          isLoading={isDeletingLinkedItem}
          description={
            <>
              <p>
                {deleteModalState.itemTitle ? (
                  <>Supprimer définitivement <span className='text-c6 font-medium'>&quot;{deleteModalState.itemTitle}&quot;</span> ?</>
                ) : (
                  'Supprimer définitivement cet élément ?'
                )}
              </p>
              <p className='text-c4 text-sm mt-2.5'>Cette action est irréversible.</p>
            </>
          }
        />

        {/* Draft delete confirmation */}
        <AlertModal
          isOpen={draftDeleteConfirmOpen}
          onClose={() => {
            if (isDeletingDraft) return;
            if (blocker.state === 'blocked') blocker.reset();
            setDraftDeleteConfirmOpen(false);
          }}
          title='Supprimer ce brouillon ?'
          type='danger'
          confirmLabel='Supprimer le brouillon'
          cancelLabel='Annuler'
          onConfirm={handleDeleteDraft}
          isLoading={isDeletingDraft}
          description={
            <p>Ce brouillon et toutes les ressources qui y sont liées seront <strong>supprimés définitivement</strong>.</p>
          }
        />

        {/* Unsaved changes warning */}
        <AlertModal
          isOpen={unsavedChangesWarningOpen}
          onClose={() => {
            if (blocker.state === 'blocked') blocker.reset();
            setUnsavedChangesWarningOpen(false);
          }}
          title='Modifications non sauvegardées'
          type='warning'
          confirmLabel='Sauvegarder et continuer'
          cancelLabel='Quitter'
          onCancelAction={() => {
            setUnsavedChangesWarningOpen(false);
            if (blocker.state === 'blocked') { bypassBlockerRef.current = true; blocker.proceed(); }
            else performCancel();
          }}
          onConfirm={async () => {
            try { await handleSave(); } finally {
              setUnsavedChangesWarningOpen(false);
              if (blocker.state === 'blocked') { bypassBlockerRef.current = true; blocker.proceed(); }
              else performCancel();
            }
          }}
          description={<p>Vous avez des modifications non sauvegardées. Voulez-vous les sauvegarder avant de quitter&nbsp;?</p>}
        />

        {/* Orphan warning (pending auto-save) */}
        <AlertModal
          isOpen={orphanWarningOpen}
          onClose={() => setOrphanWarningOpen(false)}
          title='Liens non sauvegardés'
          type='warning'
          confirmLabel={isSavingBeforeCancel ? 'Sauvegarde…' : 'Sauvegarder et quitter'}
          cancelLabel='Quitter sans sauvegarder'
          onCancelAction={() => { setOrphanWarningOpen(false); performCancel(); }}
          onConfirm={async () => {
            setIsSavingBeforeCancel(true);
            try { await handleSave(); } finally {
              setIsSavingBeforeCancel(false);
              setOrphanWarningOpen(false);
              performCancel();
            }
          }}
          isLoading={isSavingBeforeCancel}
          description={<p>Des ressources créées n&apos;ont pas encore été liées. Si vous quittez, elles <strong>ne seront plus rattachées</strong> à cette fiche.</p>}
        />
      </Layouts>

      {/* Fixed bottom save bar */}
      <EditSaveBar
        isVisible={true}
        onSave={handleSave}
        onCancel={handleCancelEdit}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        mode={mode}
        isDraft={isDraft}
        saveLabel={saveLabel}
        resourceTree={resourceTree ?? autoResourceTree}
      />
    </>
  );

  // ================================
  // Helper: render views in single-column mode
  // ================================
  function renderSingleColumnViews() {
    return (
      <div className='flex flex-col gap-5'>
        <div className='flex items-center justify-between gap-3 w-full min-w-0'>
          <h2 className='text-2xl font-medium text-c6 truncate flex-1 min-w-0'>{selectedOption?.title}</h2>
          {editableViews.length > 1 && (
            <Dropdown classNames={dropdownContentClassNames}>
              <DropdownTrigger className='shrink-0 p-0 bg-transparent border-0 data-[hover=true]:bg-transparent'>
                <div className={dropdownTriggerButtonClass}>
                  <span className='text-base font-normal text-c6 whitespace-nowrap'>Autres choix</span>
                  <ArrowIcon size={12} className='rotate-90 text-c6 shrink-0' />
                </div>
              </DropdownTrigger>
              <DropdownMenu aria-label='View options' className='p-2' classNames={dropdownMenuClassNames}>
                {editableViews.map((option) => (
                  <DropdownItem key={option.key} className={dropdownMenuItemClass} onPress={() => setSelected(option.key)}>
                    <div className={`flex items-center w-full ${dropdownItemInnerPadding} rounded-lg ${selected === option.key ? 'bg-c3 text-c6 font-medium' : 'text-c6 hover:bg-c3'}`}>
                      <span className='text-base font-normal'>{option.title}</span>
                    </div>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
        <div className='w-full'>{renderedContent}</div>
      </div>
    );
  }
};
