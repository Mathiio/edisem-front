import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import { FormTextInput, FormAutoResizeTextareaInput, FormDateInput, formFieldLabelClass } from '@/components/features/forms/FormFields';
import { LongCarrousel, FullCarrousel } from '@/components/ui/Carrousels';
import { KeywordsCard, KeywordsCarouselSkeleton } from '@/components/features/conference/KeywordsCards';
import { Layouts } from '@/components/layout/Layouts';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/corpus/ResourceCard';
import { SearchModal, SearchModalRef } from '@/components/features/search/SearchModal';
import { ArrowIcon, AddIcon, ThumbnailIcon } from '@/components/ui/icons';
import { AlertModal } from '@/components/ui/AlertModal';
import { EditSaveBar } from '@/components/ui/EditSaveBar';
import { EditModeBanner } from '@/components/ui/EditModeBanner';
import { ResourceOwnerAttribution } from '@/components/ui/ResourceOwnerAttribution';
import CommentSection from '@/components/layout/CommentSection';
import { DynamicBreadcrumbs } from '@/components/layout/DynamicBreadcrumbs';
import { useResourceOwner } from '@/hooks/useResourceOwner';
import { GenericDetailPageConfig, PageMode, FetchResult, ViewOption } from './config';
import { generateSmartRecommendations } from './helpers';
import { ResourcePicker } from '@/components/features/forms/ResourcePicker';
import { getTemplatePropertiesMap } from '@/services/Items';
import { getRessourceLabel, getResourceConfigByTemplateId, getMonEspacePath, OMEKA_PROPERTY_IDS, TEMPLATE_ID_TO_TYPE, resolveResourceTypeFromOmekaItem } from '@/config/resourceConfig';
import {
  buildConferenceTypeOmekaValue,
  CONFERENCE_TEMPLATE_ID,
  CONFERENCE_TYPE_PROPERTY_ID,
  CONFERENCE_TYPE_TERMS,
  CONFERENCE_TYPE_VOCAB_ID,
  isConferenceTypeOmekaProperty,
} from '@/config/conferenceTypeConfig';
import { QUICK_CREATE_CONFIGS } from '@/components/features/forms/QuickCreateModal';
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
} from './resourceHelpers';
import { deleteUserResource, stashPendingMonEspaceResource, type StudentResourceCard } from '@/services/UserSpace';
import { useFormState } from '@/hooks/useFormState';
import { useAuth } from '@/hooks/useAuth';
import { OMEKA_API_BASE as API_BASE, omekaApiUrl, omekaAuthErrorMessage } from '@/utils/omekaApi';
import { MediaFile, DEFAULT_AUTHOR_TEMPLATE_IDS } from '@/components/features/forms/MediaDropzone';

// ========================================
// Composant local: sélecteur depuis un item set Omeka
// ========================================
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
                <button
                  type='button'
                  className={dropdownTriggerButtonClass}>
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
    <div className='w-full'>
      <Select
        label={label}
        labelPlacement='outside-top'
        classNames={{ label: formFieldLabelClass }}
        aria-label={label}
        selectedKeys={selected[0] ? new Set([String(selected[0].id)]) : new Set()}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0] as string;
          const found = items.find((i) => String(i.id) === key);
          if (found) onChange([found]);
        }}
        placeholder='Sélectionner...'>
        {items.map((item) => (
          <SelectItem key={String(item.id)} textValue={item.title}>
            {item.title}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};

const selectedResourceChipClass = 'flex items-center gap-2 pl-4 pr-2 h-12 border-2 border-c3 text-c6 rounded-xl text-sm';
const selectedResourceRemoveButtonClass = [
  modalCloseButtonClasses,
  'inline-flex items-center justify-center shrink-0 p-1 text-sm',
].join(' ');

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.15 },
  }),
};

interface PendingLink {
  linkedField: string;
  resourceId: string | number;
  resourceTitle?: string; // Titre de la ressource pour l'affichage
}

interface GenericDetailPageProps {
  config: GenericDetailPageConfig;
  initialMode?: PageMode;
  itemId?: string; // ID optionnel, sinon utilise useParams
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  onCreateNewResource?: (viewKey: string, resourceTemplateId?: number) => void;
  onSaveComplete?: (savedItemId: string | number, savedItemTitle?: string) => void; // Callback après sauvegarde réussie
  onEditResource?: (viewKey: string, resourceId: string | number, templateId?: number) => void; // Callback pour éditer une ressource existante
  onDirtyChange?: (isDirty: boolean) => void; // Callback quand l'état dirty change
  pendingLinks?: PendingLink[]; // Ressources à lier automatiquement (créées dans un onglet enfant)
  onPendingLinksProcessed?: () => void; // Callback après avoir traité les pendingLinks
  updatedResources?: Record<string, { title?: string; thumbnail?: string }>; // Ressources mises à jour dans les onglets enfants
  saveLabel?: string; // Libellé personnalisé pour le bouton de sauvegarde
  resourceTree?: { root: string; children: { title: string; isActive: boolean }[] }; // Arbre de composition
  /** Ressource parente (onglet enfant) — pré-remplit les vues hiddenInForm (ex. oa:hasTarget) */
  parentResourceId?: string | number;
  parentResourceTitle?: string;
}

/**
 * Composant générique pour afficher les pages de détails
 *
 * Ce composant unifie la logique commune de toutes les pages de type:
 * - conference, experimentation, miseEnRecit, recit_artistique, etc.
 *
 * Il est configurable via le prop `config` qui définit:
 * - Les données à récupérer (dataFetcher)
 * - Les composants à afficher (overviewComponent, detailsComponent)
 * - Les options de vue (viewOptions)
 * - Les sections optionnelles (keywords, recommendations, comments)
 */

