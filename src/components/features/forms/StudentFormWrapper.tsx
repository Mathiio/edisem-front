import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GenericDetailPage } from '@/pages/generic/GenericDetailPage';
import { GenericDetailPageConfig } from '@/pages/generic/config';
import { feedbackStudentConfigSimplified } from '@/pages/generic/config/feedbackStudentConfig';
import { bibliographyConfigSimplified } from '@/pages/generic/config/bibliographyConfig';
import { mediagraphyConfigSimplified } from '@/pages/generic/config/mediagraphyConfig';
import { SimplifiedDetailConfig } from '@/pages/generic/simplifiedConfig';
import { createHandleSave } from '@/pages/generic/simplifiedConfigAdapter';
import { resolveCreateTabConfig } from '@/pages/generic/createTabRegistry';
import { getRessourceLabel, getResourceUrl, getMonEspacePath, getResourceLinkSaveLabel } from '@/config/resourceConfig';
import { useAuth } from '@/hooks/useAuth';
import { AlertModal } from '@/components/ui/AlertModal';

/** Métadonnées d'un formulaire empilé (parent / enfant) — sans barre d'onglets visible */
interface InternalTab {
  id: string;
  title: string;
  isDirty: boolean;
  config: GenericDetailPageConfig;
  mode: 'edit' | 'create';
  itemId?: string;
  parentTabId?: string;
  linkedField?: string;
  hasBeenActivated?: boolean;
}

const TEMPLATE_ID_TO_SIMPLIFIED: Record<number, SimplifiedDetailConfig> = {
  [feedbackStudentConfigSimplified.templateId]: feedbackStudentConfigSimplified,
  [bibliographyConfigSimplified.templateId]: bibliographyConfigSimplified,
  [mediagraphyConfigSimplified.templateId]: mediagraphyConfigSimplified,
};

const getConfigForViewKey = (viewKey: string, templateId?: number): { config: GenericDetailPageConfig } | undefined => {
  const config = resolveCreateTabConfig(viewKey, templateId);
  return config ? { config } : undefined;
};

interface StudentFormWrapperProps {
  initialConfig: GenericDetailPageConfig;
  initialMode: 'edit' | 'create';
}

/**
 * Wrapper qui gère les onglets pour l'édition/création de ressources étudiantes.
 * Les onglets sont rendus à l'intérieur de GenericDetailPage.
 * Tous les formulaires restent montés pour préserver leur état.
 */
