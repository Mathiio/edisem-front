import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getAllItems } from '@/services/Items';

import { motion, Variants } from 'framer-motion';
import ZoomControl from '@/components/features/datavisualisation/ZoomControl';

import { compareValues, FilterGroup, getDataByType, getPropertyValue, storeSearchHistory, NodePosition } from '@/components/features/datavisualisation/FilterPopup';
import VisualFilterOverlay, { VISUAL_TYPES, OverlayState } from '@/components/features/datavisualisation/VisualFilterOverlay';
import TypeFilterDropdown from '@/components/features/datavisualisation/TypeFilterDropdown';
import HeaderImportButton from '@/components/features/datavisualisation/HeaderImportButton';
import HeaderExportButton from '@/components/features/datavisualisation/HeaderExportButton';
import { getLinksFromType } from '@/services/Links';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  useDisclosure,
  Breadcrumbs,
  BreadcrumbItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Slider,
  Select,
  SelectItem,
} from '@heroui/react';
import { ArrowIcon, SearchIcon } from '@/components/ui/icons';
import { SidebarProvider, useSidebar } from '@/components/ui/AppSidebar';
import { PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight, LibraryBig, Settings, Construction } from 'lucide-react';
import SearchHistory from '@/components/features/datavisualisation/SearchHistory';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { EditModal } from '@/components/features/database/EditModal';
import { useLocalStorageProperties } from '@/hooks/useLocalStorageProperties';
import { Layouts } from '@/components/layout/Layouts';
import { BGPattern } from '@/components/ui/bg-pattern';

// Nouveaux composants extraits
import { DatavisSidebar } from './visualisation/components/DatavisSidebar';
import { CahiersView } from './visualisation/components/CahiersView';
import { RadialClusterView } from './visualisation/components/RadialClusterView';
import { RecitsClusterView } from './visualisation/components/RecitsClusterView';
import { getConfigKey, getImageForType, getRadiusForType, getSizeForType } from './visualisation/utils/nodeHelpers';

// Configuration des couleurs et labels pour les types de relations
const RELATION_CONFIG: Record<string, { color: string; label: string }> = {
  // Relations impliquant des actants
  'actant-colloque': { color: '#FF6B6B', label: 'intervient dans' },
  'actant-seminaire': { color: '#FF6B6B', label: 'intervient dans' },
  'actant-journee_etudes': { color: '#FF6B6B', label: 'intervient dans' },
  'actant-citation': { color: '#4ECDC4', label: 'cité par' },
  'actant-keyword': { color: '#95E1D3', label: 'associé à' },
  'actant-bibliography': { color: '#F38181', label: 'auteur de' },
  'actant-mediagraphie': { color: '#F38181', label: 'auteur de' },
  'actant-university': { color: '#AA96DA', label: 'affilié à' },
  'actant-laboratory': { color: '#AA96DA', label: 'affilié à' },
  'actant-doctoralschool': { color: '#AA96DA', label: 'affilié à' },

  // Relations impliquant des conférences
  'colloque-keyword': { color: '#FFE66D', label: 'traite de' },
  'colloque-citation': { color: '#4ECDC4', label: 'contient' },
  'colloque-bibliography': { color: '#C9B1FF', label: 'référence' },
  'colloque-mediagraphie': { color: '#C9B1FF', label: 'référence' },
  'colloque-collection': { color: '#88D8B0', label: 'fait partie de' },

  'seminaire-keyword': { color: '#FFE66D', label: 'traite de' },
  'seminaire-citation': { color: '#4ECDC4', label: 'contient' },
  'seminairere-bibliography': { color: '#C9B1FF', label: 'référence' },
  'seminaire-mediagraphie': { color: '#C9B1FF', label: 'référence' },
  'seminaire-collection': { color: '#88D8B0', label: 'fait partie de' },

  'journee_etudes-keyword': { color: '#FFE66D', label: 'traite de' },
  'journee_etudes-citation': { color: '#4ECDC4', label: 'contient' },
  'journee_etudes-bibliography': { color: '#C9B1FF', label: 'référence' },
  'journee_etudes-mediagraphie': { color: '#C9B1FF', label: 'référence' },
  'journee_etudes-collection': { color: '#88D8B0', label: 'fait partie de' },

  // Relations impliquant des mots-clés
  'keyword-citation': { color: '#95E1D3', label: 'associé à' },
  'keyword-bibliography': { color: '#95E1D3', label: 'associé à' },
  'keyword-mediagraphie': { color: '#95E1D3', label: 'associé à' },

  // Relations impliquant des citations
  'citation-bibliography': { color: '#FFEAA7', label: 'extrait de' },
  'citation-mediagraphie': { color: '#FFEAA7', label: 'extrait de' },

  // Relations institutionnelles
  'university-laboratory': { color: '#DDA0DD', label: 'héberge' },
  'university-doctoralschool': { color: '#DDA0DD', label: 'héberge' },

  // Défaut
  default: { color: 'hsl(var(--heroui-c6))', label: 'lié à' },
};

// Fonction pour obtenir la configuration d'une relation
const getRelationConfig = (sourceType: string, targetType: string): { color: string; label: string } => {
  // Essayer dans les deux sens
  const key1 = `${sourceType}-${targetType}`;
  const key2 = `${targetType}-${sourceType}`;

  if (RELATION_CONFIG[key1]) {
    return RELATION_CONFIG[key1];
  }
  if (RELATION_CONFIG[key2]) {
    // Inverser le label si on utilise la relation inverse
    const config = RELATION_CONFIG[key2];
    return { color: config.color, label: config.label };
  }

  return RELATION_CONFIG['default'];
};

// Composants Analytics
import { CoverageMatrix } from './visualisation/components/analytics/CoverageMatrix';
import { ActivityHeatmap } from './visualisation/components/analytics/ActivityHeatmap';
import { Dashboard, type DashboardView } from './visualisation/components/analytics/Dashboard';

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};

export interface GeneratedImage {
  dataUrl: string;
  width: number;
  height: number;
}

// Header unifié qui s'étend sur toute la largeur (sidebar + zone principale)
// Composant boutons navigation
const NavigationButtons = ({ canGoBack, canGoForward, onBack, onForward }: { canGoBack: boolean; canGoForward: boolean; onBack: () => void; onForward: () => void }) => {
  return (
    <div className='flex items-center bg-c1  rounded-lg'>
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 p-2 ${
          canGoBack ? 'text-c5 hover:text-c6 hover:bg-c3 cursor-pointer' : 'text-c4/30 cursor-not-allowed'
        }`}>
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 p-2 ${
          canGoForward ? 'text-c5 hover:text-c6 hover:bg-c3 cursor-pointer' : 'text-c4/30 cursor-not-allowed'
        }`}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

interface UnifiedHeaderProps {
  nodeCount: number;
  breadcrumb?: React.ReactNode;
  filterDropdown?: React.ReactNode;
  rightActions?: React.ReactNode;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  showNavigationButtons?: boolean;
}

const UnifiedHeader = ({
  nodeCount,
  breadcrumb,
  filterDropdown,
  rightActions,
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
  showNavigationButtons = false,
}: UnifiedHeaderProps) => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div className='flex items-center w-full h-[62px] border-b-2 border-c3 bg-c2 shadow-[inset_0_0px_15px_rgba(255,255,255,0.03)]'>
      {/* Partie Sidebar */}
      <div
        className={`flex items-center justify-between px-4 border-r-2 border-c3 h-full transition-all ease-in-out duration-300 ${
          isCollapsed ? 'w-[72px] min-w-[72px]' : 'w-[280px] min-w-[280px]'
        }`}>
        {!isCollapsed && <p className='text-c6'>Datavisualisation</p>}
        <button onClick={toggleSidebar} className='p-2 rounded-md text-c5 hover:text-c6 hover:bg-c3 transition-all ease-in-out duration-200'>
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Partie zone principale */}
      <div className='flex-1 flex items-center justify-between px-4 h-full'>
        <div className='flex items-center gap-3'>
          {showNavigationButtons && <NavigationButtons canGoBack={canGoBack} canGoForward={canGoForward} onBack={onBack || (() => {})} onForward={onForward || (() => {})} />}
          {breadcrumb}
        </div>
        <div className='flex items-center gap-2.5'>
          {rightActions}
          {filterDropdown}
          {nodeCount > 0 && <span className='text-sm text-c4'>{nodeCount} noeuds</span>}
        </div>
      </div>
    </div>
  );
};