export const GenericDetailPage: React.FC<GenericDetailPageProps> = ({
  config,
  initialMode = 'view',
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
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  // En mode create sans itemId, ne pas utiliser l'ID de l'URL
  // propItemId peut être undefined explicitement (nouvel item) ou une string (édition)
  const id = initialMode === 'create' && propItemId === undefined ? undefined : propItemId || paramId;
  const navigate = useNavigate();
  const { userData } = useAuth();
  const monEspacePath = getMonEspacePath(userData?.type);
  const currentOmekaUserId = userData?.omekaUserId ?? (localStorage.getItem('omekaUserId') ? parseInt(localStorage.getItem('omekaUserId')!, 10) : null);

  // Ressources créées par l'utilisateur dans cette session (édition au clic autorisée)
  const [userCreatedResourceIds, setUserCreatedResourceIds] = useState<Set<string>>(() => new Set());
  const markResourceAsUserCreated = useCallback((resourceId: string | number) => {
    setUserCreatedResourceIds((prev) => {
      const next = new Set(prev);
      next.add(String(resourceId));
      return next;
    });
  }, []);

  // Check URL for mode parameter (e.g., ?mode=edit)
  const urlMode = searchParams.get('mode') as PageMode | null;

  // Mode state - initialMode has priority over URL mode
  // This is important when creating a new resource tab while editing another resource:
  // the URL still has ?mode=edit but the new tab should be in create mode
  const [mode, setMode] = useState<PageMode>(initialMode !== 'view' ? initialMode : urlMode === 'edit' ? 'edit' : 'view');
  const isEditing = mode === 'edit' || mode === 'create';

  // Sync mode with URL parameter when it changes (e.g., navigating with ?mode=edit)
  // Only apply URL mode if initialMode was 'view' (not overridden by props)
  useEffect(() => {
    if (initialMode === 'view' && urlMode === 'edit' && mode !== 'edit') {
      setMode('edit');
    }
  }, [urlMode, initialMode]);

  // Sync URL parameter with mode state (keep ?mode=edit while editing)
  useEffect(() => {
    const currentUrlMode = searchParams.get('mode');

    if (mode === 'edit' && currentUrlMode !== 'edit') {
      // Add mode=edit to URL when entering edit mode
      searchParams.set('mode', 'edit');
      setSearchParams(searchParams, { replace: true });
    } else if (mode === 'view' && currentUrlMode === 'edit') {
      // Remove mode=edit from URL when exiting edit mode
      searchParams.delete('mode');
      setSearchParams(searchParams, { replace: true });
    }
  }, [mode, searchParams, setSearchParams]);

  // Form state using the hook
  const {
    state: formState,
    actions: formActions,
    setIsSubmitting,
  } = useFormState({
    initialData: {},
    fields: config.formFields || [],
  });

  // Destructure for easier access
  const { data: formData, isDirty, isSubmitting } = formState;
  const { setFieldValue: setValue, setMultipleValues: setFormData, resetForm: reset, validateForm: validate } = formActions;

  // Notify parent when dirty state changes (for tab management)
  // Use a ref to store the callback to avoid infinite loops
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
    // Only call if isDirty actually changed
    if (prevIsDirtyRef.current !== isDirty) {
      prevIsDirtyRef.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);

  // Process pending links from child tabs (resources created in other tabs that need to be linked)
  // Use a ref to track processed links and avoid reprocessing
  const processedLinksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (pendingLinks && pendingLinks.length > 0) {
      let hasProcessedNew = false;

      pendingLinks.forEach((link) => {
        // Create a unique key to track this specific link
        const linkKey = `${link.linkedField}-${link.resourceId}`;

        // Skip if already processed
        if (processedLinksRef.current.has(linkKey)) {
          return;
        }

        // Résoudre les items actuels avec fallback sur itemDetails et la propriété Omeka
        // (évite de perdre les items existants non encore chargés dans formData)
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
        // Avoid duplicates
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

        // Mark as processed
        processedLinksRef.current.add(linkKey);
        hasProcessedNew = true;
      });

      // Notify parent that links were processed
      if (hasProcessedNew && onPendingLinksProcessed) {
        onPendingLinksProcessed();
        // Auto-save en mode edit pour persister les liens immediatement
        if (mode === 'edit' && id) {
          shouldAutoSaveRef.current = true;
        }
      }
    }
  }, [pendingLinks, formData, setValue, onPendingLinksProcessed, mode, id, markResourceAsUserCreated, config.viewOptions, config.formFields, autoContributorConfig, currentOmekaUserId]);

  // Ref pour auto-save apres traitement des pendingLinks
  const shouldAutoSaveRef = useRef(false);

  // Pré-remplir les vues masquées avec la ressource parente (ex. oa:hasTarget = récit parent)
  useEffect(() => {
    if (!parentResourceId || !isEditing) return;

    config.viewOptions.forEach((view) => {
      if (!view.hiddenInForm) return;

      const current = formData[view.key];
      const alreadyLinked =
        Array.isArray(current) &&
        current.some((item) => String(getLinkedResourceId(item)) === String(parentResourceId));

      if (alreadyLinked) return;

      setValue(view.key, [
        {
          id: parentResourceId,
          'o:id': parentResourceId,
          title: parentResourceTitle || getResourceFallbackTitle(parentResourceId),
        },
      ]);
    });
  }, [parentResourceId, parentResourceTitle, isEditing, config.viewOptions, formData, setValue]);

  // Get changed fields (for save)
  const getChangedFields = useCallback(() => {
    return formData;
  }, [formData]);

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
  }>({
    isOpen: false,
    viewKey: '',
  });

  // Media files state for edit mode
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  // YouTube URLs to create as media
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);

  // Track removed existing media indexes
  const [removedMediaIndexes, setRemovedMediaIndexes] = useState<number[]>([]);

  // Properties map for dynamic property ID lookup (fetched from Omeka S API)
  const [propertiesMap, setPropertiesMap] = useState<Record<string, number>>({});

  // Search state for inline resource search (like in test-omeka-edit.tsx)
  const [searchResultsByProperty, setSearchResultsByProperty] = useState<Record<string, any[]>>({});
  const [, setSearchLoading] = useState(false);
  const [, setActiveSearchProperty] = useState<string | null>(null);
  const [propertyTemplateMap] = useState<Record<string, number>>({});

  // States
  const [videoSeek, setVideoSeek] = useState<{ time: number; id: number } | null>(null);
  const currentVideoTime = videoSeek?.time ?? 0;

  // Handle time change for video synchronization
  const handleTimeChange = (newTime: number) => {
    setVideoSeek({ time: newTime, id: Date.now() });
  };
  // En mode create, initialiser directement avec des données vides (pas de chargement nécessaire)
  const isCreateMode = initialMode === 'create';
  const [itemDetails, setItemDetails] = useState<any>(isCreateMode ? {} : null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [viewData, setViewData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(!isCreateMode);
  const [loadingRecommendations, setLoadingRecommendations] = useState(!isCreateMode);

  // États de loading progressif pour chaque zone
  const [loadingMedia, setLoadingMedia] = useState(!isCreateMode);
  const [loadingKeywords, setLoadingKeywords] = useState(!isCreateMode);
  const [loadingViews, setLoadingViews] = useState(!isCreateMode);
  const [selected, setSelected] = useState(config.defaultView || config.viewOptions[0]?.key || '');
  const [equalHeight, setEqualHeight] = useState<number | null>(null);
  const [isExitingRightColumn, setIsExitingRightColumn] = useState(false); // Pour l'animation de sortie

  // État pour le sélecteur de ressources liées (champs multiselection dans le formulaire)
  const [activeResourceField, setActiveResourceField] = useState<{
    key: string;
    label: string;
    templateId: number;
    displayMode?: 'grid' | 'alphabetic';
  } | null>(null);

  // Refs
  const firstDivRef = useRef<HTMLDivElement>(null);
  const searchModalRef = useRef<SearchModalRef>(null);

  const handleOptionSelect = (optionKey: string) => {
    setSelected(optionKey);
  };

  // Callback pour déclencher l'animation de sortie avant navigation
  const handleRightColumnNavigate = useCallback((url: string) => {
    setIsExitingRightColumn(true);
    // Naviguer vers l'URL après un court délai pour laisser l'animation jouer
    setTimeout(() => {
      navigate(url);
    }, 300);
  }, [navigate]);

  // Sync height
  useEffect(() => {
    if (firstDivRef.current) {
      setEqualHeight(firstDivRef.current.clientHeight);
    }
  }, [loading]);

  // Load properties map for create mode (fetches template-specific properties)
  useEffect(() => {
    if (mode === 'create' && config.resourceTemplateId) {
      getTemplatePropertiesMap(config.resourceTemplateId).then(setPropertiesMap);
    }
  }, [mode, config.resourceTemplateId]);

  // Fetch data avec support du chargement progressif
  const fetchData = useCallback(async () => {
    // En mode create, pas besoin de fetch - on initialise avec des données vides
    if (mode === 'create') {
      setLoading(false);
      setLoadingMedia(false);
      setLoadingKeywords(false);
      setLoadingViews(false);
      setLoadingRecommendations(false);
      setItemDetails({});
      return;
    }

    if (!id) return;

    setLoading(true);
    setLoadingMedia(true);
    setLoadingKeywords(true);
    setLoadingViews(true);

    try {
      // Si un progressiveDataFetcher est fourni, l'utiliser pour un chargement progressif
      if ((config as any).progressiveDataFetcher) {
        const result = await (config as any).progressiveDataFetcher(id, (partial: Partial<FetchResult>) => {
          // Callback appelé au fur et à mesure que les données arrivent
          if (partial.itemDetails) {
            setItemDetails(partial.itemDetails);
            // Dès qu'on a les données de base, on peut afficher
            setLoading(false);

            // Détecter si les médias sont chargés ou s'il n'y en a pas
            // Si associatedMedia existe (array vide ou rempli), les médias sont chargés
            if (partial.itemDetails.associatedMedia !== undefined) {
              setLoadingMedia(false);
            }
            // Sinon, si l'item n'a pas de o:media dans les données brutes, pas de médias
            else if (!partial.itemDetails['o:media'] || partial.itemDetails['o:media'].length === 0) {
              setLoadingMedia(false);
            }
          }
          if (partial.keywords) {
            setKeywords(partial.keywords);
            setLoadingKeywords(false);
          }
          if (partial.viewData) {
            setViewData(partial.viewData);
          }
        });

        // Mise à jour finale avec toutes les données
        setItemDetails(result.itemDetails);
        setKeywords(result.keywords || []);
        setViewData(result.viewData || {});
        setLoading(false);
        setLoadingMedia(false);
        setLoadingKeywords(false);
        setLoadingViews(false);

        // Fetch recommendations après les données de base
        setLoadingRecommendations(true);
        try {
          let recs: any[] = [];
          if (result.recommendations && result.recommendations.length > 0 && config.fetchRecommendations) {
            recs = await config.fetchRecommendations(result.recommendations, result);
          } else if (config.smartRecommendations) {
            recs = await generateSmartRecommendations(result.itemDetails, config.smartRecommendations);
          }
          setRecommendations(recs || []);
        } catch (error) {
          console.error('Error fetching recommendations:', error);
          setRecommendations([]);
        } finally {
          setLoadingRecommendations(false);
        }
      } else {
        // Ancien système : tout charger d'un coup
        const result = await config.dataFetcher(id);

        setItemDetails(result.itemDetails);
        setKeywords(result.keywords || []);
        setViewData(result.viewData || {});
        setLoadingMedia(false);
        setLoadingKeywords(false);
        setLoadingViews(false);

        // Fetch recommendations
        setLoadingRecommendations(true);
        try {
          let recs: any[] = [];
          if (result.recommendations && result.recommendations.length > 0 && config.fetchRecommendations) {
            recs = await config.fetchRecommendations(result.recommendations, result);
          } else if (config.smartRecommendations) {
            recs = await generateSmartRecommendations(result.itemDetails, config.smartRecommendations);
          }
          setRecommendations(recs || []);
        } catch (error) {
          console.error('Error fetching recommendations:', error);
          setRecommendations([]);
        } finally {
          setLoadingRecommendations(false);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setItemDetails(null);
    } finally {
      setLoading(false);
    }
  }, [id, config, mode]);

  // Reset all states when ID changes (important for browser back/forward navigation)
  // En mode create sans ID, on ne reset pas car les états sont déjà initialisés correctement
  useEffect(() => {
    // En mode create, pas besoin de reset - les états sont déjà bons
    if (mode === 'create' && !id) {
      setSelected(config.defaultView || config.viewOptions[0]?.key || '');
      return;
    }

    // Reset states to trigger fresh loading
    setItemDetails(null);
    setKeywords([]);
    setRecommendations([]);
    setViewData({});
    setLoading(true);
    setLoadingMedia(true);
    setLoadingKeywords(true);
    setLoadingViews(true);
    setLoadingRecommendations(true);
    setVideoSeek(null);
    setIsExitingRightColumn(false); // Reset animation state

    // Reset selected view to default
    setSelected(config.defaultView || config.viewOptions[0]?.key || '');
  }, [id, config.defaultView, config.viewOptions, mode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pré-remplir l'intervenant/contributeur avec la personne connectée (templates ciblés uniquement)
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

  const handleKeywordClick = (searchTerm: string) => {
    searchModalRef.current?.openWithSearch(searchTerm);
  };

  // Initialize form data when itemDetails changes or entering edit mode
  // After first init, only merge new fields (progressive loading) without overwriting user edits
  useEffect(() => {
    if (itemDetails && mode === 'edit') {
      // Extraire les valeurs depuis itemDetails en utilisant le dataPath de chaque formField
      // Exclure les clés enrichies (display-only) pour ne pas polluer formData
      // avec des données partielles du chargement progressif
      const displayOnlyKeys = new Set([
        'bibliographicCitations', 'references', 'sources', 'reviews', 'documentations',
        'resourceCache', 'associatedMedia', 'associatedMediaRefs', 'citations', 'microresumes',
      ]);
      const extractedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(itemDetails)) {
        if (!displayOnlyKeys.has(key)) {
          extractedData[key] = value;
        }
      }

      // Pour chaque formField, extraire la valeur depuis itemDetails
      config.formFields?.forEach((field) => {
        if (field.dataPath) {
          // Parse le dataPath (ex: "dcterms:title.0.@value")
          const pathParts = field.dataPath.split('.');
          let value: any = itemDetails;

          for (const part of pathParts) {
            if (value === undefined || value === null) break;
            value = value[part];
          }

          // Si on a trouvé une valeur, l'assigner à la clé du champ
          if (value !== undefined && value !== null) {
            extractedData[field.key] = value;
          }
        }

        // Pour les champs de type multiselection (ressources liées comme contributeurs, keywords, etc.),
        // chercher les données dans le resourceCache ou directement dans itemDetails
        if (field.type === 'multiselection' && field.selectionConfig) {
          const property = field.dataPath?.split('.')[0]; // Ex: "schema:agent", "jdc:hasConcept"
          if (property) {
            // Chercher les ressources liées dans itemDetails
            const linkedResources = itemDetails[property];
            if (Array.isArray(linkedResources) && linkedResources.length > 0) {
              // Hydrater les ressources depuis le resourceCache si disponible
              const resourceCache = itemDetails.resourceCache || {};
              const hydratedResources = linkedResources
                .map((ref: any) => {
                  const resourceId = getLinkedResourceId(ref);
                  if (!resourceId) return null;
                  if (resourceCache[resourceId]) {
                    return {
                      id: resourceId,
                      'o:id': resourceId,
                      title: getLinkedResourceTitle({ ...resourceCache[resourceId], id: resourceId }),
                      name: getLinkedResourceTitle({ ...resourceCache[resourceId], id: resourceId }),
                    };
                  }
                  return {
                    id: resourceId,
                    'o:id': resourceId,
                    title: getLinkedResourceTitle(ref),
                    name: getLinkedResourceTitle(ref),
                    display_title: ref.display_title,
                  };
                })
                .filter(Boolean);

              // Assigner à la clé du champ de formulaire (field.key)
              extractedData[field.key] = hydratedResources;

              // Pour les champs de type contributeur/actant, assigner aussi aux clés legacy
              // (personnes, actants) utilisées par certains composants
              const contributorProperties = ['schema:agent', 'jdc:hasActant', 'dcterms:contributor', 'schema:contributor', 'cito:credits'];
              if (contributorProperties.includes(property)) {
                extractedData.personnes = hydratedResources;
                extractedData.actants = hydratedResources;
              }
            }
          }
        }

        // Item set (dropdown) : hydrater [{ id, title }] pour le sélecteur
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
                return {
                  id: resourceId,
                  title: cached?.title || entry.display_title || `Item ${resourceId}`,
                };
              });
            if (entries.length > 0) {
              extractedData[field.key] = field.selectionConfig.multiple ? entries : [entries[0]];
            }
          }
        }
      });

      // Copier les keywords existants dans formData pour l'édition
      if (keywords && Array.isArray(keywords) && keywords.length > 0) {
        extractedData.keywords = keywords;
      }

      // Map URL type fields to fullUrl for compatibility with hardcoded form
      const urlField = config.formFields?.find((f) => f.type === 'url');
      if (urlField && extractedData[urlField.key]) {
        extractedData.fullUrl = extractedData[urlField.key];
      }

      if (!formInitializedRef.current) {
        // Premier chargement : initialiser tout le formulaire
        setFormData(extractedData);
        setMediaFiles([]);
        setRemovedMediaIndexes([]);
        formInitializedRef.current = true;
      } else {
        // Chargements suivants (progressif) : ne remplir que les champs vides/undefined
        // pour ne pas écraser les modifications de l'utilisateur
        const updates: Record<string, any> = {};
        for (const [key, value] of Object.entries(extractedData)) {
          if (formData[key] === undefined || formData[key] === null) {
            updates[key] = value;
          }
        }
        if (Object.keys(updates).length > 0) {
          setFormData({ ...formData, ...updates });
        }
      }
    } else if (mode === 'view') {
      formInitializedRef.current = false;
      setMediaFiles([]);
      setRemovedMediaIndexes([]);
    }
  }, [itemDetails, mode, setFormData, config.formFields, keywords]);

  // Handle removing an existing media by its index
  const handleRemoveExistingMedia = useCallback((index: number) => {
    setRemovedMediaIndexes((prev) => {
      if (!prev.includes(index)) {
        return [...prev, index];
      }
      return prev;
    });
  }, []);

  // ========================================
  // Edit Mode Handlers
  // ========================================

  // Toggle edit mode (kept for potential future use)
  const _handleToggleEdit = () => {
    if (mode === 'view') {
      setMode('edit');
    } else {
      handleCancelEdit();
    }
  };
  void _handleToggleEdit;

  // Cancel edit and reset to view mode
  const handleCancelEdit = () => {
    reset();
    
    // Si une fonction onCancel est fournie, on lui laisse la priorité
    // C'est utile pour les onglets (StudentFormWrapper) qui doivent fermer l'onglet au lieu de naviguer
    if (onCancel) {
      onCancel();
      return;
    }

    if (mode === 'create') {
      // Si l'onglet a été ouvert depuis un picker, on le ferme simplement
      const pickerParams = new URLSearchParams(window.location.search);
      if (pickerParams.get('fromPicker') === '1' && window.opener) {
        window.close();
        return;
      }
      if (config.formOnly) {
        navigate(monEspacePath);
      } else {
        navigate(-1);
      }
    } else if (config.formOnly) {
      navigate(monEspacePath);
    } else {
      setMode('view');
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!validate()) {
      addToast({
        title: 'Erreur de validation',
        description: 'Veuillez corriger les erreurs avant de sauvegarder.',
        classNames: { base: 'bg-danger', title: 'text-c6', description: 'text-c5', icon: 'text-c6' },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const changedData = getChangedFields();
      
      // Fusionner avec les valeurs des vues dynamiquement via viewKeyToProperty
      // Ces valeurs ne sont pas détectées par getChangedFields car ce ne sont pas des champs dirty
      if (config.viewKeyToProperty) {
        Object.entries(config.viewKeyToProperty).forEach(([viewKey, property]) => {
          const viewData = formData[viewKey];
          if (viewData !== undefined && viewData !== null) {
            changedData[viewKey] = viewData;
            // Synchroniser la propriété Omeka (évite qu'une copie stale de formData écrase la vue)
            if (typeof viewData === 'string' || Array.isArray(viewData)) {
              changedData[property] = viewData;
            }
          }
        });
      }

      // Add media files to the data
      changedData.mediaFiles = mediaFiles;
      // Add YouTube URLs to create as media
      changedData.youtubeUrls = youtubeUrls;

      // Add media IDs to delete based on removedMediaIndexes
      if (removedMediaIndexes.length > 0 && itemDetails?.['o:media']) {
        const mediaToDelete: number[] = [];
        removedMediaIndexes.forEach((index) => {
          const mediaRef = itemDetails['o:media'][index];
          if (mediaRef?.['o:id']) {
            mediaToDelete.push(mediaRef['o:id']);
          }
        });
        changedData.mediaToDelete = mediaToDelete;
      }

      if (mode === 'create') {
        // Créer une nouvelle ressource
        await createInOmekaS(changedData);
        addToast({
          title: 'Ressource créée',
          description: 'La ressource a été créée avec succès.',
          classNames: { base: 'bg-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
        });
        // La redirection est gérée dans createInOmekaS
        return;
      } else if (onSave) {
        await onSave(changedData);
        // Notify parent of successful save (for tab management)
        if (id) {
          const savedTitle = changedData.title || formData.title;
          onSaveComplete?.(id, savedTitle);
        }
      } else {
        // Sauvegarde par défaut vers Omeka S
        const result = await saveToOmekaS(changedData);
        // Notify parent of successful save (for tab management)
        if (result?.['o:id']) {
          const savedTitle = changedData.title || result?.['o:title'] || result?.['dcterms:title']?.[0]?.['@value'];
          onSaveComplete?.(result['o:id'], savedTitle);
        }
      }

      addToast({
        title: 'Sauvegardé',
        description: 'Les modifications ont été enregistrées.',
        classNames: { base: 'bg-success border-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
      });

      // Réinitialiser les états après sauvegarde
      setYoutubeUrls([]);
      setMediaFiles([]);
      setRemovedMediaIndexes([]);

      if (config.formOnly) {
        navigate(monEspacePath);
        return;
      }

      setMode('view');
      // Refresh data
      fetchData();
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

  // Auto-save apres traitement des pendingLinks (pour ne pas perdre les liens au refresh)
  useEffect(() => {
    if (shouldAutoSaveRef.current) {
      shouldAutoSaveRef.current = false;
      const timer = setTimeout(() => {
        handleSave();
      }, 500);
      return () => clearTimeout(timer);
    }
  });

  // Sauvegarde vers Omeka S API
  const saveToOmekaS = async (data: any) => {
    if (!id) throw new Error('No item ID');

    // 1. Récupérer les données brutes de l'item
    const rawResponse = await fetch(`${API_BASE}items/${id}`);
    if (!rawResponse.ok) throw new Error('Failed to fetch item');
    const rawItem = await rawResponse.json();

    // 1b. Charger les propriétés du template (comme en mode création) pour avoir toutes les propriétés disponibles
    const templateId = rawItem['o:resource_template']?.['o:id'] || config.resourceTemplateId;
    const templatePropMap = templateId ? await getTemplatePropertiesMap(templateId) : {};

    // 2. Créer une copie avec les modifications
    const updatedItem = { ...rawItem };

    // 3. Appliquer les modifications de ressources liées (keywords, etc.)
    // Tracker les propriétés Omeka déjà écrites pour ne pas les écraser
    // avec les clés enrichies (ex: 'references' écraserait 'dcterms:references')
    const writtenOmekaProperties = new Set<string>();

    Object.entries(data).forEach(([key, value]) => {
      const viewMappedProperty = config.viewKeyToProperty?.[key];
      const isViewOmekaProperty =
        viewMappedProperty == null &&
        config.viewKeyToProperty != null &&
        Object.values(config.viewKeyToProperty).includes(key);
      const isResourceArray =
        Array.isArray(value) &&
        (viewMappedProperty != null ||
          isViewOmekaProperty ||
          (value.length > 0 &&
            (value[0]?.id !== undefined ||
              value[0]?.['o:id'] !== undefined ||
              value[0]?.value_resource_id !== undefined)));

      if (isResourceArray) {
        let omekaPropertyKey = viewMappedProperty || key;
        let propertyId: number | null = null;

        if (writtenOmekaProperties.has(omekaPropertyKey)) {
          return;
        }

        if (updatedItem[omekaPropertyKey] && Array.isArray(updatedItem[omekaPropertyKey]) && updatedItem[omekaPropertyKey].length > 0) {
          propertyId = updatedItem[omekaPropertyKey][0]?.property_id ?? null;
        } else {
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
          const fallbackProp = config.viewKeyToProperty?.[key] || keyToOmekaProp[key] || key;

          if (writtenOmekaProperties.has(fallbackProp)) {
            return;
          }

          if (fallbackProp && (templatePropMap[fallbackProp] || OMEKA_PROPERTY_IDS[fallbackProp])) {
            omekaPropertyKey = fallbackProp;
            propertyId = templatePropMap[fallbackProp] || OMEKA_PROPERTY_IDS[fallbackProp];
          }
        }

        if (omekaPropertyKey && propertyId) {
          updatedItem[omekaPropertyKey] = (value as any[])
            .map((item: any) => ({
              type: 'resource',
              property_id: propertyId,
              value_resource_id: item.id || item['o:id'] || item.value_resource_id,
              is_public: true,
            }))
            .filter((item: any) => item.value_resource_id);
          writtenOmekaProperties.add(omekaPropertyKey);
        }
        return;
      }

      // Si c'est un tableau de valeurs littérales (strings, ou objets Omeka literal/customvocab:N sans value_resource_id)
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
          // Conserver le type customvocab:N si présent dans les données existantes
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
                  // Si c'est déjà un objet Omeka complet (a property_id et type), le passer tel quel
                  if (typeof v === 'object' && v?.property_id && v?.type && v?.['@value']) return v;
                  // Sinon convertir la string
                  const str = typeof v === 'string' ? v : String(v?.['@value'] ?? '');
                  if (!str.trim()) return null;
                  return {
                    type: existingOmekaType ?? 'literal',
                    property_id: propertyId,
                    '@value': str,
                    is_public: true,
                  };
                })
                .filter(Boolean);
            }
            writtenOmekaProperties.add(omekaKey);
          }
        }
        return;
      }

      // Si c'est une valeur texte simple
      if (typeof value === 'string') {
        const omekaPropertyKey = getFormFieldOmekaProperty(key) || findOmekaPropertyKey(updatedItem, key);
        if (omekaPropertyKey) {
          // Détecter si c'est une propriété URL (schema:url, etc.)
          const isUrlProperty = omekaPropertyKey === 'schema:url' || key === 'fullUrl' || key === 'externalLink' || key === 'url';

          if (updatedItem[omekaPropertyKey] && Array.isArray(updatedItem[omekaPropertyKey]) && updatedItem[omekaPropertyKey].length > 0) {
            // La propriété existe, mettre à jour
            if (isUrlProperty) {
              // Pour les URLs, utiliser @id au lieu de @value
              updatedItem[omekaPropertyKey][0]['@id'] = value;
              updatedItem[omekaPropertyKey][0]['type'] = 'uri';
              delete updatedItem[omekaPropertyKey][0]['@value'];
            } else {
              updatedItem[omekaPropertyKey][0]['@value'] = value;
            }
          } else if (value.trim() !== '') {
            // La propriété n'existe pas, la créer (seulement si valeur non vide)
            const propertyId = getPropertyId(omekaPropertyKey, templatePropMap);
            if (propertyId) {
              if (isUrlProperty) {
                // Créer comme type URI
                updatedItem[omekaPropertyKey] = [
                  {
                    type: 'uri',
                    property_id: propertyId,
                    '@id': value,
                    is_public: true,
                  },
                ];
              } else {
                // Créer comme type literal
                updatedItem[omekaPropertyKey] = [
                  {
                    type: 'literal',
                    property_id: propertyId,
                    '@value': value,
                    is_public: true,
                  },
                ];
              }
            }
          }
        }
      }
      // Si c'est une valeur numérique
      else if (typeof value === 'number') {
        const omekaPropertyKey = getFormFieldOmekaProperty(key) || findOmekaPropertyKey(updatedItem, key);
        if (omekaPropertyKey) {
          if (updatedItem[omekaPropertyKey] && Array.isArray(updatedItem[omekaPropertyKey]) && updatedItem[omekaPropertyKey].length > 0) {
            // La propriété existe, mettre à jour
            updatedItem[omekaPropertyKey][0]['@value'] = String(value);
          } else {
            // La propriété n'existe pas, la créer
            const propertyId = getPropertyId(omekaPropertyKey);
            if (propertyId) {
              updatedItem[omekaPropertyKey] = [
                {
                  type: 'literal',
                  property_id: propertyId,
                  '@value': String(value),
                  is_public: true,
                },
              ];
            }
          }
        }
      }
    });

    // 4. Envoyer la mise à jour
    console.log('[saveToOmekaS] Sending PUT request...');
    const saveUrl = omekaApiUrl(`${API_BASE}items/${id}`);
    const saveResponse = await fetch(saveUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem),
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json();
      console.error('[saveToOmekaS] Save failed:', errorData);
      throw new Error(errorData.errors?.[0]?.message || 'Erreur lors de la sauvegarde');
    }

    const result = await saveResponse.json();

    // 5. Créer les médias YouTube (si présents)
    const youtubeUrlsToCreate = data.youtubeUrls || [];
    if (Array.isArray(youtubeUrlsToCreate) && youtubeUrlsToCreate.length > 0) {
      for (const ytUrl of youtubeUrlsToCreate) {
        try {
          // Extraire l'ID de la vidéo YouTube
          const videoIdMatch = ytUrl.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          const videoId = videoIdMatch ? videoIdMatch[1] : null;

          if (!videoId) {
            console.error('[saveToOmekaS] Invalid YouTube URL:', ytUrl);
            continue;
          }

          const mediaUrl = omekaApiUrl(`${API_BASE}media`);
          const mediaResponse = await fetch(mediaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              'o:ingester': 'youtube',
              'o:renderer': 'youtube',
              'o:source': ytUrl,
              'o:item': { 'o:id': id },
              data: { id: videoId },
              is_public: true,
            }),
          });

          if (!mediaResponse.ok) {
            console.error('[saveToOmekaS] YouTube media creation failed:', await mediaResponse.text());
          } else {
            console.log('[saveToOmekaS] YouTube media created successfully');
          }
        } catch (err) {
          console.error('[saveToOmekaS] YouTube media creation error:', err);
        }
      }
    }

    // 6. Upload des nouveaux fichiers médias (images/vidéos)
    const mediaFilesToUpload = data.mediaFiles || [];
    if (Array.isArray(mediaFilesToUpload) && mediaFilesToUpload.length > 0) {
      for (const mediaFile of mediaFilesToUpload) {
        const file = mediaFile.file || mediaFile;
        if (file instanceof File) {
          try {
            const formData = new FormData();
            // Format correct pour Omeka S : data avec file_index AVANT file[0]
            formData.append(
              'data',
              JSON.stringify({
                'o:ingester': 'upload',
                'o:item': { 'o:id': id },
                file_index: '0',
              }),
            );
            formData.append('file[0]', file);

            const mediaUrl = omekaApiUrl(`${API_BASE}media`);
            const mediaResponse = await fetch(mediaUrl, {
              method: 'POST',
              body: formData,
            });

            if (!mediaResponse.ok) {
              console.error('[saveToOmekaS] Media upload failed:', await mediaResponse.text());
            } else {
              console.log('[saveToOmekaS] Media uploaded successfully');
            }
          } catch (err) {
            console.error('[saveToOmekaS] Media upload error:', err);
          }
        }
      }
    }

    return result;
  };

  // Trouver la clé de propriété Omeka correspondante
  const getFormFieldOmekaProperty = (fieldKey: string): string | null => {
    const field = config.formFields?.find((f) => f.key === fieldKey);
    return field?.dataPath?.split('.')[0] ?? null;
  };

  const findOmekaPropertyKey = (rawItem: any, simpleKey: string): string | null => {
    // Mapping des clés simples vers les propriétés Omeka
    const keyMappings: Record<string, string[]> = {
      keywords: ['jdc:hasConcept', 'jdc:hasKeyword', 'dcterms:subject'],
      title: ['dcterms:title'],
      description: ['dcterms:description'],
      date: ['dcterms:date'],
      personnes: ['schema:agent', 'jdc:hasActant', 'dcterms:contributor', 'schema:contributor'],
      actants: ['jdc:hasActant', 'schema:agent'],
      percentage: ['schema:ratingValue'],
      fullUrl: ['schema:url'],
      externalLink: ['schema:url'],
      url: ['schema:url'],
      'schema:description': ['schema:description'],
      'theatre:credit': ['theatre:credit'],
      'Outils': ['theatre:credit'],
      'Feedback': ['schema:description'],
      references: ['dcterms:references'],
      'dcterms:references': ['dcterms:references'],
      'dcterms:bibliographicCitation': ['dcterms:bibliographicCitation'],
    };

    const possibleKeys = keyMappings[simpleKey] || [simpleKey];

    for (const omekaKey of possibleKeys) {
      if (rawItem[omekaKey] !== undefined) {
        return omekaKey;
      }
    }

    // Si la propriété n'existe pas encore, retourner la première clé possible pour la créer
    return possibleKeys[0] || null;
  };

  // Obtenir le property_id Omeka pour une propriété (utilise le cache dynamique)
  const getPropertyId = (omekaPropertyKey: string, propMap?: Record<string, number>): number | null => {
    const map = propMap || propertiesMap;
    const id = map[omekaPropertyKey];
    if (id) return id;

    // Fallback: essayer sans le préfixe (ex: "title" au lieu de "dcterms:title")
    const localName = omekaPropertyKey.split(':')[1];
    if (localName && map[localName]) {
      return map[localName];
    }

    return null;
  };

  // Créer une nouvelle ressource dans Omeka S (mode create)
  const createInOmekaS = async (data: any) => {
    if (!config.resourceTemplateId) {
      throw new Error('resourceTemplateId non défini dans la config');
    }

    // Récupérer l'utilisateur connecté pour l'ajouter comme créateur
    // userId = ID de l'item actant/étudiant (pour dcterms:creator)
    // omekaUserId = ID de l'utilisateur Omeka S (table user, pour o:owner)
    const userId = localStorage.getItem('userId');
    const omekaUserId = localStorage.getItem('omekaUserId');

    // S'assurer que les properties sont chargées (utilise le cache si déjà fetché)
    const propMap = Object.keys(propertiesMap).length > 0 ? propertiesMap : await getTemplatePropertiesMap(config.resourceTemplateId!);

    // Construire l'objet de données pour Omeka S
    const itemData: Record<string, any> = {
      'o:resource_template': { 'o:id': config.resourceTemplateId },
    };

    // Définir o:owner avec l'ID utilisateur Omeka S (table user) si disponible
    // Cela permet d'attribuer la ressource au bon utilisateur au lieu de l'API
    if (omekaUserId && parseInt(omekaUserId, 10) > 0) {
      itemData['o:owner'] = { 'o:id': parseInt(omekaUserId, 10) };
    }

    // Lier la ressource au cours via dcterms:isPartOf (property_id: 33)
    // Le courseId est passé via query param depuis Mon Espace
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    if (courseId) {
      const coursePropertyId = propMap['dcterms:isPartOf'] || 33; // Fallback à 33 si pas dans le template
      itemData['dcterms:isPartOf'] = [
        {
          type: 'resource',
          property_id: coursePropertyId,
          value_resource_id: parseInt(courseId, 10),
          is_public: true,
        },
      ];
    }

    // Contributeur/intervenant = personne connectée (analyse critique, éléments narratif/esthétique, expérimentation, feedback, outils)
    const autoContributor = getAutoContributorConfig(config.resourceTemplateId);
    if (autoContributor) {
      const formContributors = data[autoContributor.fieldKey] ?? data[autoContributor.property];
      const linkedIds: number[] = Array.isArray(formContributors)
        ? formContributors
            .map((item: any) => item?.id ?? item?.['o:id'] ?? item?.value_resource_id)
            .filter((id: unknown) => id != null)
            .map((id: unknown) => parseInt(String(id), 10))
            .filter((id: number) => Number.isFinite(id))
        : [];

      const contributorId =
        linkedIds[0] ?? (userId ? parseInt(userId, 10) : buildConnectedUserContributorItem(userData)?.id);

      const contributorPropertyId = getPropertyId(autoContributor.property, propMap);
      if (contributorId && contributorPropertyId) {
        itemData[autoContributor.property] = [
          {
            type: 'resource',
            property_id: contributorPropertyId,
            value_resource_id: contributorId,
            is_public: true,
          },
        ];
      }
    }

    // Mapper les champs ressource liées (multiselection) du formulaire
    config.formFields?.forEach((field) => {
      if (field.type !== 'multiselection') return;
      const value = data[field.key];
      if (!Array.isArray(value) || value.length === 0) return;
      const propertyName = field.dataPath.split('.')[0];
      if (itemData[propertyName]) return;
      const propertyId = getPropertyId(propertyName, propMap);
      if (!propertyId) return;
      itemData[propertyName] = value
        .map((item: any) => ({
          type: 'resource',
          property_id: propertyId,
          value_resource_id: item.id || item['o:id'] || item.value_resource_id,
          is_public: true,
        }))
        .filter((item: any) => item.value_resource_id);
    });

    // Mapper les champs du formulaire vers le format Omeka S
    config.formFields?.forEach((field) => {
      const value = data[field.key];
      if (value !== undefined && value !== '' && value !== null) {
        const propertyName = field.dataPath.split('.')[0];
        const propertyId = getPropertyId(propertyName, propMap);

        if (field.type === 'multiselection') {
          return;
        }

        if (field.type === 'selection') {
          const items = Array.isArray(value) ? value : [];
          if (items.length > 0 && propertyId) {
            itemData[propertyName] = items
              .map((item: any) => ({
                type: 'resource',
                property_id: propertyId,
                value_resource_id: item.id || item['o:id'] || item.value_resource_id,
                is_public: true,
              }))
              .filter((item: any) => item.value_resource_id);
          }
          return;
        }

        if (field.type === 'url') {
          // Les URLs sont des ressources URI
          itemData[propertyName] = [
            {
              type: 'uri',
              property_id: propertyId,
              '@id': value,
              is_public: true,
            },
          ];
        } else {
          // Les autres sont des littéraux
          itemData[propertyName] = [
            {
              type: 'literal',
              property_id: propertyId,
              '@value': String(value),
              is_public: true,
            },
          ];
        }
      }
    });

    // Mapper les données stockées avec le format dataPath (ex: dcterms:abstract.0.@value)
    Object.entries(data).forEach(([key, value]) => {
      if (key.includes(':') && key.includes('.') && typeof value === 'string' && value !== '') {
        const propertyName = key.split('.')[0];
        if (!itemData[propertyName]) {
          const propertyId = getPropertyId(propertyName, propMap);
          itemData[propertyName] = [
            {
              type: 'literal',
              property_id: propertyId,
              '@value': value,
              is_public: true,
            },
          ];
        }
      }
    });

    // Mapper fullUrl vers schema:url si présent et pas déjà mappé
    if (data.fullUrl && !itemData['schema:url']) {
      const propertyId = getPropertyId('schema:url', propMap);
      itemData['schema:url'] = [
        {
          type: 'uri',
          property_id: propertyId,
          '@id': data.fullUrl,
          is_public: true,
        },
      ];
    }

    // Mapper les ressources liées (personnes/actants)
    // Chercher la bonne propriété selon le template (schema:contributor, dcterms:contributor, schema:agent, ou jdc:hasActant)
    if (data.personnes && Array.isArray(data.personnes) && data.personnes.length > 0) {
      // Ordre de priorité : schema:contributor, dcterms:contributor, schema:agent, jdc:hasActant
      let agentProp = 'jdc:hasActant';
      if (propMap['schema:contributor']) {
        agentProp = 'schema:contributor';
      } else if (propMap['dcterms:contributor']) {
        agentProp = 'dcterms:contributor';
      } else if (propMap['schema:agent']) {
        agentProp = 'schema:agent';
      }
      const propertyId = getPropertyId(agentProp, propMap);
      if (propertyId) {
        // Récupérer les contributeurs existants (incluant le créateur ajouté automatiquement)
        const existingContributors = itemData[agentProp] || [];
        const existingIds = existingContributors.map((c: any) => c.value_resource_id);

        // Ajouter les nouveaux contributeurs sans doublons
        const newContributors = data.personnes
          .filter((person: any) => !existingIds.includes(person.id || person['o:id']))
          .map((person: any) => ({
            type: 'resource',
            property_id: propertyId,
            value_resource_id: person.id || person['o:id'],
            is_public: true,
          }));

        itemData[agentProp] = [...existingContributors, ...newContributors];
      }
    }

    // Mapper les mots-clés (jdc:hasConcept ou autre) - même logique que les personnes
    if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
      // Ordre de priorité : jdc:hasConcept, dcterms:subject
      let conceptProp = 'jdc:hasConcept';
      if (!propMap['jdc:hasConcept'] && propMap['dcterms:subject']) {
        conceptProp = 'dcterms:subject';
      }
      const propertyId = getPropertyId(conceptProp, propMap);
      if (propertyId) {
        // Récupérer les keywords existants
        const existingKeywords = itemData[conceptProp] || [];
        const existingIds = existingKeywords.map((k: any) => k.value_resource_id);

        // Ajouter les nouveaux keywords sans doublons
        const newKeywords = data.keywords
          .filter((keyword: any) => !existingIds.includes(keyword.id || keyword['o:id']))
          .map((keyword: any) => ({
            type: 'resource',
            property_id: propertyId,
            value_resource_id: keyword.id || keyword['o:id'],
            is_public: true,
          }));

        itemData[conceptProp] = [...existingKeywords, ...newKeywords];
      }
    }

    // Mapper dynamiquement les vues (items/references/text) via viewKeyToProperty
    if (config.viewKeyToProperty) {
      Object.entries(config.viewKeyToProperty).forEach(([viewKey, property]) => {
        // Chercher les données sous la clé viewKey ou directement sous la propriété
        const viewData = data[viewKey] || data[property];
        if (!viewData || itemData[property]) {
          console.log(`[createInOmekaS:viewMap] SKIP ${viewKey} → ${property}: viewData=${!!viewData}, alreadySet=${!!itemData[property]}`);
          return;
        }

        const propertyId = getPropertyId(property, propMap);
        if (!propertyId) {
          console.log(`[createInOmekaS:viewMap] SKIP ${viewKey} → ${property}: propertyId not found`);
          return;
        }
        console.log(`[createInOmekaS:viewMap] OK ${viewKey} → ${property} (id=${propertyId}), items=${Array.isArray(viewData) ? viewData.length : typeof viewData}`);

        if (Array.isArray(viewData) && viewData.length > 0) {
          // Ressources liées (supporte formats: {id}, {o:id}, {value_resource_id})
          itemData[property] = viewData.map((item: any) => ({
            type: 'resource',
            property_id: propertyId,
            value_resource_id: item.id || item['o:id'] || item.value_resource_id,
            is_public: true,
          })).filter((item: any) => item.value_resource_id);
        } else if (typeof viewData === 'string' && viewData.trim() !== '') {
          // Champ texte
          itemData[property] = [
            {
              type: 'literal',
              property_id: propertyId,
              '@value': viewData,
              is_public: true,
            },
          ];
        }
      });
    }

    // Mapper TOUTES les autres propriétés dynamiquement (categories, projets, etc.)
    // Cela capture les propriétés qui ne sont pas dans formFields mais sont dans les vues
    Object.entries(data).forEach(([key, value]) => {
      // Ignorer les clés déjà traitées ou système
      const viewKeys = new Set(Object.keys(config.viewKeyToProperty || {}));
      const ignoredKeys = new Set([
        'mediaFiles',
        'mediaToDelete',
        'newMediaFiles',
        'resourceCache',
        'title',
        'description',
        'date',
        'fullUrl',
        'personnes',
        'actants',
        'keywords',
        'Citations',
        'MicroResumes',
        ...viewKeys,
      ]);

      if (ignoredKeys.has(key) || value === undefined || value === null) {
        return;
      }

      // Si la clé contient ":" c'est probablement une propriété Omeka S directe
      if (key.includes(':') && !itemData[key]) {
        const propertyId = propMap[key];
        if (!propertyId) {
          console.warn(`[createInOmekaS] Property ID non trouvé pour: ${key}`);
          return;
        }

        if (typeof value === 'string' || typeof value === 'number') {
          // Valeur simple
          itemData[key] = [
            {
              type: 'literal',
              property_id: propertyId,
              '@value': String(value),
              is_public: true,
            },
          ];
        } else if (Array.isArray(value) && value.length > 0) {
          if (typeof value[0] === 'string') {
            // Tableau de strings (categories)
            const nonEmptyValues = value.filter((v: string) => v && v.trim() !== '');
            if (nonEmptyValues.length > 0) {
              itemData[key] = nonEmptyValues.map((v: string) => ({
                type: 'literal',
                property_id: propertyId,
                '@value': v,
                is_public: true,
              }));
            }
          } else if (value[0].id || value[0]['o:id'] || value[0].value_resource_id) {
            // Tableau de ressources liées (supporte formats mixtes)
            itemData[key] = value.map((item: any) => ({
              type: 'resource',
              property_id: propertyId,
              value_resource_id: item.id || item['o:id'] || item.value_resource_id,
              is_public: true,
            })).filter((item: any) => item.value_resource_id);
          }
        }
      }

      // Gérer les clés spéciales qui mappent vers des propriétés Omeka S
      const specialKeyMappings: Record<string, string> = {
        projets: 'dcterms:isPartOf',
        outils: 'schema:tool',
      };

      const mappedProperty = specialKeyMappings[key];
      if (mappedProperty && Array.isArray(value) && value.length > 0 && !itemData[mappedProperty]) {
        const propertyId = propMap[mappedProperty];
        if (propertyId) {
          itemData[mappedProperty] = value.map((item: any) => ({
            type: 'resource',
            property_id: propertyId,
            value_resource_id: item.id || item['o:id'] || item.value_resource_id,
            is_public: true,
          })).filter((item: any) => item.value_resource_id);
        }
      }
    });

    // Créer les citations et micro-résumés AVANT la conférence pour pouvoir les lier dans le POST
    const userIdForSub = localStorage.getItem('omekaUserId');
    const newCitations = data.Citations;
    const newMicroresumes = data.MicroResumes;

    if (Array.isArray(newCitations) && newCitations.length > 0) {
      const citationIds: number[] = [];
      for (const cit of newCitations) {
        if (!cit.citation || cit.citation.trim() === '') continue;
        try {
          const citData: Record<string, any> = {
            'o:resource_template': { 'o:id': 80 },
            ...(userIdForSub ? { 'o:owner': { 'o:id': parseInt(userIdForSub, 10) } } : {}),
            'cito:hasCitedEntity': [{ type: 'literal', property_id: 269, '@value': cit.citation, is_public: true }],
          };
          if (cit.startTime) citData['schema:startTime'] = [{ type: 'numeric:integer', property_id: 1417, '@value': cit.startTime, is_public: true }];
          if (cit.endTime) citData['schema:endTime'] = [{ type: 'numeric:integer', property_id: 735, '@value': cit.endTime, is_public: true }];
          const citResponse = await fetch(omekaApiUrl(`${API_BASE}items`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(citData) });
          if (citResponse.ok) {
            const citResult = await citResponse.json();
            citationIds.push(citResult['o:id']);
            console.log('[createInOmekaS] Citation created:', citResult['o:id']);
          }
        } catch (err) { console.error('[createInOmekaS] Citation creation error:', err); }
      }
      if (citationIds.length > 0) {
        itemData['schema:citation'] = citationIds.map((id) => ({ type: 'resource', property_id: 544, value_resource_id: id, is_public: true }));
      }
    }

    if (Array.isArray(newMicroresumes) && newMicroresumes.length > 0) {
      const mrIds: number[] = [];
      for (const mr of newMicroresumes) {
        if ((!mr.title || mr.title.trim() === '') && (!mr.description || mr.description.trim() === '')) continue;
        try {
          const mrData: Record<string, any> = {
            'o:resource_template': { 'o:id': 125 },
            ...(userIdForSub ? { 'o:owner': { 'o:id': parseInt(userIdForSub, 10) } } : {}),
          };
          if (mr.title) mrData['dcterms:title'] = [{ type: 'literal', property_id: 1, '@value': mr.title, is_public: true }];
          if (mr.description) mrData['dcterms:description'] = [{ type: 'literal', property_id: 4, '@value': mr.description, is_public: true }];
          if (mr.startTime) mrData['schema:startTime'] = [{ type: 'numeric:integer', property_id: 1417, '@value': mr.startTime, is_public: true }];
          if (mr.endTime) mrData['schema:endTime'] = [{ type: 'numeric:integer', property_id: 735, '@value': mr.endTime, is_public: true }];
          const mrResponse = await fetch(omekaApiUrl(`${API_BASE}items`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mrData) });
          if (mrResponse.ok) {
            const mrResult = await mrResponse.json();
            mrIds.push(mrResult['o:id']);
            console.log('[createInOmekaS] MicroResume created:', mrResult['o:id']);
          }
        } catch (err) { console.error('[createInOmekaS] MicroResume creation error:', err); }
      }
      if (mrIds.length > 0) {
        itemData['bibo:abstract'] = mrIds.map((id) => ({ type: 'resource', property_id: 86, value_resource_id: id, is_public: true }));
      }
    }

    // Conférences : dcterms:type obligatoire (défaut « séminaire » à la création)
    if (Number(config.resourceTemplateId) === CONFERENCE_TEMPLATE_ID && !itemData['dcterms:type']) {
      const typePropertyId = propMap['dcterms:type'] ?? CONFERENCE_TYPE_PROPERTY_ID;
      itemData['dcterms:type'] = [
        buildConferenceTypeOmekaValue(CONFERENCE_TYPE_TERMS.seminaire, typePropertyId),
      ];
    }

    // Nettoyer les propriétés avec property_id null (pas dans le template)
    Object.keys(itemData).forEach((key) => {
      if (key.startsWith('o:')) return; // Garder les métadonnées Omeka
      const values = itemData[key];
      if (Array.isArray(values)) {
        // Filtrer les valeurs sans property_id valide
        const validValues = values.filter((v: any) => v.property_id != null);
        if (validValues.length === 0) {
          delete itemData[key];
        } else {
          itemData[key] = validValues;
        }
      }
    });

    console.log('[createInOmekaS] Item data to send:', itemData);

    const createUrl = omekaApiUrl(`${API_BASE}items`);
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[createInOmekaS] Creation failed:', errorData);
      throw new Error(
        omekaAuthErrorMessage(response.status) ||
          errorData.errors?.[0]?.message ||
          'Échec de la création',
      );
    }

    const result = await response.json();
    const newItemId = result['o:id'];

    // Upload des médias après création de l'item
    const mediaFilesToUpload = data.mediaFiles || [];
    if (Array.isArray(mediaFilesToUpload) && mediaFilesToUpload.length > 0) {
      for (const mediaFile of mediaFilesToUpload) {
        const file = mediaFile.file || mediaFile;
        if (file instanceof File) {
          try {
            const formData = new FormData();
            // Format correct pour Omeka S : data avec file_index AVANT file[0]
            formData.append(
              'data',
              JSON.stringify({
                'o:ingester': 'upload',
                'o:item': { 'o:id': newItemId },
                file_index: '0',
              }),
            );
            formData.append('file[0]', file);

            const mediaUrl = omekaApiUrl(`${API_BASE}media`);
            const mediaResponse = await fetch(mediaUrl, {
              method: 'POST',
              body: formData,
            });

            if (!mediaResponse.ok) {
              console.error('[createInOmekaS] Media upload failed:', await mediaResponse.text());
            } else {
              console.log('[createInOmekaS] Media uploaded successfully');
            }
          } catch (err) {
            console.error('[createInOmekaS] Media upload error:', err);
          }
        }
      }
    }

    // Créer les médias YouTube
    const youtubeUrlsToCreate = data.youtubeUrls || [];
    if (Array.isArray(youtubeUrlsToCreate) && youtubeUrlsToCreate.length > 0) {
      for (const ytUrl of youtubeUrlsToCreate) {
        try {
          // Extraire l'ID de la vidéo YouTube
          const videoIdMatch = ytUrl.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          const videoId = videoIdMatch ? videoIdMatch[1] : null;

          if (!videoId) {
            console.error('[createInOmekaS] Invalid YouTube URL:', ytUrl);
            continue;
          }

          const mediaUrl = omekaApiUrl(`${API_BASE}media`);
          const mediaResponse = await fetch(mediaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              'o:ingester': 'youtube',
              'o:renderer': 'youtube',
              'o:source': ytUrl,
              'o:item': { 'o:id': newItemId },
              data: { id: videoId },
              is_public: true,
            }),
          });

          if (!mediaResponse.ok) {
            console.error('[createInOmekaS] YouTube media creation failed:', await mediaResponse.text());
          } else {
            console.log('[createInOmekaS] YouTube media created successfully');
          }
        } catch (err) {
          console.error('[createInOmekaS] YouTube media creation error:', err);
        }
      }
    }

    const savedTitle = data.title || result?.['o:title'] || result?.['dcterms:title']?.[0]?.['@value'];

    // Si la page a été ouverte depuis un picker (window.open), notifier le parent et fermer
    const pickerParams = new URLSearchParams(window.location.search);
    if (pickerParams.get('fromPicker') === '1' && window.opener) {
      window.opener.postMessage(
        { type: 'RESOURCE_CREATED', id: newItemId, title: savedTitle || `Item ${newItemId}` },
        window.location.origin,
      );
      window.close();
      return result;
    }

    // Si onSaveComplete est défini (mode onglets), notifier — la navigation est gérée par le wrapper
    if (onSaveComplete) {
      onSaveComplete(newItemId, savedTitle);
      return result;
    }

    if (config.formOnly) {
      if (currentOmekaUserId && (config.resourceType || config.type)) {
        const pendingCard: StudentResourceCard = {
          id: newItemId,
          title: savedTitle || 'Sans titre',
          thumbnail: null,
          type: (config.resourceType || config.type) as StudentResourceCard['type'],
          actants: [],
          created: new Date().toISOString(),
        };
        stashPendingMonEspaceResource(currentOmekaUserId, pendingCard);
        navigate(monEspacePath, { state: { pendingResource: pendingCard } });
      } else {
        navigate(monEspacePath);
      }
      return result;
    }

    navigate('/espace-etudiant/');
    return result;
  };

  // Handle opening resource picker for a view, or an internal child tab when onCreateNewResource is available
  const openLinkedResourceCreate = useCallback(
    (viewKey: string, options?: { resourceTemplateIds?: number[]; pickerTitle?: string }) => {
      // Les mots-clés s'ouvrent toujours dans le picker complet (jamais en création directe)
      if (viewKey === 'keywords') {
        setPickerState({
          isOpen: true,
          viewKey,
          resourceTemplateId: 34,
          resourceTemplateIds: undefined,
          itemSetIds: undefined,
          multiSelect: true,
          pickerTitle: 'Ajouter des mots-clés',
          createOnly: false,
        });
        return;
      }

      const viewOption = config.viewOptions.find((v) => v.key === viewKey);

      const defaultTemplateIds: Record<string, number> = {
        keywords: 34,
      };
      const defaultMultiTemplateIds: Record<string, number[]> = {
        personnes: [...DEFAULT_AUTHOR_TEMPLATE_IDS],
        actants: [...DEFAULT_AUTHOR_TEMPLATE_IDS],
      };

      const resourceTemplateIds =
        options?.resourceTemplateIds ?? viewOption?.resourceTemplateIds ?? defaultMultiTemplateIds[viewKey];
      const resourceTemplateId = resolveViewResourceTemplateId(viewKey, viewOption, options, {
        single: defaultTemplateIds,
        multi: defaultMultiTemplateIds,
      });
      const itemSetIds = viewOption?.itemSetIds;
      const createOnly = isCreateOnlyView(viewOption, resourceTemplateId);

      // Create-only (analyse critique, retour d'expérience…) → nouvel onglet interne empilé
      if (createOnly && onCreateNewResource && resourceTemplateId) {
        onCreateNewResource(viewKey, resourceTemplateId);
        return;
      }

      if (createOnly && !onCreateNewResource) {
        setPickerState({
          isOpen: true,
          viewKey,
          resourceTemplateId,
          resourceTemplateIds: undefined,
          itemSetIds,
          multiSelect: false,
          pickerTitle: options?.pickerTitle,
          createOnly: true,
        });
        return;
      }

      setPickerState({
        isOpen: true,
        viewKey,
        resourceTemplateId,
        resourceTemplateIds,
        itemSetIds,
        multiSelect: true,
        pickerTitle: options?.pickerTitle,
        createOnly: false,
      });
    },
    [config.viewOptions, onCreateNewResource],
  );

  const handleLinkExisting = openLinkedResourceCreate;

  const handleCreateNewFromView = useCallback(
    (viewKey: string) => {
      openLinkedResourceCreate(viewKey);
    },
    [openLinkedResourceCreate],
  );

  const handlePickerCreateInTab = useCallback(() => {
    if (!pickerState.viewKey || !onCreateNewResource) return;
    const viewOption = config.viewOptions.find((v) => v.key === pickerState.viewKey);
    const templateId =
      pickerState.resourceTemplateId ??
      pickerState.resourceTemplateIds?.[0] ??
      viewOption?.resourceTemplateId ??
      viewOption?.resourceTemplateIds?.[0];
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
    const ids =
      pickerState.resourceTemplateIds ||
      (pickerState.resourceTemplateId ? [pickerState.resourceTemplateId] : []);
    return ids.some((id) => {
      const cfg = getResourceConfigByTemplateId(id);
      return cfg?.createUrl || QUICK_CREATE_CONFIGS[id];
    });
  }, [pickerState]);

  const handlePickerCreateOverride = useCallback(() => {
    if (!pickerState.itemSetIds?.length || !pickerState.viewKey) return;
    setPickerState({ isOpen: false, viewKey: '' });
    setCreateItemSetModalState({
      isOpen: true,
      viewKey: pickerState.viewKey,
      itemSetIds: pickerState.itemSetIds,
    });
  }, [pickerState.viewKey, pickerState.itemSetIds]);

  // État pour la modale de création d'item dans un item set
  const [createItemSetModalState, setCreateItemSetModalState] = useState<{
    isOpen: boolean;
    viewKey: string;
    itemSetIds: number[];
  }>({ isOpen: false, viewKey: '', itemSetIds: [] });
  const [createItemSetTitle, setCreateItemSetTitle] = useState('');
  const [createItemSetLoading, setCreateItemSetLoading] = useState(false);

  const handleCreateItemSetResource = async () => {
    if (!createItemSetTitle.trim()) return;
    setCreateItemSetLoading(true);
    try {
      const body = {
        'o:item_set': createItemSetModalState.itemSetIds.map((id) => ({ 'o:id': id })),
        'dcterms:title': [{ type: 'literal', '@value': createItemSetTitle.trim(), property_id: 1, is_public: true }],
      };
      const url = omekaApiUrl(`${API_BASE}items`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Erreur création');
      const created = await response.json();
      const newId = created['o:id'];
      // Ajouter l'item créé à la vue
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

  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    viewKey: string;
    itemId: string | number | null;
    itemTitle?: string;
    hardDelete?: boolean;
  }>({
    isOpen: false,
    viewKey: '',
    itemId: null,
    itemTitle: '',
    hardDelete: false,
  });
  const [isDeletingLinkedItem, setIsDeletingLinkedItem] = useState(false);

  /** Liste courante d'une vue liée (formData > viewKey > propriété Omeka) */
  const resolveLinkedItemsForView = useCallback(
    (viewKey: string): any[] => {
      if (formData[viewKey] !== undefined) {
        return Array.isArray(formData[viewKey]) ? formData[viewKey] : [];
      }
      if (Array.isArray(itemDetails?.[viewKey])) {
        return itemDetails[viewKey];
      }
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
              title: cached
                ? getLinkedResourceTitle({ ...cached, id: resourceId })
                : getLinkedResourceTitle(ref),
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
        const id = item.id || item['o:id'] || item.value_resource_id;
        return id !== itemId && String(id) !== String(itemId);
      });
      setValue(viewKey, updatedItems);
    },
    [resolveLinkedItemsForView, setValue],
  );

  /** Délier (transverse) = immédiat ; analyse / retour = popup + suppression Omeka */
  const handleRemoveItem = (viewKey: string, itemId: string | number) => {
    const currentItems = resolveLinkedItemsForView(viewKey);
    const itemToDelete = currentItems.find((item: any) => {
      const id = item.id || item['o:id'] || item.value_resource_id;
      return id === itemId || String(id) === String(itemId);
    });

    const viewOption = config.viewOptions.find((v) => v.key === viewKey);
    const templateId = resolveViewResourceTemplateId(viewKey, viewOption);
    const hardDelete = shouldHardDeleteLinkedResource(templateId);

    if (!hardDelete) {
      unlinkItemFromView(viewKey, itemId);
      return;
    }

    if (!canDeleteLinkedResource(itemToDelete, currentOmekaUserId, userCreatedResourceIds)) {
      addToast({
        title: 'Action non autorisée',
        description: 'Seul le propriétaire de la ressource peut la supprimer.',
        classNames: { base: 'bg-warning', title: 'text-c6', description: 'text-c5', icon: 'text-c6' },
      });
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

      addToast({
        title: 'Suppression réussie',
        description: "L'élément a été supprimé définitivement.",
        classNames: { base: 'bg-success', title: 'text-c6', description: 'text-c6', icon: 'text-c6' },
        timeout: 2000,
      });
      setDeleteModalState({ isOpen: false, viewKey: '', itemId: null, hardDelete: false });
    } catch (error) {
      console.error('Error deleting linked resource:', error);
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression.',
        classNames: { base: 'bg-danger', title: 'text-c6', description: 'text-c5', icon: 'text-c6' },
      });
    } finally {
      setIsDeletingLinkedItem(false);
    }
  };

  // Handle items change (for text views)
  const handleItemsChange = (viewKey: string, items: any[]) => {
    if (items.length > 0 && items[0].dataPath) {
      // For text views, update both the viewKey and the dataPath
      setValue(viewKey, items[0].value); // Pour que la vue puisse lire la valeur
      setValue(items[0].dataPath, items[0].value); // Pour la sauvegarde Omeka
    } else {
      setValue(viewKey, items);
    }
  };

  // Handle resource selection from picker
  const handleResourceSelect = (resources: any[]) => {
    const { viewKey, resourceTemplateId } = pickerState;
    const currentItems = resolveLinkedItemsForView(viewKey);

    // Normaliser les ressources Omeka S vers le format interne attendu par les composants
    const normalizedResources = resources.map((r) => {
      const title = r['o:title'] || r['dcterms:title']?.[0]?.['@value'] || r.title || r.display_title || '';
      const templateId = r['o:resource_template']?.['o:id'] || r.resource_template_id || resourceTemplateId;

      // Déterminer le type basé sur le template ID
      let type = r.type;
      if (!type && templateId) {
        type = resolveResourceTypeFromOmekaItem(r) ?? TEMPLATE_ID_TO_TYPE[Number(templateId)];
      }

      // Récupérer l'image/thumbnail
      const thumbnailUrl = r['thumbnail_display_urls']?.square || r.thumbnailUrl || r.thumbnail || r.picture || null;

      return {
        id: r['o:id'] || r.id,
        title: title,
        name: title, // Pour les personnes/actants
        short_resume: r['dcterms:description']?.[0]?.['@value'] || r.short_resume || '',
        // Image/thumbnail pour l'affichage
        picture: thumbnailUrl,
        thumbnail: thumbnailUrl,
        thumbnailUrl: thumbnailUrl,
        // Conserver les données brutes Omeka S pour la sauvegarde
        '@id': r['@id'],
        'o:id': r['o:id'] || r.id,
        _sessionCreated: r._sessionCreated,
        // Conserver le template ID et le type pour les filtres de références
        resource_template_id: templateId,
        type: type,
        template: r.template || (templateId ? { id: templateId } : undefined),
      };
    });

    const updatedItems = [...currentItems, ...normalizedResources];
    normalizedResources.forEach((r) => {
      if (r._sessionCreated && r.id != null) {
        markResourceAsUserCreated(r.id);
      }
    });
    setValue(viewKey, updatedItems);
    setPickerState({ isOpen: false, viewKey: '' });
  };

  /**
   * Charger les ressources disponibles pour une propriété donnée (inline search)
   * Basé sur test-omeka-edit.tsx - fonction loadResourcesForProperty
   */
  const _loadResourcesForProperty = async (propertyKey: string) => {
    const templateId = propertyTemplateMap[propertyKey];
    if (!templateId) {
      console.warn(`Pas de template ID pour la propriété ${propertyKey}`);
      return;
    }

    setSearchLoading(true);
    setActiveSearchProperty(propertyKey);

    try {
      const API_BASE = '/omk/api/';
      const url = `${API_BASE}items?resource_template_id=${templateId}&per_page=100`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('Erreur chargement ressources');
        setSearchResultsByProperty((prev) => ({ ...prev, [propertyKey]: [] }));
        return;
      }

      const items = await response.json();

      // Formater les résultats comme dans test-omeka-edit.tsx
      const formattedResults = items.map((item: any) => ({
        id: item['o:id'],
        title: item['o:title'] || getResourceFallbackTitle(item['o:id'], item['o:resource_template']?.['o:id']),
        resourceClass: item['o:resource_class']?.['o:label'],
        thumbnailUrl: item['thumbnail_display_urls']?.square,
      }));

      setSearchResultsByProperty((prev) => ({ ...prev, [propertyKey]: formattedResults }));
    } catch (err) {
      console.error('Erreur chargement ressources:', err);
      setSearchResultsByProperty((prev) => ({ ...prev, [propertyKey]: [] }));
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Ajouter une ressource liée depuis la recherche inline
   * Basé sur test-omeka-edit.tsx - fonction addLinkedResource
   */
  const _addLinkedResource = (propertyKey: string, resourceId: number) => {
    // Récupérer les IDs actuels pour cette propriété
    const currentValue = formData[propertyKey] || itemDetails?.[propertyKey];
    let currentIds: number[] = [];

    if (Array.isArray(currentValue)) {
      if (currentValue.length > 0 && typeof currentValue[0] === 'object' && 'id' in currentValue[0]) {
        // C'est un tableau d'objets avec des IDs
        currentIds = currentValue.map((item: any) => item.id);
      } else if (typeof currentValue[0] === 'number') {
        // C'est déjà un tableau d'IDs
        currentIds = currentValue;
      }
    }

    // Ajouter le nouvel ID si pas déjà présent
    if (!currentIds.includes(resourceId)) {
      const updatedIds = [...currentIds, resourceId];

      // Convertir en tableau d'objets pour le formulaire
      const searchResults = searchResultsByProperty[propertyKey] || [];
      const resourceObjects = updatedIds.map((id) => {
        const found = searchResults.find((r) => r.id === id);
        return found || { id };
      });

      setValue(propertyKey, resourceObjects);
    }
  };
  void _loadResourcesForProperty;
  void _addLinkedResource;

  // Render content based on selected view
  const renderedContent = useMemo(() => {
    if (!itemDetails) {
      return <div>Loading...</div>;
    }

    const viewOption = config.viewOptions.find((opt) => opt.key === selected);
    if (!viewOption || !viewOption.renderContent) {
      return null;
    }

    // Use form data if editing, otherwise use itemDetails
    const dataSource = isEditing ? { ...itemDetails, ...formData } : itemDetails;

    const content = viewOption.renderContent({
      itemDetails: dataSource,
      viewData,
      loading,
      loadingViews, // Passer le loading spécifique aux vues
      onTimeChange: handleTimeChange,
      // Edit mode context
      isEditing: isEditing && viewOption.editable !== false,
      onLinkExisting: handleLinkExisting,
      onCreateNew: handleCreateNewFromView,
      onRemoveItem: handleRemoveItem,
      onItemsChange: handleItemsChange,
      onEditResource: onEditResource, // Pass callback to view
      formData, // Pour que les vues texte puissent lire les valeurs éditées
      onNavigate: handleRightColumnNavigate, // Pour déclencher l'animation de sortie
      updatedResources, // Passer les mises à jour
      userCreatedResourceIds,
      currentOmekaUserId,
    });

    // Return null if content is null or undefined
    return content || null || undefined;
  }, [
    itemDetails,
    formData,
    selected,
    viewData,
    loading,
    loadingViews,
    config.viewOptions,
    isEditing,
    updatedResources,
    onEditResource,
    handleCreateNewFromView,
    currentOmekaUserId,
  ]);

  // Helper function to extract text from a React element recursively
  const extractTextFromElement = (element: React.ReactElement | React.ReactNode): string => {
    if (!element) return '';

    if (typeof element === 'string') {
      return element;
    }

    if (typeof element === 'number') {
      return String(element);
    }

    if (React.isValidElement(element)) {
      const props = element.props as any;
      const children = props?.children;

      if (Array.isArray(children)) {
        return children.map((child: any) => extractTextFromElement(child)).join(' ');
      } else if (children) {
        return extractTextFromElement(children);
      }
    }

    return '';
  };

  // Helper function to check if a React element is an empty state message
  const isEmptyStateMessage = (element: React.ReactElement): boolean => {
    const props = element.props as any;
    const componentType = element.type as any;

    // Check component name/displayName for EmptyState
    const componentName = componentType?.displayName || componentType?.name || '';
    if (componentName && (componentName.includes('EmptyState') || componentName === 'EmptyState')) {
      return true;
    }

    // Check for EmptyState component structure: div with text-center, bg-c2, border-c3
    // This matches the EmptyState component structure exactly
    const className = typeof props?.className === 'string' ? props.className : '';
    const hasEmptyStateStructure = className.includes('text-center') && className.includes('bg-c2') && className.includes('border-c3') && className.includes('rounded-xl');

    if (hasEmptyStateStructure) {
      // Extract all text from the element recursively
      const allText = extractTextFromElement(element).toLowerCase().trim();

      // Check if text contains empty message keywords
      if (allText) {
        const hasEmptyKeywords =
          allText.includes('aucun') ||
          allText.includes('aucune') ||
          allText.includes('disponible') ||
          allText.includes('référence') ||
          allText.includes('élément') ||
          allText.includes('donnée') ||
          allText.includes('contenu') ||
          allText.includes('analyse') ||
          allText.includes('source') ||
          allText.includes('média') ||
          allText.includes('ressource');

        // If it has empty keywords AND matches a common empty message pattern, it's empty
        if (hasEmptyKeywords) {
          const emptyPatterns = [
            'aucune référence disponible',
            'aucun élément disponible',
            'aucune donnée disponible',
            'aucun contenu disponible',
            'aucune analyse disponible',
            'aucune source disponible',
            'aucun média disponible',
            'aucune ressource disponible',
          ];

          // Check if the text matches any empty pattern (even if there's other text)
          return emptyPatterns.some((pattern) => allText.includes(pattern));
        }
      }

      // If it has the EmptyState structure but we can't read the text, assume it's empty
      // (better safe than sorry - we'd rather hide it if unsure)
      return true;
    }

    // Also check for simpler empty message patterns (text-center with bg-c2)
    if (className.includes('text-center') && className.includes('bg-c2')) {
      const allText = extractTextFromElement(element).toLowerCase().trim();
      if (allText) {
        // Check for empty message patterns
        const emptyPatterns = ['aucune référence disponible', 'aucun élément disponible', 'aucune donnée disponible', 'aucun contenu disponible'];
        return emptyPatterns.some((pattern) => allText.includes(pattern));
      }
    }

    return false;
  };

  // Helper function to check if a single view has content
  const viewHasRenderableContent = (viewOption: ViewOption | undefined): boolean => {
    if (!viewOption) return false;

    // In edit mode, always show editable views
    if (isEditing && viewOption.editable !== false) {
      return true;
    }

    if (viewOption.getItemCount && itemDetails) {
      return viewOption.getItemCount(itemDetails, isEditing ? formData : undefined) > 0;
    }

    if (!viewOption.renderContent) {
      return false;
    }

    const content = viewOption.renderContent({
      itemDetails,
      viewData,
      loading: false,
      loadingViews,
      onTimeChange: handleTimeChange,
      isEditing: false, // Check content availability in view mode
    });

    if (!content) {
      return false;
    }

    if (React.isValidElement(content)) {
      const props = content.props as any;

      // Check if it's an ItemsList component with empty items (most reliable check)
      if (props?.items !== undefined) {
        const items = Array.isArray(props.items) ? props.items : [];
        return items.length > 0;
      }

      // Check if it's an EmptyState component directly
      if (isEmptyStateMessage(content)) {
        return false;
      }

      // Recursive function to check if the root element or any direct child is an EmptyState
      const checkForEmptyState = (element: React.ReactElement): boolean => {
        if (isEmptyStateMessage(element)) {
          return true;
        }

        const elementProps = element.props as any;
        if (elementProps?.children) {
          const children = elementProps.children;

          if (Array.isArray(children)) {
            if (children.length > 0 && React.isValidElement(children[0])) {
              return isEmptyStateMessage(children[0]);
            }
          } else if (React.isValidElement(children)) {
            return isEmptyStateMessage(children);
          }
        }

        return false;
      };

      if (checkForEmptyState(content)) {
        return false;
      }

      return true;
    }

    if (typeof content === 'string') {
      return content.trim() !== '';
    }

    return true;
  };

  // Filter views to only show those with content
  const availableViews = useMemo(() => {
    if (!config.viewOptions || config.viewOptions.length === 0) {
      return [];
    }

    const excludeFormHiddenViews = (views: typeof config.viewOptions) => {
      if (!isEditing) return views;
      return views.filter((viewOption) => !viewOption.hiddenInForm);
    };

    // In create mode, show all editable views (no itemDetails to check)
    if (mode === 'create') {
      return excludeFormHiddenViews(config.viewOptions.filter((viewOption) => viewOption.editable !== false));
    }

    if (!itemDetails || loading) {
      return [];
    }

    // Filter views to only include those with content (or all editable in edit mode)
    return excludeFormHiddenViews(config.viewOptions.filter((viewOption) => viewHasRenderableContent(viewOption)));
  }, [itemDetails, loading, loadingViews, config.viewOptions, isEditing, mode, formData]);

  // Ensure selected view is available, if not select the first available view
  useEffect(() => {
    if (!loading && itemDetails && availableViews.length > 0) {
      const isSelectedAvailable = availableViews.some((view) => view.key === selected);
      if (!isSelectedAvailable) {
        // Select the first available view or the default view if available
        const defaultView = config.defaultView && availableViews.find((v) => v.key === config.defaultView);
        setSelected(defaultView ? defaultView.key : availableViews[0].key);
      }
    }
  }, [loading, itemDetails, availableViews, selected, config.defaultView]);

  const OverviewComponent = config.overviewComponent;
  const DetailsComponent = config.detailsComponent;
  const OverviewSkeleton = config.overviewSkeleton;
  const DetailsSkeleton = config.detailsSkeleton;

  const shouldShowRightColumn =
    (mode === 'create' || isEditing ? availableViews.length : (config.viewOptions?.length ?? 0)) > 0 &&
    !config.editSingleColumn;
  const useSingleColumnEdit = isEditing && config.editSingleColumn;
  /** Formulaire ou page sans colonne droite → contenu centré (outil, organisation, etc.) */
  const useCenteredSingleColumn = config.editSingleColumn || (isEditing && !shouldShowRightColumn);
  const leftColumnSpan = shouldShowRightColumn ? 'col-span-10 lg:col-span-6' : 'col-span-10';
  const centeredShellClass = useCenteredSingleColumn ? 'w-full max-w-3xl' : 'w-full';
  const leftColumnOuterClassName = `${leftColumnSpan}${useCenteredSingleColumn ? ' flex justify-center' : ''}`;
  const leftColumnInnerClassName = `${centeredShellClass} flex flex-col gap-5 h-fit`;
  const singleColumnEditShell = useCenteredSingleColumn ? 'w-full flex flex-col gap-12' : 'flex flex-col gap-6 w-full';

  // Titre / métadonnées de la vue sélectionnée (availableViews ou config complète)
  const selectedOption =
    availableViews.find((option) => option.key === selected) ??
    config.viewOptions.find((option) => option.key === selected);

  const renderViewsPanel = (options?: { compact?: boolean }) => (
    <div className={`flex w-full flex-col gap-5 flex-grow ${options?.compact ? '' : 'min-h-0 overflow-hidden'}`}>
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
              {(availableViews.length > 0 ? availableViews : config.viewOptions).map((option) => {
                const isAvailable = availableViews.some((v) => v.key === option.key);
                const isLoading = loadingViews && !isAvailable;

                return (
                  <DropdownItem
                    key={option.key}
                    className={dropdownMenuItemClass}
                    onPress={() => handleOptionSelect(option.key)}
                    isDisabled={isLoading}>
                    <div
                      className={`flex items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 ${
                        isLoading
                          ? 'text-c4 cursor-not-allowed'
                          : selected === option.key
                            ? 'bg-c3 text-c6 font-medium'
                            : 'text-c6 hover:bg-c3'
                      }`}>
                      {isLoading && <Spinner size='sm' className='mr-2 text-c6' />}
                      <span className='text-base font-normal'>{option.title}</span>
                    </div>
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </Dropdown>
      </div>

      <div className={`flex-grow ${options?.compact ? '' : 'min-h-0 overflow-auto'}`}>
        {viewHasRenderableContent(selectedOption) ? (
          renderedContent
        ) : (
          <div className='flex flex-col items-center justify-center w-full h-full py-5 text-center gap-4'>
            <ThumbnailIcon size={32} className='text-c4' />
            <p className='text-c5 text-base w-50'>Aucun contenu renseigné pour {selectedOption?.title?.toLowerCase() || 'cette section'}.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Sort keywords by popularity (descending order)
  // En mode édition, formData.keywords est la source de vérité (permet ajouts et suppressions)
  const sortedKeywords = useMemo(() => {
    let allKeywords: any[];

    // En mode édition, utiliser formData.keywords comme source de vérité s'il est défini
    if (isEditing && formData.keywords !== undefined) {
      allKeywords = Array.isArray(formData.keywords) ? formData.keywords : [];
    } else {
      allKeywords = keywords || [];
    }

    if (allKeywords.length === 0) return [];
    return [...allKeywords]
      .map((keyword) => ({
        ...keyword,
        id: getLinkedResourceId(keyword),
        title: getLinkedResourceTitle(keyword, 34),
      }))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }, [keywords, isEditing, formData.keywords]);

  const resourceOwner = useResourceOwner(itemDetails);
  const resourceTypeLabel =
    config.resourceLabel || getRessourceLabel(config.resourceType || config.type || '') || null;

  // Résumé automatique des ressources liées pour EditSaveBar (tab racine)
  const autoResourceTree = useMemo(() => {
    if (!isEditing || !config.type) return undefined;
    const rootLabel = getRessourceLabel(config.type);
    if (!rootLabel) return undefined;

    const singularize = (title: string): string =>
      title.split(' ').map((w) => (w.length > 2 && w.endsWith('s') ? w.slice(0, -1) : w)).join(' ');

    const pluralize = (title: string, count: number): string => {
      if (count === 1) return `${count} ${singularize(title)}`;
      return `${count} ${title}`;
    };

    const children = config.viewOptions
      .filter((v) => v.editable !== false)
      .flatMap((v) => {
        const count = v.getItemCount ? v.getItemCount(itemDetails, formData) : 0;
        if (count === 0) return [];
        const displayTitle = v.viewKind === 'text' ? v.title : pluralize(v.title, count);
        return [{ title: displayTitle, isActive: false }];
      });

    if (children.length === 0) return undefined;
    return { root: rootLabel, children };
  }, [isEditing, config.type, config.viewOptions, itemDetails, formData]);

  // Bug 3 fix: Si mode édition mais données pas encore chargées, afficher skeleton
  if (isEditing && !itemDetails && loading) {
    return (
      <Layouts className='grid grid-cols-10 col-span-10 gap-12 overflow-visible z-0'>
        <div className='col-span-10 overflow-visible'>
          <EditModeBanner mode={mode === 'create' ? 'create' : 'edit'} resourceType={config.type || 'Ressource'} labelOverride={config.resourceLabel} />
        </div>
        {/* Left column skeleton - matching loaded state structure */}
        <motion.div className='col-span-10 flex flex-col gap-4 h-fit items-center justify-center py-5' variants={fadeIn}>
          <Spinner color="current" className="text-c6" />
          <p className="text-c6">Chargement en cours...</p>
        </motion.div>

      </Layouts>
    );
  }

  return (
    <>
      <Layouts className='grid grid-cols-10 col-span-10 gap-6 overflow-visible z-0'>
        {/* Edit Mode Banner */}
        {isEditing && (
          <div className='col-span-10 overflow-visible'>
            <EditModeBanner mode={mode === 'create' ? 'create' : 'edit'} resourceType={config.type || 'Ressource'} labelOverride={config.resourceLabel} />
          </div>
        )}

        {!isEditing && (
          <div className='col-span-10 w-full'>
            <DynamicBreadcrumbs
              className='w-full'
              itemTitle={itemDetails?.titre || itemDetails?.title || itemDetails?.['o:title'] || itemDetails?.name}
              underline='hover'
            />
          </div>
        )}

        {/* Colonne principale */}
        <motion.div ref={firstDivRef} className={leftColumnOuterClassName} variants={fadeIn}>
          <div className={leftColumnInnerClassName}>
          {/* Keywords carousel */}
          {config.showKeywords &&
            (loadingKeywords ? (
              <KeywordsCarouselSkeleton />
            ) : (
              itemDetails &&
              (sortedKeywords?.length > 0 || isEditing) && (
                <div className='flex flex-col gap-2'>
                  {isEditing ? (
                    <div className='flex flex-wrap gap-2 items-center w-full'>
                      {sortedKeywords?.map((keyword: any) => (
                        <div key={keyword.id || keyword.title} className={selectedResourceChipClass}>
                          <span>{keyword.title}</span>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentKeywords = formData.keywords || [];
                              const updatedKeywords = currentKeywords.filter((k: any) => k.id !== keyword.id);
                              setValue('keywords', updatedKeywords);
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
                  ) : (
                    sortedKeywords?.length > 0 && (
                      <LongCarrousel
                        perPage={3}
                        perMove={1}
                        autowidth={true}
                        data={sortedKeywords}
                        renderSlide={(item) => (
                          <KeywordsCard key={item.id || item.title} onSearchClick={handleKeywordClick} word={item.title} />
                        )}
                      />
                    )
                  )}
                </div>
              )
            ))}

          {/* Mode édition/création: Section unifiée */}
          {isEditing ? (
            <div className={`${singleColumnEditShell} ${useCenteredSingleColumn ? 'items-stretch' : ''}`}>
              {/* Section Médias / Photo */}
              {config.mediaUploadMode !== 'none' && (
                <div className='w-full flex flex-col gap-4'>
                  <OverviewComponent
                    {...config.mapOverviewProps({ ...itemDetails, ...formData }, currentVideoTime)}
                    videoSeek={videoSeek}
                    type={config.type}
                    isEditing={true}
                    loadingMedia={loadingMedia}
                    mediaUploadMode={config.mediaUploadMode}
                    onTitleChange={(value: string) => setValue('title', value)}
                    onMediasChange={(files: MediaFile[]) => setMediaFiles(files)}
                    onLinkChange={(value: string) => setValue('fullUrl', value)}
                    youtubeUrls={config.mediaUploadMode === 'gallery' ? youtubeUrls : []}
                    onYouTubeUrlsChange={
                      config.mediaUploadMode === 'gallery'
                        ? (urls: string[]) => setYoutubeUrls(urls)
                        : undefined
                    }
                    mediaFiles={mediaFiles}
                    removedMediaIndexes={removedMediaIndexes}
                    onRemoveExistingMedia={handleRemoveExistingMedia}
                  />

                  {/* Boutons contributeurs — inline : puces à gauche, boutons à droite */}
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
                        allContributors.push({
                          ...item,
                          id: itemId,
                          title: getLinkedResourceTitle(item, btn.templateId),
                          _property: btn.property,
                        });
                      });
                    });

                    return (
                      <div className='flex flex-wrap gap-2 items-center w-full'>
                        {allContributors.map((item: any, idx: number) => {
                          const isUserCreated =
                            userCreatedResourceIds?.has(String(item.id)) ||
                            String(item.ownerId) === String(currentOmekaUserId);
                          const canEditChip = isUserCreated && onEditResource;
                          const btn = config.contributorButtons!.find((b) => b.property === item._property);
                          return (
                          <div key={item.id || idx} className={selectedResourceChipClass}>
                            <span
                              onClick={() => {
                                if (canEditChip && btn) {
                                  onEditResource(item._property, item.id, btn.templateId);
                                }
                              }}
                              className={canEditChip ? 'cursor-pointer hover:underline' : ''}>
                              {item.title || item.name}
                            </span>
                            <button
                              type='button'
                              onClick={() => {
                                const prop = item._property;
                                const current: any[] = Array.isArray(formData[prop]) ? formData[prop] : [];
                                setValue(
                                  prop,
                                  current.filter((c: any) => String(getLinkedResourceId(c)) !== String(item.id)),
                                );
                                const legacy: any[] = Array.isArray(formData['personnes']) ? formData['personnes'] : [];
                                if (legacy.some((c: any) => String(getLinkedResourceId(c)) === String(item.id))) {
                                  setValue(
                                    'personnes',
                                    legacy.filter((c: any) => String(getLinkedResourceId(c)) !== String(item.id)),
                                  );
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
                            onClick={() =>
                              setActiveResourceField({
                                key: btn.property,
                                label: btn.label,
                                templateId: btn.templateId,
                              })
                            }
                            className={dropdownTriggerButtonClass}>
                            <AddIcon size={14} className='text-c4 shrink-0' />
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Section Formulaire Unifié */}
              <div className={`${useSingleColumnEdit ? 'border-t border-c3 pt-6' : 'rounded-xl p-6 border-2 border-c3 border-2'} flex flex-col gap-8 items-start w-full`}>
                <FormTextInput
                  label='Titre'
                  value={formData.title || ''}
                  onChange={(value) => setValue('title', value)}
                  placeholder='Titre de la ressource'
                />

                {config.formFields
                  ?.filter((f) => f.key === 'description')
                  .map((field) => (
                    <FormAutoResizeTextareaInput
                      key={field.key}
                      label={field.label}
                      value={formData.description || ''}
                      onChange={(value) => setValue('description', value)}
                      placeholder={field.placeholder ?? 'Décrivez votre ressource...'}
                    />
                  ))}

                {config.formFields
                  ?.filter((f) => f.key === 'date')
                  .map((field) => (
                    <FormDateInput
                      key={field.key}
                      label={field.label}
                      value={formData.date || ''}
                      onChange={(value) => setValue('date', value)}
                    />
                  ))}

                {config.formFields?.find((f) => f.key === 'percentage') && (
                  <div className='w-full'>
                    <div className='flex justify-between items-center'>
                      <span className={formFieldLabelClass}>Avancement</span>
                      <span className='text-c6 font-semibold'>{formData.percentage || 0}%</span>
                    </div>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      step='5'
                      value={formData.percentage || 0}
                      onChange={(e) => setValue('percentage', parseInt(e.target.value))}
                      className='w-full mt-2.5 accent-action'
                    />
                  </div>
                )}

                {config.formFields?.find((f) => f.key === 'status') && (
                  <FormTextInput
                    label='Statut'
                    value={formData.status || ''}
                    onChange={(value) => setValue('status', value)}
                    placeholder='En cours, Terminé...'
                  />
                )}

                {config.formFields?.find((f) => f.key === 'category') && (
                  <FormTextInput
                    label="Type d'outil"
                    value={formData.category || ''}
                    onChange={(value) => setValue('category', value)}
                    placeholder='Logiciel, Bibliothèque, Framework...'
                  />
                )}

                {config.formFields
                  ?.filter((f) => f.key === 'purpose')
                  .map((purposeField) => (
                    <FormAutoResizeTextareaInput
                      key={purposeField.key}
                      label={purposeField.label}
                      value={formData.purpose || ''}
                      onChange={(value) => setValue('purpose', value)}
                      placeholder={purposeField.placeholder}
                    />
                  ))}

                {/* Champs texte / url / textarea / date déclarés dans la config (ex: prénom, nom, email…) */}
                {config.formFields
                  ?.filter((f) => {
                    const handledKeys = new Set(['title', 'description', 'date', 'percentage', 'status', 'category', 'purpose']);
                    return !handledKeys.has(f.key) && ['text', 'url', 'textarea', 'date'].includes(f.type);
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

                {/* Champs select statique (liste d'options prédéfinies) */}
                {config.formFields
                  ?.filter((f) => f.type === 'selection' && Array.isArray(f.options) && f.options.length > 0)
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
                        {field.options!.map((opt) => (
                          <SelectItem key={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>
                    );
                  })}

                {/* Champs ItemSet (sélecteur depuis un item set Omeka) */}
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

                {/* Champs ressources liées (multiselection — ex: université, labo, etc.)
                    Exclure le contributeur auto-rempli et keywords (carrousel) */}
                {config.formFields
                  ?.filter((f) => f.type === 'multiselection' && f.selectionConfig?.templateId)
                  .filter((f) => {
                    if (autoContributorConfig && f.key === autoContributorConfig.fieldKey) return false;
                    if (config.showKeywords && f.key === 'keywords') return false;
                    return true;
                  })
                  .map((field) => {
                    const selected: any[] = Array.isArray(formData[field.key]) ? formData[field.key] : [];
                    return (
                      <div key={field.key} className='flex flex-col gap-2'>
                        <label className={formFieldLabelClass}>{field.label}</label>
                        <div className='flex flex-wrap gap-2 items-center'>
                          {selected.map((item: any, idx: number) => {
                            const itemId = getLinkedResourceId(item);
                            return (
                            <div key={itemId ?? idx} className={selectedResourceChipClass}>
                              <span>{getLinkedResourceTitle(item, field.selectionConfig?.templateId)}</span>
                              <button
                                type='button'
                                onClick={() =>
                                  setValue(
                                    field.key,
                                    selected.filter((s: any) => String(getLinkedResourceId(s)) !== String(itemId)),
                                  )
                                }
                                className={selectedResourceRemoveButtonClass}
                                aria-label='Retirer'>
                                <ModalCloseIcon />
                              </button>
                            </div>
                            );
                          })}
                          <button
                            type='button'
                            onClick={() =>
                              setActiveResourceField({
                                key: field.key,
                                label: field.label,
                                templateId: field.selectionConfig!.templateId!,
                                displayMode: config.resourcePickerDisplay,
                              })
                            }
                            className={dropdownTriggerButtonClass}>
                            <AddIcon size={14} className='text-c4 shrink-0' />
                            Ajouter
                          </button>
                        </div>
                      </div>
                    );
                  })}

              </div>

              {/* Vues (caractéristiques, spécifications, liens…) — colonne unique */}
              {useSingleColumnEdit && config.viewOptions && config.viewOptions.length > 0 && (
                <div className='w-full border-t border-c3 pt-6'>
                  {loadingViews ? (
                    <div className='flex flex-col gap-4'>
                      <div className='flex items-center justify-between w-full'>
                        <div className='w-2/5 h-12 bg-c3 rounded-lg animate-pulse' />
                        <div className='w-1/5 h-12 bg-c3 rounded-lg animate-pulse' />
                      </div>
                      <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                      <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                    </div>
                  ) : (
                    renderViewsPanel({ compact: true })
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mode view: Overview Card */}
              {loading ? (
                OverviewSkeleton ? (
                  <OverviewSkeleton />
                ) : (
                  <div>Loading...</div>
                )
              ) : itemDetails ? (
                <OverviewComponent {...config.mapOverviewProps(itemDetails, currentVideoTime)} videoSeek={videoSeek} type={config.type} isEditing={false} loadingMedia={loadingMedia} />
              ) : null}

              {/* Mode view: Details Card */}
              {loading ? (
                DetailsSkeleton ? (
                  <DetailsSkeleton />
                ) : (
                  <div>Loading...</div>
                )
              ) : itemDetails ? (
                <DetailsComponent {...config.mapDetailsProps(itemDetails)} isEditing={isEditing} type={config.type} />
              ) : null}
            </>
          )}
          </div>
        </motion.div>

        {/* Colonne secondaire - Vues multiples */}
        {/* Modified: Removed hasRenderedContent check to force display even if empty */}
        {shouldShowRightColumn ? (
          <motion.div
            style={{ height: equalHeight || 'auto' }}
            className='col-span-10 lg:col-span-4 flex flex-col gap-12 overflow-hidden'
            initial={{ opacity: 0, x: 30 }}
            animate={
              isExitingRightColumn ? { opacity: 0, x: 60, transition: { duration: 0.35, ease: 'easeIn' } } : { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } }
            }>
            {loadingViews ? (
              <div className='flex w-full flex-col gap-5 flex-grow'>
                <div className='flex items-center justify-between w-full'>
                  <div className='w-2/5 h-12 bg-c3 rounded-lg animate-pulse' />
                  <div className='w-1/5 h-12 bg-c3 rounded-lg animate-pulse' />
                </div>
                <div className='flex flex-col gap-4'>
                  <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                  <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                  <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                  <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                  <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                  <div className='w-full h-28 bg-c3 rounded-xl animate-pulse' />
                </div>
              </div>
            ) : (
              renderViewsPanel()
            )}
          </motion.div>
        ) : null}

        {/* Recommendations — masquées en mode édition/création */}
        {config.showRecommendations && !isEditing && (
          loadingRecommendations ? (
            <motion.div className='col-span-10 h-full lg:col-span-6 flex flex-col gap-12 flex-grow' variants={fadeIn}>
              <div className='flex flex-col gap-5'>
                <h2 className='text-2xl font-medium text-c6'>{config.recommendationsTitle || 'Recommandations'}</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                  <ResourceCardSkeleton />
                  <ResourceCardSkeleton />
                </div>
              </div>
            </motion.div>
          ) : recommendations.length > 0 ? (
            <motion.div className='col-span-10 h-full lg:col-span-6 flex flex-col gap-12 flex-grow' variants={fadeIn}>
              <FullCarrousel
                title={config.recommendationsTitle || 'Recommandations'}
                perPage={2}
                perMove={1}
                data={recommendations}
                renderSlide={(item) => {
                  // Mapper les props si nécessaire
                  const mappedItem = config.mapRecommendationProps ? config.mapRecommendationProps(item) : item;
                  return (
                    <motion.div initial='hidden' animate='visible' variants={fadeIn} key={item.id}>
                      <ResourceCard item={mappedItem} />
                    </motion.div>
                  );
                }}
              />
            </motion.div>
          ) : null
        )}

        {/* Comments — masqués en mode édition/création */}
        {config.showComments && !isEditing && (
          <motion.div
            className={`${shouldShowRightColumn ? 'col-span-4 lg:col-span-4' : 'col-span-10'} h-full flex flex-col gap-12 flex-grow${useCenteredSingleColumn ? ' items-center' : ''}`}
            variants={fadeIn}>
            <div className={`${centeredShellClass} flex flex-col gap-12 flex-grow`}>
              <CommentSection LinkedResourceId={Number(id)} />
            </div>
          </motion.div>
        )}

        {!isCreateMode && !loading && (resourceTypeLabel || resourceOwner) && (
          <motion.div
            className={`col-span-10 pt-4 border-t border-c3${useCenteredSingleColumn ? ' flex justify-center' : ''}`}
            variants={fadeIn}>
            <div className={centeredShellClass}>
              <ResourceOwnerAttribution owner={resourceOwner} resourceTypeLabel={resourceTypeLabel} />
            </div>
          </motion.div>
        )}

        <SearchModal ref={searchModalRef} notrigger={true} />

        {/* Resource Picker Modal - Toujours monté, isOpen gère la visibilité */}
        <ResourcePicker
          isOpen={pickerState.isOpen}
          onClose={() => setPickerState({ isOpen: false, viewKey: '' })}
          onSelect={handleResourceSelect}
          title={
            pickerState.pickerTitle ||
            `Sélectionner ${pickerState.viewKey === 'keywords' ? 'des mots-clés' : 'des ressources'}`
          }
          resourceTemplateId={pickerState.resourceTemplateId}
          resourceTemplateIds={pickerState.resourceTemplateIds}
          itemSetIds={pickerState.itemSetIds}
          multiSelect={pickerState.multiSelect}
          selectedIds={[]}
          displayMode={pickerState.viewKey === 'keywords' || pickerState.itemSetIds ? 'alphabetic' : 'grid'}
          allowCreate={pickerAllowsCreate}
          createOnly={pickerState.createOnly}
          onCreateOverride={
            pickerState.itemSetIds?.length
              ? handlePickerCreateOverride
              : onCreateNewResource
                ? handlePickerCreateInTab
                : undefined
          }
        />
        {/* Modale création rapide d'un item dans un item set */}
        <Modal
          isOpen={createItemSetModalState.isOpen}
          onClose={() => {
            setCreateItemSetModalState({ isOpen: false, viewKey: '', itemSetIds: [] });
            setCreateItemSetTitle('');
          }}
          backdrop='blur'
          size='md'
          scrollBehavior='inside'
          classNames={{ closeButton: modalCloseButtonClasses }}
          motionProps={{
            variants: {
              enter: {
                y: 0,
                opacity: 1,
                transition: { duration: 0.3, ease: 'easeOut' },
              },
              exit: {
                y: -20,
                opacity: 0,
                transition: { duration: 0.2, ease: 'easeIn' },
              },
            },
          }}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className='flex flex-col gap-px'>
                  <ModalTitle
                    title='Créer une nouvelle entrée'
                    icon={AddIcon}
                    iconColor='text-action'
                    iconBg='bg-action/20'
                    titleClassName='text-c6 text-xl font-semibold'
                  />
                </ModalHeader>
                <ModalBody>
                  <FormTextInput
                    label='Titre'
                    value={createItemSetTitle}
                    onChange={setCreateItemSetTitle}
                    placeholder="Nom de l'entrée..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreateItemSetResource();
                    }}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button variant='light' onPress={onClose} className='text-c5 rounded-lg'>
                    Annuler
                  </Button>
                  <Button
                    onPress={() => void handleCreateItemSetResource()}
                    isLoading={createItemSetLoading}
                    isDisabled={!createItemSetTitle.trim()}
                    className='bg-action text-selected rounded-lg'>
                    Créer
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Sélecteur de ressources liées (contributeurs + champs multiselection) */}
        {activeResourceField && (
          <ResourcePicker
            isOpen={true}
            onClose={() => setActiveResourceField(null)}
            onSelect={(resources) => {
              const field = activeResourceField;
              if (!field) return;
              const current: any[] = Array.isArray(formData[field.key]) ? formData[field.key] : [];
              const newItems = resources.map((r) => {
                const id = getLinkedResourceId(r);
                return {
                  id,
                  'o:id': id,
                  title: getLinkedResourceTitle(r, field.templateId),
                  name: getLinkedResourceTitle(r, field.templateId),
                };
              });
              const toAdd = newItems.filter(
                (n) => n.id != null && !current.some((c: any) => String(getLinkedResourceId(c)) === String(n.id)),
              );
              resources.forEach((r) => {
                if (r._sessionCreated && getLinkedResourceId(r) != null) {
                  markResourceAsUserCreated(getLinkedResourceId(r)!);
                }
              });
              const merged = [...current, ...toAdd];
              setValue(field.key, merged);
              if (autoContributorConfig && autoContributorConfig.fieldKey === field.key) {
                setValue('personnes', merged);
              }
              setActiveResourceField(null);
            }}
            title={activeResourceField.label}
            resourceTemplateId={activeResourceField.templateId}
            multiSelect={true}
            displayMode={activeResourceField.displayMode === 'alphabetic' ? 'alphabetic' : 'grid'}
            allowCreate={
              activeResourceField.displayMode === 'alphabetic'
                ? activeResourceField.templateId === 34
                : !!(getResourceConfigByTemplateId(activeResourceField.templateId)?.createUrl ||
                    QUICK_CREATE_CONFIGS[activeResourceField.templateId])
            }
            selectedIds={[]}
            filterFn={(resource) => {
              const alreadySelected = (Array.isArray(formData[activeResourceField.key]) ? formData[activeResourceField.key] : [])
                .map((r: any) => r.id)
                .filter(Boolean);
              const resourceId = resource['o:id'] || resource.id;
              return !alreadySelected.includes(resourceId);
            }}
            onCreateOverride={
              onCreateNewResource ? handleFieldCreateInTab : undefined
            }
          />
        )}

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
                  <>
                    Supprimer définitivement{' '}
                    <span className='text-c6 font-medium'>&quot;{deleteModalState.itemTitle}&quot;</span> ?
                  </>
                ) : (
                  'Supprimer définitivement cet élément ?'
                )}
              </p>
              <p className='text-c4 text-sm mt-2.5'>Cette action est irréversible. L&apos;élément sera retiré de la base de données.</p>
            </>
          }
        />
    </Layouts>

      {/* Fixed bottom save bar for edit/create mode - Outside Layouts for proper fixed positioning */}
      <EditSaveBar
        isVisible={isEditing}
        onSave={handleSave}
        onCancel={handleCancelEdit}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        mode={mode}
        saveLabel={saveLabel}
        resourceTree={resourceTree ?? autoResourceTree}
      />
    </>
  );
};
