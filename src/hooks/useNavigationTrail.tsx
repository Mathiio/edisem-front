import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Interface pour un élément du trail de navigation
 */
export interface TrailItem {
  path: string;
  label: string;
  title?: string; // Titre dynamique (ex: nom de l'expérimentation)
  isGridPage?: boolean; // Indique si c'est une page de grille
}

/**
 * Interface du contexte de navigation trail
 */
interface NavigationTrailContextType {
  trail: TrailItem[];
  addToTrail: (item: TrailItem) => void;
  updateCurrentTitle: (title: string) => void;
  clearTrail: () => void;
}

const NavigationTrailContext = createContext<NavigationTrailContextType | undefined>(undefined);

const STORAGE_KEY = 'navigation_trail';

/**
 * Pages qui réinitialisent complètement le trail (accueil uniquement)
 */
const FULL_RESET_PAGES = ['/'];

/**
 * Pages de grille qui deviennent le nouveau point de départ du trail
 * (on garde seulement cette page comme début du trail)
 */
const GRID_PAGES: Record<string, string> = {
  '/corpus/seminaires': 'Séminaires',
  '/corpus/colloques': 'Colloques',
  '/corpus/journees-etudes': "Journées d'études",
  '/corpus/pratiques-narratives': 'Pratiques narratives',
  '/corpus/experimentations': 'Expérimentations',
  '/corpus/mises-en-recits': 'Mises en récits',
  '/mes-playlists': 'Mes playlists',
  '/corpus/recits-scientifiques': 'Récits scientifiques',
  '/corpus/recits-techno-industriels': 'Récits techno-industriels',
  '/corpus/recits-citoyens': 'Récits citoyens',
  '/corpus/recits-mediatiques': 'Récits médiatiques',
  '/corpus/recits-artistiques': 'Récits artistiques',
  '/intervenants': 'Intervenants',
  '/espace-etudiant': 'Espace étudiant',
  '/mon-espace': 'Mon espace',
  '/database': 'Base de données',
  '/recherche': 'Recherche',
  '/visualisation': 'Visualisation',
};

/**
 * Vérifie si un path est une page de détail (contient un ID)
 */
const isDetailPage = (path: string): boolean => {
  const detailPatterns = [
    /^\/corpus\/experimentation\/\d+/,
    /^\/corpus\/outil\/\d+/,
    /^\/corpus\/recit-scientifique\/\d+/,
    /^\/corpus\/recit-artistique\/\d+/,
    /^\/corpus\/recit-mediatique\/\d+/,
    /^\/corpus\/recit-citoyen\/\d+/,
    /^\/corpus\/recit-techno-industriel\/\d+/,
    /^\/corpus\/element-narratif\/\d+/,
    /^\/corpus\/element-esthetique\/\d+/,
    /^\/corpus\/analyse-critique\/\d+/,
    /^\/corpus\/seminaires\/conference\/\d+/,
    /^\/corpus\/colloques\/conference\/\d+/,
    /^\/corpus\/journees-etudes\/conference\/\d+/,
    /^\/corpus\/retour-experience\/\d+/,
    /^\/intervenant\/\d+/,
    /^\/personne\/\d+/,
    /^\/espace-etudiant\/experimentation\/\d+/,
    /^\/espace-etudiant\/outil\/\d+/,
    /^\/espace-etudiant\/retour-experience\/\d+/
  ];

  return detailPatterns.some((pattern) => pattern.test(path));
};

/**
 * Extrait un label lisible à partir du path
 */
const getLabelFromPath = (path: string): string => {
  const typeLabels: Record<string, string> = {
    'experimentation': 'Expérimentation',
    'outil': 'Outil',
    'recit-scientifique': 'Récit scientifique',
    'recit-artistique': 'Récit artistique',
    'recit-mediatique': 'Récit médiatique',
    'recit-citoyen': 'Récit citoyen',
    'recit-techno-industriel': 'Récit techno-industriel',
    'element-narratif': 'Élément narratif',
    'element-esthetique': 'Élément esthétique',
    'analyse-critique': 'Analyse critique',
    'conference': 'Conférence',
    'retour-experience': 'Retour d\'expérience',
    'intervenant': 'Intervenant',
    'personne': 'Personne',
  };

  const segments = path.split('/').filter(Boolean);

  for (const segment of segments) {
    if (typeLabels[segment]) {
      return typeLabels[segment];
    }
  }

  return 'Page';
};

/**
 * Provider pour le contexte de navigation trail
 */
export const NavigationTrailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [trail, setTrail] = useState<TrailItem[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sauvegarder le trail dans sessionStorage à chaque changement
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trail));
    } catch {
      // Ignorer les erreurs de storage
    }
  }, [trail]);

  // Gérer les changements de route
  useEffect(() => {
    const currentPath = location.pathname;

    // Si on est sur la page d'accueil, vider complètement le trail
    if (FULL_RESET_PAGES.includes(currentPath)) {
      setTrail([]);
      return;
    }

    // Si c'est une page de grille, elle devient le nouveau point de départ
    if (GRID_PAGES[currentPath]) {
      const gridItem: TrailItem = {
        path: currentPath,
        label: GRID_PAGES[currentPath],
        isGridPage: true,
      };
      setTrail([gridItem]);
      return;
    }

    // Si c'est une page de détail
    if (isDetailPage(currentPath)) {
      setTrail((prevTrail) => {
        // Vérifier si cette page est déjà dans le trail
        const existingIndex = prevTrail.findIndex((item) => item.path === currentPath);

        if (existingIndex !== -1) {
          // La page existe déjà, tronquer le trail jusqu'à cette page
          return prevTrail.slice(0, existingIndex + 1);
        }

        // Ajouter la nouvelle page au trail
        const newItem: TrailItem = {
          path: currentPath,
          label: getLabelFromPath(currentPath),
        };

        return [...prevTrail, newItem];
      });
    }
  }, [location.pathname]);

  /**
   * Ajouter un élément au trail (utilisé manuellement si nécessaire)
   */
  const addToTrail = useCallback((item: TrailItem) => {
    setTrail((prevTrail) => {
      const existingIndex = prevTrail.findIndex((t) => t.path === item.path);

      if (existingIndex !== -1) {
        const updated = [...prevTrail];
        updated[existingIndex] = { ...updated[existingIndex], ...item };
        return updated;
      }

      return [...prevTrail, item];
    });
  }, []);

  /**
   * Mettre à jour le titre de la page courante
   */
  const updateCurrentTitle = useCallback(
    (title: string) => {
      const currentPath = location.pathname;

      setTrail((prevTrail) => {
        const index = prevTrail.findIndex((item) => item.path === currentPath);

        if (index !== -1) {
          const updated = [...prevTrail];
          updated[index] = { ...updated[index], title };
          return updated;
        }

        return prevTrail;
      });
    },
    [location.pathname],
  );

  /**
   * Vider le trail
   */
  const clearTrail = useCallback(() => {
    setTrail([]);
  }, []);

  return <NavigationTrailContext.Provider value={{ trail, addToTrail, updateCurrentTitle, clearTrail }}>{children}</NavigationTrailContext.Provider>;
};

/**
 * Hook pour utiliser le contexte de navigation trail
 */
export const useNavigationTrail = (): NavigationTrailContextType => {
  const context = useContext(NavigationTrailContext);

  if (!context) {
    throw new Error('useNavigationTrail must be used within a NavigationTrailProvider');
  }

  return context;
};