// Fonction helper pour obtenir l'URL de la page capsule selon le type
const getNodePageUrl = (type: string, id: string | number): string | null => {
  switch (type) {
    case 'actant':
      return `/intervenant/${id}`;
    case 'colloque':
      return `/corpus/colloques/conference/${id}`;
    case 'seminaire':
      return `/corpus/seminaires/conference/${id}`;
    case 'journee_etudes':
      return `/corpus/journees-etudes/conference/${id}`;
    default:
      return null; // Pas de page capsule pour ce type
  }
};

const Visualisation = () => {
  const navigate = useNavigate();
  const [itemsDataviz, setItemsDataviz] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filteredNodes, setFilteredNodes] = useState<any[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<any[]>([]);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeView, setActiveView] = useState<'datavis' | 'cahiers' | 'radialTree' | 'oeuvres' | 'coverageMatrix' | 'activityHeatmap' | 'dashboard'>('oeuvres');
  const [dashboardView, setDashboardView] = useState<DashboardView>('overview');
  const [coverageTopKeywords, setCoverageTopKeywords] = useState(200);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [heatmapAvailableYears] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  });

  // Navigation overlay interne (étapes dans l'overlay)
  const [overlayNav, setOverlayNav] = useState<{ canGoBack: boolean; canGoForward: boolean; onBack: () => void; onForward: () => void }>({
    canGoBack: false,
    canGoForward: false,
    onBack: () => {},
    onForward: () => {},
  });

  // Historique de navigation global (overlay <-> canvas)
  const [navigationHistory, setNavigationHistory] = useState<Array<{ showOverlay: boolean; overlayStep?: string }>>([{ showOverlay: true }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // État de l'overlay pour restauration
  const [overlayState, setOverlayState] = useState<OverlayState | undefined>(undefined);

  // Navigation globale back/forward
  const globalCanGoBack = showOverlay ? overlayNav.canGoBack : historyIndex > 0;
  const globalCanGoForward = showOverlay ? overlayNav.canGoForward : historyIndex < navigationHistory.length - 1;

  const handleGlobalBack = useCallback(() => {
    if (showOverlay) {
      // Si on est dans l'overlay, utiliser la navigation interne de l'overlay
      overlayNav.onBack();
    } else if (historyIndex > 0) {
      // Si on est sur le canvas, revenir à l'overlay
      setHistoryIndex((prev) => prev - 1);
      setShowOverlay(true);
    }
  }, [showOverlay, overlayNav, historyIndex]);

  const handleGlobalForward = useCallback(() => {
    if (showOverlay) {
      // Si on est dans l'overlay, utiliser la navigation interne de l'overlay
      overlayNav.onForward();
    } else if (historyIndex < navigationHistory.length - 1) {
      // Aller vers l'avant dans l'historique
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setShowOverlay(navigationHistory[nextIndex].showOverlay);
    }
  }, [showOverlay, overlayNav, historyIndex, navigationHistory]);

  const resetActiveIconFunc = useRef<(() => void) | null>(null);
  const [exportEnabled, setExportEnabled] = useState(false);
  const [searchParams] = useSearchParams();

  const [currentItemUrl, setCurrentItemUrl] = useState('');
  const [selectedConfigKey, setSelectedConfigKey] = useState<string | null>(null);
  const [, setSelectedConfig] = useState<string | null>(null);
  const { itemPropertiesData, propertiesLoading } = useLocalStorageProperties();

  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure();
  const { isOpen: isOpenDrawer, onOpenChange: onOpenChangeDrawer } = useDisclosure();
  const { isOpen: _isOpenAnnote, onOpen: onOpenAnnote, onClose: _onCloseAnnote } = useDisclosure();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [isAnnoteMode, setisAnnoteMode] = useState(false);

  const [viewAnnotationMode, setviewAnnotationMode] = useState(false);

  const [_firstSelectedNode, setFirstSelectedNode] = useState<any>(null);
  const [_secondSelectedNode, setSecondSelectedNode] = useState<any>(null);
  const [overlayBreadcrumb, setOverlayBreadcrumb] = useState<React.ReactNode>(null);
  const [visibleTypes, setVisibleTypes] = useState<string[]>([]);
  const [typesInUse, setTypesInUse] = useState<string[]>([]);
  const [searchedTypes, setSearchedTypes] = useState<string[]>([]);
  const [lastSearchInfo, setLastSearchInfo] = useState<{ groups: FilterGroup[]; isImport?: boolean } | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [noResultsFound, setNoResultsFound] = useState(false);

  // Positions des nodes à restaurer (depuis l'historique ou l'import)
  // Utiliser useRef au lieu de useState pour éviter les re-renders en cascade
  const pendingNodePositionsRef = useRef<NodePosition[]>([]);
  // Référence aux nodes actuels de la simulation pour pouvoir capturer leurs positions
  const simulationNodesRef = useRef<any[]>([]);


  const [_annoteObject, setAnnoteObject] = useState({
    id: '',
    content: '',
    type: '',
  });

  const linkModeRef = useRef({
    isSelecting: false,
    firstNode: null as any,
    secondNode: null as any,
    firstNodeCoords: null as any,
    secondNodeCoords: null as any,
  });

  const handleEditModeChange = useCallback((isActive: boolean) => {
    setIsEditMode(isActive);
  }, []);

  const handleLinkModeChange = useCallback((isActive: boolean) => {
    setIsLinkMode(isActive);
  }, []);

  const handleAnnoteModeChange = useCallback((isActive: boolean) => {
    setisAnnoteMode(isActive);
  }, []);

  // Navigation simple entre vues
  const navigateToView = useCallback(
    (view: 'datavis' | 'cahiers' | 'radialTree' | 'oeuvres' | 'coverageMatrix' | 'activityHeatmap' | 'dashboard') => {
      if (view !== activeView) {
        setActiveView(view);
      }
    },
    [activeView],
  );

  // Gestionnaire de clic sur un nœud
  const handleNodeClick = (d: any) => {
    console.log('Nœud cliqué:', d);

    // En mode normal (pas édition, pas liaison, pas annotation) → rediriger vers la page capsule si disponible
    if (!isEditMode && !isLinkMode && !isAnnoteMode) {
      const pageUrl = getNodePageUrl(d.type, d.id);
      if (pageUrl) {
        navigate(pageUrl);
        return;
      }
    }

    // Sinon, comportement par défaut : ouvrir le modal d'édition/visualisation
    const apiBase = 'https://tests.arcanes.ca/omk/api/';
    const itemUrl = `${apiBase}items/${d.id}`;
    setCurrentItemUrl(itemUrl);
    setSelectedConfigKey(getConfigKey(d.type));
    setSelectedConfig(d.type);
    onOpenEdit();

    // Gestion du mode liaison
    if (isLinkMode) {
      if (!linkModeRef.current.isSelecting) {
        // Premier nœud sélectionné
        console.log('Sélection du premier nœud:', d);
        linkModeRef.current.firstNode = d;
        linkModeRef.current.isSelecting = true;

        // Nettoyer tous les éléments de sélection précédents
        d3.select(svgRef.current).selectAll('.node-animated-circle').remove();
        d3.select(svgRef.current).selectAll('.temp-link').remove();

        // Ajouter le cercle animé au premier nœud
        addAnimatedCircleToNode(d);
        setFirstSelectedNode(d);
      } else {
        // Vérification que c'est bien un nœud différent
        const firstId = linkModeRef.current.firstNode?.id;
        const currentId = d?.id;

        if (firstId && currentId && firstId !== currentId) {
          console.log('Sélection du deuxième nœud:', d);
          linkModeRef.current.secondNode = d;
          setSecondSelectedNode(d);

          // IMPORTANT: Supprimer TOUS les cercles animés existants avant d'ajouter les nouveaux
          d3.select(svgRef.current).selectAll('.node-animated-circle').remove();

          // Re-ajouter le cercle au premier nœud
          addAnimatedCircleToNode(linkModeRef.current.firstNode);

          // Ajouter le cercle au deuxième nœud
          addAnimatedCircleToNode(d);

          // Supprimer la ligne temporaire
          d3.select(svgRef.current).select('.temp-link').remove();
        } else {
          console.log('Même nœud sélectionné ou données invalides, opération ignorée');
          // Annuler la sélection si on reclique sur le même nœud
          d3.select(svgRef.current).selectAll('.temp-link').remove();
          d3.select(svgRef.current).selectAll('.node-animated-circle').remove();
          d3.select(svgRef.current).on('mousemove', null);

          linkModeRef.current.isSelecting = false;
          linkModeRef.current.firstNode = null;
          linkModeRef.current.secondNode = null;
          setFirstSelectedNode(null);
          setSecondSelectedNode(null);
        }
      }
    }
    if (isAnnoteMode) {
      setAnnoteObject({
        id: d.id,
        content: d.fullTitle, // Assurez-vous que cela correspond à ce que vous voulez
        type: d.type,
      });

      onOpenAnnote();
    }
  };

  // Fonction helper pour ajouter un cercle animé à un nœud
  const addAnimatedCircleToNode = (node: any) => {
    const validTypes = ['keyword', 'university', 'school', 'laboratory', 'colloque', 'seminaire', 'journee_etudes', 'citation', 'actant'];

    if (!validTypes.includes(node.type)) return;

    d3.select(svgRef.current)
      .selectAll('.node-circle')
      .filter((n: any) => n && n.id === node.id)
      .each(function () {
        const circle = d3.select(this as SVGCircleElement);
        const parent = d3.select((this as SVGCircleElement).parentNode as SVGGElement);

        const r = parseFloat(circle.attr('r')) || 10;
        const cx = parseFloat(circle.attr('cx')) || 0;
        const cy = parseFloat(circle.attr('cy')) || 0;

        parent
          .append('circle')
          .attr('class', 'node-animated-circle')
          .attr('r', r)
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('fill', 'none')
          .attr('stroke', 'white')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', '32 24')
          .style('pointer-events', 'none')
          .style('animation', 'spin 10s linear infinite');
      });
  };

  // Réinitialiser les états quand le mode lien est désactivé
  useEffect(() => {
    if (!isLinkMode) {
      linkModeRef.current.isSelecting = false;
      linkModeRef.current.firstNode = null;
      linkModeRef.current.secondNode = null;
      setFirstSelectedNode(null);
      setSecondSelectedNode(null);

      // Réinitialiser les effets visuels
      d3.select(svgRef.current).selectAll('.node-circle').attr('stroke', null).attr('stroke-width', null);
    }
  }, [isLinkMode]);

  // Fonction pour capturer les positions actuelles des nodes
  const getNodePositions = useCallback((): NodePosition[] => {
    return simulationNodesRef.current.map((node) => ({
      id: node.id,
      x: node.x ?? 0,
      y: node.y ?? 0,
      fx: node.fx ?? null,
      fy: node.fy ?? null,
    }));
  }, []);

  const [dimensions, setDimensions] = useState({
    width: 1450,
    height: 1080,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const data = await getAllItems();
        setItemsDataviz(data);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleExportClick = async () => {
    try {
      const image = await generateVisualizationImage();
      setGeneratedImage(image);
      return image;
    } catch (error) {
      console.error('Error generating visualization image:', error);
      throw error;
    }
  };

  const applyFiltersAndPrepareVisualization = async (groups: FilterGroup[]) => {
    console.log('Début de filtrage avec groupes:', groups);
    console.log('itemsDataviz chargés:', itemsDataviz?.length || 0, 'items');

    if (!groups || groups.length === 0) {
      console.warn('Aucun groupe de filtres fourni');
      return {
        allFilteredItems: [],
        groupResults: new Map(),
        typesInUse: [],
        visualizationData: { nodes: [], links: [] },
      };
    }

    const allFilteredItems: any[] = [];
    const groupResults: Map<string, any[]> = new Map();

    // Phase 1: Filtrer les éléments par groupe
    for (const group of groups) {
      if (!group.itemType) {
        console.warn("Groupe sans type d'item spécifié:", group);
        continue;
      }

      //console.log(`Traitement du groupe: ${group.name}, type: ${group.itemType}`);

      try {
        const items = await getDataByType(group.itemType);
        //console.log(`${items.length} items récupérés pour le type ${group.itemType}`);

        const groupFilteredItems = [];

        for (const item of items) {
          let matchesAllConditions = true;

          for (const condition of group.conditions) {
            if (!condition.property || condition.value === undefined || condition.value === null) {
              console.log('Condition incomplète ignorée:', condition);
              continue;
            }

            try {
              const itemValue = await getPropertyValue(item, condition.property);
              //console.log(`Comparaison: ${itemValue} ${condition.operator} ${condition.value}`);
              const matches = await compareValues(itemValue, condition.value, condition.operator);

              if (!matches) {
                matchesAllConditions = false;
                break;
              }
            } catch (error) {
              console.error('Erreur lors du traitement de la condition:', error);
              matchesAllConditions = false;
              break;
            }
          }

          if (matchesAllConditions) {
            try {
              const links = await getLinksFromType(item, group.itemType);
              const title = item.title || (await getPropertyValue(item, 'title')) || 'Sans titre';

              //console.log(`Item correspondant trouvé: ${title} (${item.id})`);

              const resultItem = {
                id: item.id,
                type: group.itemType,
                title,
                links,
                groupId: group.name,
              };

              groupFilteredItems.push(resultItem);
              allFilteredItems.push(resultItem);
            } catch (error) {
              console.error("Erreur lors de l'ajout de l'item au résultat:", error);
            }
          }
        }

        //console.log(`${groupFilteredItems.length} items filtrés pour le groupe ${group.name}`);

        // Stocker les résultats de ce groupe spécifique
        const groupId = group.name;
        groupResults.set(groupId, groupFilteredItems);
      } catch (error) {
        console.error(`Erreur lors du traitement du groupe ${group.name}:`, error);
      }
    }

    //console.log(`Total d'items filtrés: ${allFilteredItems.length}`);

    if (allFilteredItems.length === 0) {
      console.warn('Aucun item ne correspond aux critères de filtrage');
      return {
        allFilteredItems: [],
        groupResults,
        typesInUse: [],
        visualizationData: { nodes: [], links: [] },
      };
    }

    // Phase 2: Construire la visualisation à partir des éléments filtrés
    //console.log('Début de la construction de la visualisation');

    const CHARACTER_LIMIT = 10;
    const nodes = new Map();
    const links = new Set();
    const typesInUse = new Set<string>();

    // Plus besoin de normaliser les types car colloque, seminaire, journee_etudes sont maintenant des types à part entière
    const normalizeType = (type: string) => {
      return type;
    };

    // Créer une map des groupes pour un accès facile
    const groupsMap = new Map<string, FilterGroup>();
    groups.forEach((group) => groupsMap.set(group.name, group));

    // Ajouter d'abord tous les nœuds principaux (résultats directs de la recherche)
    allFilteredItems.forEach((item) => {
      const group = groupsMap.get(item.groupId);
      const normalizedItemType = normalizeType(item.type);
      if (!group || !group.visibleTypes?.includes(normalizedItemType)) {
        return;
      }

      if (!nodes.has(item.id)) {
        let title = item.title || 'Sans titre';
        if (item.type === 'actant' && title.includes(' ')) {
          const [firstName, ...lastName] = title.split(' ');
          title = `${firstName.charAt(0)}. ${lastName.join(' ')}`;
        }

        nodes.set(item.id, {
          id: item.id,
          title: title.length > CHARACTER_LIMIT ? `${title.substring(0, CHARACTER_LIMIT)}...` : title,
          fullTitle: title,
          type: item.type,
          isMain: true,
          groupId: item.groupId,
        });

        typesInUse.add(normalizedItemType);
        //console.log(`Nœud principal ajouté: ${title} (${item.id})`);
      }
    });

    //console.log(`${nodes.size} nœuds principaux ajoutés`);

    // Pour chaque item filtré, ajouter ses liens selon les types visibles de son groupe
    allFilteredItems.forEach((item) => {
      if (!item.links || !Array.isArray(item.links)) {
        return;
      }

      const group = groupsMap.get(item.groupId);
      if (!group) {
        return;
      }

      //console.log(`Traitement des liens pour ${item.id}, ${item.links.length} liens trouvés`);

      item.links.forEach((linkedId: string) => {
        if (!linkedId) {
          console.warn('ID de lien invalide détecté');
          return;
        }

        let linkedItem;

        // Convertir linkedId en string pour la comparaison (peut être number ou string)
        const linkedIdStr = String(linkedId);

        // Essayer de trouver l'item lié dans itemsDataviz
        if (itemsDataviz && Array.isArray(itemsDataviz)) {
          linkedItem = itemsDataviz.find((d) => String(d.id) === linkedIdStr);
        }

        // Si pas trouvé et que l'ID est dans nos résultats filtrés, utiliser celui-ci
        if (!linkedItem) {
          linkedItem = allFilteredItems.find((d) => String(d.id) === linkedIdStr);
        }

        if (!linkedItem) {
          console.warn(`Item lié non trouvé: ${linkedId}`);
          return;
        }

        // Vérifier si le type de l'élément lié est visible dans le groupe de l'item principal
        const normalizedType = linkedItem.type;

        if (!linkedItem.type || !group.visibleTypes.includes(normalizedType)) {
          return;
        }

        // Ici, nous ne filtrons plus en fonction de l'appartenance au groupe,
        // seulement en fonction du type visible
        if (!nodes.has(linkedId)) {
          let linkedTitle = linkedItem.title || 'Sans titre';
          if (linkedItem.type === 'actant' && linkedTitle.includes(' ')) {
            const [firstName, ...lastName] = linkedTitle.split(' ');
            linkedTitle = `${firstName.charAt(0)}. ${lastName.join(' ')}`;
          }

          nodes.set(linkedId, {
            id: linkedId,
            fullTitle: linkedTitle,
            title: linkedTitle.length > CHARACTER_LIMIT ? `${linkedTitle.substring(0, CHARACTER_LIMIT)}...` : linkedTitle,
            type: linkedItem.type,
            // Si l'élément lié est un résultat principal d'un autre groupe, marquer comme principal
            isMain: allFilteredItems.some((fi) => fi.id === linkedId),
            parentNodeId: item.id,
            // Conserver le groupe d'origine s'il existe, sinon utiliser le groupe parent
            groupId: linkedItem.groupId || item.groupId,
          });

          typesInUse.add(normalizedType);
          //console.log(`Nœud lié ajouté: ${linkedTitle} (${linkedId})`);
        }

        const linkObject = JSON.stringify({
          source: item.id,
          target: linkedId,
          sourceType: item.type,
          targetType: linkedItem.type,
          groupId: item.groupId,
        });

        links.add(linkObject);
        //console.log(`Lien ajouté: ${item.id} -> ${linkedId}`);
      });
    });

    const nodesArray = Array.from(nodes.values());
    const linksArray = Array.from(links).map((link) => JSON.parse(link as string));

    //console.log(`Visualisation construite: ${nodesArray.length} nœuds, ${linksArray.length} liens`);
    // Mettre à jour l'état si nécessaire
    if (typeof setFilteredNodes === 'function') {
      setFilteredNodes(nodesArray);
    }
    if (typeof setFilteredLinks === 'function') {
      setFilteredLinks(linksArray);
    }
    if (typeof setExportEnabled === 'function') {
      setExportEnabled(true);
    }

    // Mettre à jour les types en usage et les types visibles
    const typesInUseArray = Array.from(typesInUse);
    console.log('Types in use:', typesInUseArray);
    setTypesInUse(typesInUseArray);

    // Récupérer les visibleTypes de la config importée (union de tous les groupes)
    const configVisibleTypes = groups.flatMap((g) => g.visibleTypes || []);
    const uniqueConfigVisibleTypes = [...new Set(configVisibleTypes)];

    // Utiliser les visibleTypes de la config, filtrés par les types réellement présents
    const finalVisibleTypes = uniqueConfigVisibleTypes.length > 0 ? typesInUseArray.filter((t) => uniqueConfigVisibleTypes.includes(t)) : typesInUseArray;

    console.log('Config visible types:', uniqueConfigVisibleTypes);
    console.log('Final visible types:', finalVisibleTypes);

    const searchedTypesArray = groups.map((g) => g.itemType).filter(Boolean);
    setSearchedTypes(searchedTypesArray);
    setVisibleTypes(finalVisibleTypes);

    // Stocker l'historique de recherche si la fonction existe
    if (typeof storeSearchHistory === 'function') {
      storeSearchHistory(groups);
    }

    const result = {
      allFilteredItems,
      groupResults,
      typesInUse: typesInUseArray,
      visualizationData: {
        nodes: nodesArray,
        links: linksArray,
      },
    };

    //console.log('Résultat final:', result);
    return result;
  };

  const handleSearch = async (groups: FilterGroup[]) => {
    setNoResultsFound(false);
    const res = await applyFiltersAndPrepareVisualization(groups);
    console.log(res);

    // Vérifier si la recherche n'a retourné aucun résultat
    if (res && res.visualizationData && res.visualizationData.nodes.length === 0) {
      setNoResultsFound(true);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps -- rendu D3 : dimensions / handlers utilisés dans la closure sans redessin systématique */
  useEffect(() => {
    if (!filteredNodes.length) return;
    clearSvg();
    const svg = d3.select(svgRef.current);
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    const defs = zoomGroup.append('defs');

    // Filtrer les nœuds selon les types visibles
    // Si typesInUse est défini (recherche effectuée), on filtre selon visibleTypes
    // Sinon on affiche tout (état initial)
    const displayedNodes = typesInUse.length > 0 ? filteredNodes.filter((node) => visibleTypes.includes(node.type)) : filteredNodes;

    // Filtrer les liens pour ne garder que ceux dont les deux extrémités sont visibles
    const displayedNodeIds = new Set(displayedNodes.map((n) => n.id));
    const displayedLinks = filteredLinks.filter((link: any) => displayedNodeIds.has(link.source) && displayedNodeIds.has(link.target));

    // Définitions des patterns pour les nœuds
    displayedNodes.forEach((node) => {
      const patternId = `node-pattern-${node.type}`;

      if (!defs.select(`#${patternId}`).node()) {
        defs
          .append('pattern')
          .attr('id', patternId)
          .attr('patternUnits', 'objectBoundingBox')
          .attr('width', 1)
          .attr('height', 1)
          .append('image')
          .attr('href', getImageForType(node.type))
          .attr('width', getRadiusForType(node.type))
          .attr('height', getRadiusForType(node.type))
          .attr('preserveAspectRatio', 'xMidYMid slice');
      }
    });

    // Créer des copies fraîches des nœuds pour la simulation
    // Restaurer les positions sauvegardées si disponibles (depuis la ref, pas le state)
    const pendingPositions = pendingNodePositionsRef.current;
    console.log('[D3 Effect] pendingNodePositions disponibles (ref):', pendingPositions.length);
    console.log('[D3 Effect] displayedNodes:', displayedNodes.length);

    const simulationNodes = displayedNodes.map((node: any) => {
      // Chercher une position sauvegardée pour ce node
      const savedPosition = pendingPositions.find((p) => String(p.id) === String(node.id));

      if (savedPosition) {
        console.log('[D3 Effect] Position trouvée pour node', node.id);
        // Restaurer les positions sauvegardées
        // On fixe TOUS les nodes à leurs positions sauvegardées pour préserver le layout
        return {
          ...node,
          x: savedPosition.x,
          y: savedPosition.y,
          fx: savedPosition.x, // Fixer à la position X sauvegardée
          fy: savedPosition.y, // Fixer à la position Y sauvegardée
        };
      }

      // Sinon, utiliser les positions par défaut
      return {
        ...node,
        x: node.x || dimensions.width / 2 + (Math.random() - 0.5) * 100,
        y: node.y || dimensions.height / 2 + (Math.random() - 0.5) * 100,
        fx: node.fx,
        fy: node.fy,
      };
    });

    // Sauvegarder la référence aux nodes pour pouvoir capturer leurs positions plus tard
    simulationNodesRef.current = simulationNodes;

    // Nettoyer les positions en attente après les avoir utilisées (dans la ref, pas de re-render)
    if (pendingPositions.length > 0) {
      console.log('[D3 Effect] Nettoyage des positions en attente (ref)');
      pendingNodePositionsRef.current = [];
    }

    // Créer des copies fraîches des liens avec référence directe aux objets nœuds
    const simulationLinks = displayedLinks.map((link: any) => {
      const sourceNode = simulationNodes.find((node: any) => node.id === link.source);
      const targetNode = simulationNodes.find((node: any) => node.id === link.target);
      const relationConfig = getRelationConfig(link.sourceType || sourceNode?.type, link.targetType || targetNode?.type);
      return {
        source: sourceNode,
        target: targetNode,
        sourceType: link.sourceType || sourceNode?.type,
        targetType: link.targetType || targetNode?.type,
        color: relationConfig.color,
        label: relationConfig.label,
      };
    });

    const simulation = d3
      .forceSimulation(simulationNodes as any)
      .force(
        'link',
        d3
          .forceLink(simulationLinks)
          .id((d: any) => d.id)
          .distance(300),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(100));

    // Créer un groupe pour le tooltip
    const tooltip = d3
      .select('body')
      .selectAll('.link-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'link-tooltip')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('font-family', 'Inter, sans-serif')
      .style('z-index', '9999')
      .style('opacity', '0')
      .style('transition', 'opacity 0.15s ease-in-out')
      .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)');

    // Créer les liens avec couleurs par type de relation
    const linkGroup = zoomGroup.append('g').attr('class', 'links-group');

    const link = linkGroup
      .selectAll('line')
      .data(simulationLinks)
      .join('line')
      .attr('stroke', (d: any) => d.color || 'hsl(var(--heroui-c6))')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .style('cursor', 'pointer')
      .on('mouseover', function (event: any, d: any) {
        // Augmenter l'opacité et l'épaisseur au survol
        d3.select(this).attr('stroke-width', 3).attr('stroke-opacity', 1);

        // Afficher le tooltip
        const sourceTitle = d.source?.fullTitle || d.source?.title || 'Source';
        const targetTitle = d.target?.fullTitle || d.target?.title || 'Cible';

        tooltip
          .html(
            `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${d.color}; display: inline-block;"></span>
              <span><strong>${sourceTitle}</strong> ${d.label} <strong>${targetTitle}</strong></span>
            </div>
          `,
          )
          .style('left', `${event.clientX + 15}px`)
          .style('top', `${event.clientY - 10}px`)
          .style('opacity', '1');
      })
      .on('mousemove', function (event: any) {
        tooltip.style('left', `${event.clientX + 15}px`).style('top', `${event.clientY - 10}px`);
      })
      .on('mouseout', function () {
        // Restaurer l'apparence normale
        d3.select(this).attr('stroke-width', 1.5).attr('stroke-opacity', 0.6);

        // Cacher le tooltip
        tooltip.style('opacity', '0');
      });

    // Créer des groupes de nœuds
    const nodeGroup = zoomGroup.append('g').selectAll('g').data(simulationNodes).join('g');

    // Ajouter le cercle principal à chaque groupe
    nodeGroup
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', (d: any) => getRadiusForType(d.type) / 2)
      .attr('fill', (d: any) => {
        const patternId = `node-pattern-${d.type}`;
        return `url(#${patternId})`;
      });

    // Ajouter le texte à l'intérieur du même groupe
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .text((d: any) => d.title)
      .attr('class', 'node-text')
      .attr('font-size', (d: any) => getSizeForType(d.type))
      .attr('fill', 'white')
      .attr('font-family', 'Inter, sans-serif')
      .style('user-select', 'none')
      .style('pointer-events', 'none');

    // Gestion du hover sur les groupes
    nodeGroup
      .on('mouseover', function (event, d) {
        const allowedTypes = ['keyword', 'university', 'school', 'laboratory', 'colloque', 'seminaire', 'journee_etudes', 'citation', 'actant'];

        // Afficher le tooltip avec le type et le titre
        const typeInfo = VISUAL_TYPES.find((t) => t.key === d.type);
        const typeLabel = typeInfo?.label || d.type;
        const typeImage = typeInfo?.image || '';
        const nodeTitle = d.fullTitle || d.title || 'Sans titre';

        tooltip
          .html(
            `
            <div style="display: flex; align-items: flex-start; gap: 10px; max-width: 300px;">
              ${typeImage ? `<img src="${typeImage}" alt="${typeLabel}" style="width: 32px; height: 32px; object-fit: contain; flex-shrink: 0;" />` : ''}
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="color: #888; font-size: 10px; text-transform: uppercase;">${typeLabel}</span>
                <span style="font-weight: 500; word-wrap: break-word; white-space: normal;">${nodeTitle}</span>
              </div>
            </div>
          `,
          )
          .style('left', `${event.clientX + 15}px`)
          .style('top', `${event.clientY - 10}px`)
          .style('opacity', '1');

        // Si le mode annotation est activé, filtrer les types autorisés
        if (
          (!isAnnoteMode && allowedTypes.includes(d.type)) ||
          (isAnnoteMode && ['mediagraphie', 'bibliography', 'citation', 'colloque', 'seminaire', 'journee_etudes'].includes(d.type))
        ) {
          const currentRadius = getRadiusForType(d.type) / 2;
          let offset = -2;

          let innerStrokeRadius;
          if (['keyword', 'university', 'school', 'laboratory'].includes(d.type)) {
            innerStrokeRadius = currentRadius * 0.72;
            offset = -2;
          } else if (['bibliography', 'mediagraphie', 'citation'].includes(d.type)) {
            innerStrokeRadius = currentRadius * 0.72;
            offset = -3;
          } else {
            innerStrokeRadius = currentRadius * 0.7;
            offset = -4;
          }

          let colorStroke = 'hsl(var(--heroui-c6))';
          if (isEditMode) colorStroke = 'hsl(var(--heroui-datavisOrange))';
          if (isLinkMode) colorStroke = 'hsl(var(--heroui-datavisBlue))';
          if (isAnnoteMode) colorStroke = 'hsl(var(--heroui-datavisYellow))';

          d3.select(this).attr('class', 'pointer-cursor');
          d3.select(this)
            .append('circle')
            .attr('class', 'inner-stroke')
            .attr('r', innerStrokeRadius)
            .attr('fill', 'none')
            .attr('stroke', colorStroke)
            .attr('stroke-width', 2)
            .attr('cy', offset)
            .attr('cursor', 'pointer');
        }
      })
      .on('mousemove', function (event) {
        tooltip.style('left', `${event.clientX + 15}px`).style('top', `${event.clientY - 10}px`);
      })
      .on('mouseout', function () {
        d3.select(this).selectAll('.inner-stroke').remove();
        tooltip.style('opacity', '0');
      })
      .on('click', function (_event, d) {
        const allowedTypes = ['keyword', 'university', 'school', 'laboratory', 'colloque', 'seminaire', 'journee_etudes', 'citation', 'actant'];

        if (
          (!isAnnoteMode && allowedTypes.includes(d.type)) ||
          (isAnnoteMode && ['mediagraphie', 'bibliography', 'citation', 'colloque', 'seminaire', 'journee_etudes'].includes(d.type))
        ) {
          handleNodeClick(d);
        }
      });

    // Configurer le drag sur les groupes
    const drag = d3
      .drag<SVGGElement, any>()
      .on('start', (event: any, d: any) => {
        if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: any, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: any) => {
        if (!event.active && simulation) simulation.alphaTarget(0);
        // Conserver les positions fixes après le drag pour maintenir la stabilité
        // C'est un choix de conception, vous pouvez aussi les remettre à null
        // pour permettre aux nœuds de continuer à bouger
      });

    nodeGroup.call(drag as any);

    simulation.on('tick', () => {
      // Mettre à jour les positions des liens basées directement sur les objets
      // simulationNodes qui sont mis à jour par la simulation
      link
        .attr('x1', (d: any) => d.source.x ?? 0)
        .attr('y1', (d: any) => d.source.y ?? 0)
        .attr('x2', (d: any) => d.target.x ?? 0)
        .attr('y2', (d: any) => d.target.y ?? 0);

      // Positionner les groupes de nœuds
      nodeGroup.attr('transform', (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Stocker la simulation dans le ref pour pouvoir y accéder depuis le ResizeObserver
    simulationRef.current = simulation;

    return () => {
      if (simulation) simulation.stop();
      simulationRef.current = null;
      // Nettoyer le tooltip
      d3.select('body').selectAll('.link-tooltip').remove();
    };
  }, [filteredNodes, filteredLinks, isEditMode, isLinkMode, isAnnoteMode, visibleTypes, typesInUse]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const generateVisualizationImage = async (): Promise<GeneratedImage> => {
    const svg = svgRef.current;
    console.log(svg);
    if (!svg) {
      throw new Error('SVG reference not found');
    }

    const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [];
    const width = viewBox[2] || svg.getBoundingClientRect().width;
    const height = viewBox[3] || svg.getBoundingClientRect().height;

    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

    const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    backgroundRect.setAttribute('width', '100%');
    backgroundRect.setAttribute('height', '100%');

    backgroundRect.setAttribute('fill', '#000');

    clonedSvg.insertBefore(backgroundRect, clonedSvg.firstChild);
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());

    const images = Array.from(clonedSvg.querySelectorAll('image'));
    await Promise.all(
      images.map((img) => {
        return new Promise<void>((resolve, reject) => {
          const href = img.getAttribute('href');
          if (!href) {
            reject(new Error('Image href not found'));
            return;
          }

          const imageElement = new Image();
          imageElement.onload = () => resolve();
          imageElement.onerror = () => reject(new Error('Failed to load image'));
          imageElement.src = href;
        });
      }),
    );

    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.scale(scale, scale);

      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/png');
      return { dataUrl, width, height };
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const saveFilterGroups = (filterGroups: FilterGroup[], nodePositions?: NodePosition[]): void => {
    try {
      // Sauvegarder les filtres et les positions ensemble
      const dataToSave = {
        filters: filterGroups,
        nodePositions: nodePositions || [],
      };
      const serializedData = JSON.stringify(dataToSave);
      localStorage.setItem('filterGroups', serializedData);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des filtres:', error);
    }
  };

  const handleOverlaySelect = (groups: FilterGroup[], isImport = false, nodePositions?: NodePosition[]) => {
    console.log('[handleOverlaySelect] nodePositions reçues:', nodePositions?.length || 0, nodePositions);

    // Si des positions sont fournies (depuis l'historique ou l'import), les stocker pour restauration
    if (nodePositions && nodePositions.length > 0) {
      console.log('[handleOverlaySelect] Stockage de', nodePositions.length, 'positions dans ref');
      pendingNodePositionsRef.current = nodePositions;
    } else {
      pendingNodePositionsRef.current = [];
    }

    // Lancer la recherche APRES avoir stocké les positions
    handleSearch(groups);

    // Sauvegarder les filtres (sans positions pour l'instant, elles seront ajoutées lors de l'export)
    saveFilterGroups(groups, nodePositions);

    // Ne pas stocker dans l'historique ici - on le fera lors de l'export/sauvegarde avec les positions
    // storeSearchHistory est appelé séparément quand l'utilisateur sauvegarde explicitement

    setLastSearchInfo({ groups, isImport });

    setShowOverlay(false);

    // Ajouter au historique de navigation (on passe de l'overlay au canvas)
    setNavigationHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, { showOverlay: false }];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  // Fonction pour revenir à l'overlay à une étape spécifique
  const navigateToOverlayStep = useCallback((step: 'type' | 'search' | 'advanced', selectedType?: string, importedGroups?: FilterGroup[]) => {
    console.log('navigateToOverlayStep called:', { step, selectedType, importedGroups });
    const newState: OverlayState = {
      step,
      selectedType: selectedType || null,
      searchValue: '',
      importedGroups,
    };
    console.log('Setting overlay state:', newState);
    setOverlayState(newState);
    setShowOverlay(true);
  }, []);

  // Fonction pour gérer l'import
  const handleImport = useCallback(
    (groups: FilterGroup[], nodePositions?: NodePosition[]) => {
      handleOverlaySelect(groups, true, nodePositions);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleOverlaySelect non mémoïsé volontairement
    [],
  );

  // Toggle un type visible/invisible
  const handleToggleVisibleType = (type: string) => {
    setVisibleTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const clearSvg = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
  };

  useEffect(() => {
    const configParam = searchParams.get('config');
    if (configParam) {
      try {
        const decoded = decodeURIComponent(configParam);
        const maybeStringifiedArray = JSON.parse(decoded);

        // Si le résultat est une string (encodée deux fois), on parse encore
        const parsed = typeof maybeStringifiedArray === 'string' ? JSON.parse(maybeStringifiedArray) : maybeStringifiedArray;

        handleOverlaySelect(parsed);
      } catch (e) {
        console.error('Erreur de parsing double :', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- appliquer la config URL une fois par changement de query
  }, [searchParams]);

  return (
    <Layouts className='col-span-10' fullWidth={isFullWidth} noFooter noPadding={isFullWidth}>
      <div className={`relative w-full bg-c1 overflow-hidden ${isFullWidth ? 'h-[calc(100vh-80px)]' : 'h-[calc(100vh-130px)] rounded-xl'}`}>
        <SidebarProvider>
          <div className='h-full w-full flex flex-col overflow-hidden'>
            {/* Header unifié sur toute la largeur */}
            <UnifiedHeader
              nodeCount={activeView === 'datavis' && !showOverlay ? filteredNodes.length : 0}
              breadcrumb={
                activeView === 'cahiers' ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem isCurrent>
                      <span className='text-c6'>Cahiers de recherche</span>
                    </BreadcrumbItem>
                  </Breadcrumbs>
                ) : activeView === 'radialTree' ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem isCurrent>
                      <span className='text-c6'>Vue hiérarchique</span>
                    </BreadcrumbItem>
                  </Breadcrumbs>
                ) : activeView === 'oeuvres' ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem isCurrent>
                      <span className='text-c6'>Mises en récits de l'IA</span>
                    </BreadcrumbItem>
                  </Breadcrumbs>
                ) : activeView === 'coverageMatrix' ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem isCurrent>
                      <span className='text-c6'>Matrice de couverture</span>
                    </BreadcrumbItem>
                  </Breadcrumbs>
                ) : activeView === 'activityHeatmap' ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem isCurrent>
                      <span className='text-c6'>Calendrier d'activité</span>
                    </BreadcrumbItem>
                  </Breadcrumbs>
                ) : activeView === 'dashboard' && dashboardView !== 'overview' ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem>
                      <button onClick={() => setDashboardView('overview')} className='text-c4 hover:text-c6 transition-colors'>
                        Tableau de bord
                      </button>
                    </BreadcrumbItem>
                    <BreadcrumbItem isCurrent>
                      <span className='text-c6'>
                        {dashboardView === 'distribution' && 'Distribution'}
                        {dashboardView === 'completeness' && 'Complétude'}
                        {dashboardView === 'orphans' && 'Ressources isolées'}
                      </span>
                    </BreadcrumbItem>
                  </Breadcrumbs>
                ) : activeView === 'dashboard' ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem isCurrent>
                      <span className='text-c6'>Tableau de bord</span>
                    </BreadcrumbItem>
                  </Breadcrumbs>
                ) : activeView === 'datavis' && !showOverlay && lastSearchInfo ? (
                  <Breadcrumbs underline='hover' size='sm'>
                    <BreadcrumbItem>
                      <button onClick={() => navigateToOverlayStep('type')} className='text-c4 hover:text-c6 transition-colors'>
                        Recherche
                      </button>
                    </BreadcrumbItem>
                    {lastSearchInfo.isImport
                      ? [
                          <BreadcrumbItem key='import-type'>
                            <button onClick={() => navigateToOverlayStep('search', lastSearchInfo.groups[0]?.itemType)} className='text-c4 hover:text-c6 transition-colors'>
                              {VISUAL_TYPES.find((t) => t.key === lastSearchInfo.groups[0]?.itemType)?.label || lastSearchInfo.groups[0]?.itemType}
                            </button>
                          </BreadcrumbItem>,
                          <BreadcrumbItem key='import-advanced' isCurrent>
                            <button
                              onClick={() => navigateToOverlayStep('advanced', lastSearchInfo.groups[0]?.itemType, lastSearchInfo.groups)}
                              className='text-c4 hover:text-c6 transition-colors'>
                              Filtrage avancé
                            </button>
                          </BreadcrumbItem>,
                        ]
                      : lastSearchInfo.groups.flatMap((group, groupIndex) => {
                          const typeLabel = VISUAL_TYPES.find((t) => t.key === group.itemType)?.label || group.itemType;
                          const searchTerm = group.conditions?.find((c) => c.value)?.value;
                          const items = [];

                          items.push(
                            <BreadcrumbItem key={`type-${groupIndex}`}>
                              <button onClick={() => navigateToOverlayStep('search', group.itemType)} className='text-c4 hover:text-c6 transition-colors'>
                                {typeLabel}
                              </button>
                            </BreadcrumbItem>,
                          );

                          if (searchTerm) {
                            items.push(
                              <BreadcrumbItem key={`term-${groupIndex}`} isCurrent={groupIndex === lastSearchInfo.groups.length - 1}>
                                <span className='text-c6'>"{searchTerm}"</span>
                              </BreadcrumbItem>,
                            );
                          }

                          return items;
                        })}
                  </Breadcrumbs>
                ) : activeView === 'datavis' && showOverlay ? (
                  overlayBreadcrumb || (
                    <Breadcrumbs underline='hover' size='sm'>
                      <BreadcrumbItem isCurrent>
                        <span className='text-c6'>Recherche</span>
                      </BreadcrumbItem>
                    </Breadcrumbs>
                  )
                ) : activeView === 'datavis' ? null : (
                  overlayBreadcrumb
                )
              }
              rightActions={
                activeView === 'datavis' && showOverlay ? (
                  <HeaderImportButton onImport={handleImport} />
                ) : activeView === 'datavis' && !showOverlay && filteredNodes.length > 0 ? (
                  <HeaderExportButton
                    handleExportClick={handleExportClick}
                    generatedImage={generatedImage}
                    exportEnabled={exportEnabled}
                    filterGroups={lastSearchInfo?.groups}
                    onNavigateToCahiers={() => navigateToView('cahiers')}
                    getNodePositions={getNodePositions}
                  />
                ) : activeView === 'coverageMatrix' ? (
                  <Popover placement='bottom-end'>
                    <PopoverTrigger>
                      <Button size='sm' variant='light' className='text-c5 gap-4'>
                        <Settings size={16} />
                        <span className='text-xs'>Top {coverageTopKeywords}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='bg-c2 border border-c3 p-4 w-220'>
                      <div className='flex flex-col gap-4'>
                        <span className='text-c5 text-xs font-medium'>Nombre de mots-clés</span>
                        <Slider
                          size='sm'
                          step={5}
                          minValue={5}
                          maxValue={400}
                          defaultValue={coverageTopKeywords}
                          onChangeEnd={(val) => setCoverageTopKeywords(val as number)}
                          showTooltip={true}
                          disableThumbScale={true}
                          classNames={{
                            base: 'w-full',
                            filler: 'bg-[#fff]',
                            thumb:
                              'w-[16px] h-[16px] after:w-[16px] after:h-[16px] bg-[#fff] after:bg-[#fff] !rounded-full after:!rounded-full focus:ring-0 focus:ring-offset-0 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0',
                            track: 'bg-c3',
                            trackWrapper: 'focus:ring-0',
                          }}
                          tooltipProps={{
                            offset: 8,
                            placement: 'bottom',
                            classNames: {
                              base: 'before:bg-[#fff]',
                              content: 'py-px px-2 text-xs text-c1 bg-[#fff]',
                            },
                          }}
                        />
                        <div className='flex justify-between text-[#fff] text-[10px]'>
                          <span>5</span>

                          <span>400</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : activeView === 'activityHeatmap' ? (
                  <Select
                    size='sm'
                    selectedKeys={[String(heatmapYear)]}
                    onChange={(e) => setHeatmapYear(Number(e.target.value))}
                    className='w-24 !text-c6'
                    aria-label='Année'
                    classNames={{
                      trigger: 'bg-c2 border border-c3',
                      value: 'text-c6',
                    }}>
                    {heatmapAvailableYears.map((year) => (
                      <SelectItem className='!text-c6' key={year} textValue={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </Select>
                ) : null
              }
              filterDropdown={
                activeView === 'datavis' && !showOverlay && filteredNodes.length > 0 ? (
                  <TypeFilterDropdown visibleTypes={visibleTypes} onToggleType={handleToggleVisibleType} typesInUse={typesInUse} searchedTypes={searchedTypes} />
                ) : null
              }
              canGoBack={activeView === 'dashboard' && dashboardView !== 'overview' ? true : globalCanGoBack}
              canGoForward={globalCanGoForward}
              onBack={activeView === 'dashboard' && dashboardView !== 'overview' ? () => setDashboardView('overview') : handleGlobalBack}
              onForward={handleGlobalForward}
              showNavigationButtons={activeView === 'datavis' || activeView === 'dashboard'}
            />

            {/* Contenu principal : Sidebar + Zone de travail */}
            <div className='flex-1 flex overflow-hidden'>
              {/* Sidebar gauche collapsible */}
              <DatavisSidebar
                activeView={activeView}
                onShowDatavis={() => navigateToView('datavis')}
                onShowCahiers={() => navigateToView('cahiers')}
                onShowRadialTree={() => navigateToView('radialTree')}
                onShowOeuvres={() => navigateToView('oeuvres')}
                onShowCoverageMatrix={() => navigateToView('coverageMatrix')}
                onShowActivityHeatmap={() => navigateToView('activityHeatmap')}
                onShowDashboard={() => navigateToView('dashboard')}
                isEditMode={isEditMode}
                isLinkMode={isLinkMode}
                isAnnoteMode={isAnnoteMode}
                annotationViewMode={viewAnnotationMode}
                onEditToggle={handleEditModeChange}
                onLinkToggle={handleLinkModeChange}
                onAnnoteToggle={(active, viewMode) => {
                  handleAnnoteModeChange(active);
                  setviewAnnotationMode(viewMode);
                }}
                toolsEnabled={activeView === 'datavis' && !showOverlay && filteredNodes.length > 0}
                isFullWidth={isFullWidth}
                onFullWidthToggle={setIsFullWidth}
              />
              {/* Zone principale : Canvas + Footer en colonne */}
              <div className='flex-1 min-w-0 h-full flex flex-col'>
                {/* Zone de contenu - Cahiers et Create en overlay, Datavis toujours monté */}
                {activeView === 'cahiers' && (
                  <CahiersView
                    onSelectConfig={(filters, nodePositions) => {
                      handleOverlaySelect(filters, false, nodePositions);
                      navigateToView('datavis');
                    }}
                  />
                )}
                {activeView === 'radialTree' && (
                  <RadialClusterView
                    externalData={itemsDataviz.length > 0 ? itemsDataviz : undefined}
                    onNodeClick={(node) => {
                      const apiBase = 'https://tests.arcanes.ca/omk/api/';
                      const itemUrl = `${apiBase}items/${node.id}`;
                      setCurrentItemUrl(itemUrl);
                      setSelectedConfigKey(getConfigKey(node.type));
                      setSelectedConfig(node.type);
                      onOpenEdit();
                    }}
                    visibleTypes={visibleTypes.length > 0 ? visibleTypes : undefined}
                  />
                )}
                {activeView === 'oeuvres' && (
                  <RecitsClusterView
                    onNodeClick={(node) => {
                      const apiBase = 'https://tests.arcanes.ca/omk/api/';
                      const itemUrl = `${apiBase}items/${node.id}`;
                      setCurrentItemUrl(itemUrl);
                      setSelectedConfigKey(getConfigKey(node.type));
                      setSelectedConfig(node.type);
                      onOpenEdit();
                    }}
                  />
                )}
                {/* Vues Analytics */}
                {activeView === 'coverageMatrix' && <CoverageMatrix topKeywordsCount={coverageTopKeywords} onTopKeywordsCountChange={setCoverageTopKeywords} />}
                {activeView === 'activityHeatmap' && <ActivityHeatmap selectedYear={heatmapYear} />}
                {activeView === 'dashboard' && <Dashboard currentView={dashboardView} onViewChange={setDashboardView} />}
                <motion.div
                  className='relative flex-1 overflow-hidden bg-c1'
                  variants={containerVariants}
                  ref={containerRef}
                  initial='hidden'
                  animate='visible'
                  style={{ display: activeView === 'datavis' ? 'flex' : 'none' }}>
                  {/* Blocking Overlay for Maintenance */}
                  <div className='absolute inset-0 z-20 bg-c1/95 flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm'>
                    <div className='max-w-md p-8 rounded-xl border-2 border-c3 bg-c2 shadow-lg flex flex-col items-center'>
                      <div className='text-datavisOrange mb-6'>
                        <Construction size={48} />
                      </div>
                      <h2 className='text-2xl font-bold text-c6 mb-4'>Fonctionnalité indisponible</h2>
                      <p className='text-c4 mb-6 leading-relaxed'>
                        Cette partie est inaccessible de manière temporaire pour restructuration.
                        <br />
                        Nous vous invitons à explorer les autres visualisations disponibles.
                      </p>
                    </div>
                  </div>
                  {!showOverlay && filteredNodes.length > 0 && (
                    <BGPattern variant='grid' mask='fade-edges' size={40} fill='rgba(255, 255, 255, 0.15)' className='absolute inset-0 z-0 pointer-events-none' />
                  )}
                  {!showOverlay && noResultsFound && filteredNodes.length === 0 && (
                    <div className='absolute inset-0 flex items-center justify-center z-10'>
                      <div className='text-center p-8 rounded-xl bg-c2/50 border-2 border-c3 max-w-md'>
                        <div className='text-c4 mb-4'>
                          <svg className='w-16 h-16 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                          </svg>
                        </div>
                        <h3 className='text-c6 text-lg font-medium mb-2'>Aucun résultat trouvé</h3>
                        <p className='text-c4 text-sm mb-4'>Votre recherche n'a retourné aucun élément. Essayez de modifier vos critères de recherche.</p>
                        <button
                          onClick={() => {
                            setShowOverlay(true);
                            setNoResultsFound(false);
                          }}
                          className='px-4 py-2 bg-c3 hover:bg-c4 text-c6 rounded-lg transition-colors text-sm'>
                          Nouvelle recherche
                        </button>
                      </div>
                    </div>
                  )}
                  {showOverlay && (
                    <>
                      {isLoadingData && (
                        <div className='absolute inset-0 flex items-center justify-center bg-c1/80 z-50'>
                          <div className='text-c6 text-center'>
                            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-c6 mx-auto mb-4'></div>
                            <p>Chargement des données...</p>
                          </div>
                        </div>
                      )}
                      <VisualFilterOverlay
                        onSelect={handleOverlaySelect}
                        renderBreadcrumb={setOverlayBreadcrumb}
                        onNavigationChange={setOverlayNav}
                        initialState={overlayState}
                        onStateChange={setOverlayState}
                      />
                    </>
                  )}
                  <svg
                    ref={svgRef}
                    xmlns='http://www.w3.org/2000/svg'
                    width={dimensions.width}
                    height={dimensions.height}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}></svg>
                  <div className='absolute bottom-4 right-4 z-[50]'>
                    <ZoomControl availableControl={!showOverlay} svgRef={svgRef} />
                  </div>
                </motion.div>
                {/* Footer - aligné avec SidebarFooter */}
              </div>
            </div>
          </div>
        </SidebarProvider>
        {/* Drawer à gauche */}
        <Drawer isOpen={isOpenDrawer} hideCloseButton placement='left' onOpenChange={onOpenChangeDrawer}>
          <DrawerContent className='bg-c1 z-[52] flex flex-col gap-4'>
            {(onClose) => (
              <>
                <DrawerHeader className='flex flex-row items-center justify-between text-c6'>
                  <Button onPress={onClose} size='lg' className='px-4 py-4 flex justify-between  bg-c2 text-c6 rounded-lg hover:bg-c3 '>
                    <ArrowIcon size={16} transform='rotate(180deg)' />
                  </Button>
                  <Button
                    onPress={() => {
                      onClose?.();
                      setShowOverlay(true);
                      setExportEnabled(false);
                      clearSvg();
                      // Appeler la fonction si elle existe
                      if (resetActiveIconFunc.current) {
                        resetActiveIconFunc.current();
                      }
                    }}
                    size='lg'
                    className='px-4 py-4 flex justify-between  bg-c2 text-c6 rounded-lg hover:bg-c3 '>
                    Nouvelle recherche
                    <SearchIcon size={18} />
                  </Button>
                </DrawerHeader>
                <DrawerBody className='text-c6 flex flex-col gap-8'>
                  <a href='/recherche' className='text-c6 flex flex-row gap-4 border-2 border-c3  hover:border-c4 rounded-xl transition w-fit p-3'>
                    <LibraryBig size={20} />
                    <div>Cahier de recherche</div>
                  </a>
                  <SearchHistory
                    onSelectSearch={(filters, nodePositions) => {
                      handleOverlaySelect(filters, false, nodePositions);
                    }}
                    onClose={onClose}
                  />
                </DrawerBody>
              </>
            )}
          </DrawerContent>
        </Drawer>
        <EditModal
          isOpen={isOpenEdit}
          onClose={onCloseEdit}
          itemUrl={currentItemUrl}
          activeConfig={selectedConfigKey}
          itemPropertiesData={itemPropertiesData}
          propertiesLoading={propertiesLoading}
          justView={!isEditMode}
        />
      </div>
    </Layouts>
  );
};

export default Visualisation;