export const StudentFormWrapper: React.FC<StudentFormWrapperProps> = ({ initialConfig, initialMode }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const monEspacePath = getMonEspacePath(userData?.type);

  // État des onglets
  const [tabs, setTabs] = useState<InternalTab[]>([
    {
      id: 'main',
      title: getRessourceLabel(initialConfig.type || 'Ressource'),
      config: initialConfig,
      mode: initialMode,
      itemId: paramId,
      isDirty: false,
      hasBeenActivated: true, // Main tab is active from start
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('main');
  const activeTabIdRef = useRef(activeTabId);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTabId]);

  const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleCreateNewResource = useCallback((viewKey: string, templateId?: number) => {
    const mapping = getConfigForViewKey(viewKey, templateId);
    if (!mapping) {
      console.warn(`No config found for viewKey: ${viewKey}, templateId: ${templateId}`);
      return;
    }

    const newTabId = generateTabId();
    const parentTabId = activeTabIdRef.current;

    setTabs((prev) => [
      ...prev,
      {
        id: newTabId,
        title: getRessourceLabel(mapping.config.type || 'Ressource'),
        config: mapping.config,
        mode: 'create',
        isDirty: false,
        parentTabId,
        linkedField: viewKey,
        hasBeenActivated: true,
      },
    ]);
    setActiveTabId(newTabId);
  }, []);

  const handleEditResource = useCallback(
    (viewKey: string, resourceId: string | number, templateId?: number) => {
      const mapping = getConfigForViewKey(viewKey, templateId);
      if (!mapping) {
        console.warn(`No config found for viewKey: ${viewKey} (edit mode)`);
        return;
      }

      // Check if tab already exists
      const existingTab = tabs.find((t) => t.itemId === String(resourceId) && t.config === mapping.config);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      const newTabId = generateTabId();

      setTabs((prev) => [
        ...prev,
        {
          id: newTabId,
          title: getRessourceLabel(mapping.config.type || 'Ressource'),
          config: mapping.config,
          mode: 'edit',
          itemId: String(resourceId),
          isDirty: false,
          parentTabId: activeTabIdRef.current,
          linkedField: viewKey,
          hasBeenActivated: true,
        },
      ]);
      setActiveTabId(newTabId);
    },
    [tabs],
  );



  const handleSaveComplete = useCallback(
    (tabId: string, savedItemId: string | number, savedItemTitle?: string) => {
      let navigationUrl: string | null = null;

      setTabs((prevTabs) => {
        const tab = prevTabs.find((t) => t.id === tabId);

        if (tab?.parentTabId && tab.linkedField) {
          const parentId = tab.parentTabId;
          const linkedField = tab.linkedField; // Extract to ensure TypeScript knows it's defined

          // Mettre à jour le titre dans updatedResources si disponible
          if (savedItemTitle) {
            setUpdatedResources((prev) => ({
              ...prev,
              [String(savedItemId)]: {
                title: savedItemTitle,
                // On pourrait aussi mettre à jour le thumbnail si on l'avait
              },
            }));
          }

          // Only add to pendingLinks if the tab was in create mode
          // In edit mode, the link already exists, so we don't need to add it again
          if (tab.mode === 'create') {
            // Ajouter le lien aux pendingLinks via setState (pas ref)
            // Cela va déclencher un re-render et passer les liens au parent
            setPendingLinksToPass((prev) => ({
              ...prev,
              [parentId]: [
                ...(prev[parentId] || []),
                {
                  linkedField,
                  resourceId: savedItemId,
                  resourceTitle: savedItemTitle,
                },
              ],
            }));
          }

          // Marquer le parent comme dirty et supprimer l'onglet enfant
          const newTabs = prevTabs.map((t) => (t.id === parentId ? { ...t, isDirty: true } : t)).filter((t) => t.id !== tabId);

          // Changer vers le parent
          setActiveTabId(parentId);

          return newTabs;
        }

        // Onglet principal qui vient de terminer une création
        if (tab && !tab.parentTabId && tab.mode === 'create') {
          // Si ouvert depuis un picker (nouvel onglet), notifier le parent et fermer
          const pickerParams = new URLSearchParams(window.location.search);
          if (pickerParams.get('fromPicker') === '1' && window.opener) {
            window.opener.postMessage(
              { type: 'RESOURCE_CREATED', id: savedItemId, title: savedItemTitle || `Item ${savedItemId}` },
              window.location.origin,
            );
            window.close();
            return prevTabs;
          }
          if (initialConfig.formOnly) {
            navigationUrl = monEspacePath;
          } else {
            const resourceUrl = getResourceUrl(initialConfig.type || '', savedItemId);
            navigationUrl = `${resourceUrl}?mode=edit`;
          }
        }

        return prevTabs;
      });

      if (navigationUrl) {
        navigate(navigationUrl);
      }
    },
    [navigate, initialConfig.type, initialConfig.formOnly, monEspacePath],
  );

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    tabId: string | null;
  }>({
    isOpen: false,
    tabId: null,
  });

  const performCloseTab = useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        if (prevTabs.length === 1) {
          return prevTabs;
        }

        const currentIndex = prevTabs.findIndex((t) => t.id === tabId);
        const newTabs = prevTabs.filter((t) => t.id !== tabId);

        if (activeTabId === tabId && newTabs.length > 0) {
          const newActiveIndex = Math.min(currentIndex, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
        }

        return newTabs;
      });
      setConfirmConfig({ isOpen: false, tabId: null });
    },
    [activeTabId],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);

      if (tabs.length === 1) {
        return;
      }

      if (tab?.isDirty) {
        setConfirmConfig({ isOpen: true, tabId });
        return;
      }

      performCloseTab(tabId);
    },
    [tabs, performCloseTab],
  );

  const handleDirtyChange = useCallback((tabId: string, isDirty: boolean) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      // Éviter les mises à jour inutiles si la valeur n'a pas changé
      if (tab && tab.isDirty === isDirty) {
        return prev;
      }
      return prev.map((t) => (t.id === tabId ? { ...t, isDirty } : t));
    });
  }, []);

  // État pour passer les pendingLinks de manière contrôlée
  // On ne passe les liens qu'une seule fois quand on switch vers le tab parent
  const [pendingLinksToPass, setPendingLinksToPass] = useState<Record<string, { linkedField: string; resourceId: string | number; resourceTitle?: string }[]>>({});
  
  // État pour passer les mises à jour des ressources (titre, thumbnail)
  const [updatedResources, setUpdatedResources] = useState<Record<string, { title?: string; thumbnail?: string }>>({});

  const clearPendingLinks = useCallback((tabId: string) => {
    setPendingLinksToPass((prev) => {
      if (!prev[tabId]) return prev;
      const newState = { ...prev };
      delete newState[tabId];
      return newState;
    });
  }, []);

  // Créer des callbacks stables pour chaque tab en utilisant useMemo
  // Cela évite de recréer les callbacks à chaque render
  const tabCallbacksMap = useMemo(() => {
    const map: Record<
      string,
      {
        onSaveComplete: (savedId: string | number, savedTitle?: string) => void;
        onDirtyChange: (isDirty: boolean) => void;
        onPendingLinksProcessed: () => void;
        onSave?: (data: any) => Promise<void>;
        onCancel?: () => void;
      }
    > = {};
    
    tabs.forEach((tab) => {
      // Déterminer la config simplifiée correspondante pour générer le handleSave
      let simplifiedConfig: any = null;
      
      // Essayer de trouver la config simplifiée source via templateId (plus robuste qu'une comparaison par référence)
      const templateId = tab.config.resourceTemplateId;
      if (templateId && TEMPLATE_ID_TO_SIMPLIFIED[templateId]) {
        simplifiedConfig = TEMPLATE_ID_TO_SIMPLIFIED[templateId];
      }
      
      let onSaveHandler: ((data: any) => Promise<void>) | undefined = undefined;
      
      if (simplifiedConfig) {
        // Créer le handler de sauvegarde
        const saveHandler = createHandleSave(simplifiedConfig);
        onSaveHandler = async (data: any) => {
          if (tab.itemId) {
            await saveHandler(data, tab.itemId);
          }
        };
      }

      // Déterminer le comportement d'annulation
      let onCancelHandler: (() => void) | undefined = undefined;
      
      if (tab.parentTabId) {
        // Cas 1: Onglet enfant -> Fermer l'onglet
        onCancelHandler = () => handleCloseTab(tab.id);
      } else if (tab.mode === 'create') {
        // Cas 2: Onglet principal en création
        // Si ouvert depuis un picker (nouvel onglet), fermer l'onglet; sinon retour arrière
        onCancelHandler = () => {
          const pickerParams = new URLSearchParams(window.location.search);
          if (pickerParams.get('fromPicker') === '1' && window.opener) {
            window.close();
          } else if (tab.config.formOnly) {
            navigate(monEspacePath);
          } else {
            navigate(-1);
          }
        };
      } else if (tab.mode === 'edit' && tab.config.formOnly) {
        // Cas 3: form-only en édition → Mon espace (pas de page vue)
        onCancelHandler = () => navigate(monEspacePath);
      }
      // Autres éditions → GenericDetailPage repasse en mode view

      map[tab.id] = {
        onSaveComplete: (savedId: string | number, savedTitle?: string) => handleSaveComplete(tab.id, savedId, savedTitle),
        onDirtyChange: (isDirty: boolean) => handleDirtyChange(tab.id, isDirty),
        onPendingLinksProcessed: () => clearPendingLinks(tab.id),
        onSave: onSaveHandler,
        onCancel: onCancelHandler,
      };
    });
    return map;
  }, [tabs, handleSaveComplete, handleDirtyChange, clearPendingLinks, handleCloseTab, navigate, monEspacePath]);

  const getLinkLabel = (resourceType: string): string => getResourceLinkSaveLabel(resourceType);

  const getResourceTree = (tabId: string): { root: string; children: { title: string; isActive: boolean }[] } | undefined => {
    const activeTab = tabs.find((t) => t.id === tabId);
    if (!activeTab) return undefined;

    // Remonter jusqu'à la racine
    let root: InternalTab = activeTab;
    while (root.parentTabId) {
      const parent = tabs.find((t) => t.id === root.parentTabId);
      if (!parent) break;
      root = parent;
    }

    // Enfants directs de la racine
    const children = tabs.filter((t) => t.parentTabId === root.id);
    if (children.length === 0) return undefined;

    return {
      root: root.title,
      children: children.map((t) => ({ title: t.title, isActive: t.id === tabId })),
    };
  };

  const getParentResourceContext = (tab: InternalTab) => {
    if (!tab.parentTabId) return undefined;
    const parent = tabs.find((t) => t.id === tab.parentTabId);
    if (!parent?.itemId) return undefined;
    return {
      id: parent.itemId,
      title: updatedResources[String(parent.itemId)]?.title,
    };
  };

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const callbacks = tabCallbacksMap[tab.id];
        const parentResource = getParentResourceContext(tab);

        // Ne rendre que les tabs qui ont été activés au moins une fois
        if (!tab.hasBeenActivated) {
          return null;
        }

        return (
          <div key={tab.id} style={isActive ? undefined : { display: 'none' }}>
            <GenericDetailPage
              config={tab.config}
              initialMode={tab.mode}
              itemId={tab.itemId}
              onCreateNewResource={handleCreateNewResource}
              onEditResource={handleEditResource}
              onSave={callbacks?.onSave}
              onCancel={callbacks?.onCancel}
              onSaveComplete={callbacks?.onSaveComplete}
              onDirtyChange={callbacks?.onDirtyChange}
              pendingLinks={isActive ? pendingLinksToPass[tab.id] : undefined}
              updatedResources={isActive ? updatedResources : undefined}
              onPendingLinksProcessed={callbacks?.onPendingLinksProcessed}
              saveLabel={tab.parentTabId && tab.mode === 'create' ? getLinkLabel(tab.config.type || '') : undefined}
              resourceTree={tab.parentTabId ? getResourceTree(tab.id) : undefined}
              parentResourceId={parentResource?.id}
              parentResourceTitle={parentResource?.title}
            />
          </div>
        );
      })}

      <AlertModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, tabId: null })}
        title="Fermer l'onglet"
        description="Cette ressource a des modifications non sauvegardées. Voulez-vous vraiment fermer cet onglet ?"
        type="warning"
        confirmLabel="Fermer"
        onConfirm={() => confirmConfig.tabId && performCloseTab(confirmConfig.tabId)}
      />
    </>
  );
};

export default StudentFormWrapper;
