/**
 * Configuration centralisée pour tous les types de ressources
 * 
 * Ce fichier définit :
 * - Les types de ressources
 * - Les template IDs associés
 * - Les noms d'affichage
 * - Les URLs de routage
 */

import React from 'react';
import { IconSvgProps } from '@/types/ui';
import {
  SeminaireIcon, ColloqueIcon, StudyDayIcon, ExperimentationIcon,
  PratiqueNarrativeIcon
} from '@/components/ui/icons';

// ========================================
// Types de ressources
// ========================================

export type ResourceType =
  | 'mediagraphie'
  | 'bibliographie'
  | 'recit_scientifique'
  | 'recit_artistique'
  | 'recit_techno_industriel'
  | 'recit_citoyen'
  | 'recit_mediatique'
  | 'annotation'
  | 'journee_etudes'
  | 'seminaire'
  | 'colloque'
  | 'element_esthetique'
  | 'element_narratif'
  | 'experimentation'
  | 'experimentation_etudiant'
  | 'recit_artistique'
  | 'outil'
  | 'outil_etudiant'
  | 'retour_experience'
  | 'retour_experience_etudiant'
  | 'intervenant';

// ========================================
// Configuration des types de ressources
// ========================================

export interface ResourceTypeConfig {
  type: ResourceType;
  label: string;
  icon?: React.FC<IconSvgProps>;
  templateIds: number[];
  getUrl: (id: string | number) => string;
  collectionUrl?: string;
  collectionLabel?: string;
  color?: string; // Hex color for UI theming
  description?: string; // Brief description for collection pages
}

export const RESOURCE_TYPES: Record<ResourceType, ResourceTypeConfig> = {
  mediagraphie: {
    type: 'mediagraphie',
    label: 'Médiagraphie',
    icon: undefined,
    templateIds: [83, 98],
    getUrl: (id) => `/corpus/mediagraphie/${id}`,
  },

  bibliographie: {
    type: 'bibliographie',
    label: 'Bibliographie',
    icon: undefined,
    templateIds: [81, 99],
    getUrl: (id) => `/corpus/bibliographie/${id}`,
  },

  recit_scientifique: {
    type: 'recit_scientifique',
    label: 'Récit scientifique',
    icon: PratiqueNarrativeIcon,
    templateIds: [124],
    getUrl: (id) => `/corpus/recit-scientifique/${id}`,
    collectionUrl: '/corpus/recits-scientifiques',
    collectionLabel: 'Récits Scientifiques',
    color: '#AFC8FF',
    description: 'Analyses des publications scientifiques et académiques.',
  },

  recit_artistique: {
    type: 'recit_artistique',
    label: 'Récit artistique',
    icon: PratiqueNarrativeIcon,
    templateIds: [103],
    getUrl: (id) => `/corpus/recit-artistique/${id}`,
    collectionUrl: '/corpus/recits-artistiques',
    collectionLabel: 'Récits Artistiques',
    color: '#FFB6C1',
    description: 'Exploration des œuvres et discours artistiques.',
  },

  recit_techno_industriel: {
    type: 'recit_techno_industriel',
    label: 'Récit techno-industriel',
    icon: PratiqueNarrativeIcon,
    templateIds: [117],
    getUrl: (id) => `/corpus/recit-techno-industriel/${id}`,
    collectionUrl: '/corpus/recits-techno-industriels',
    collectionLabel: 'Récits TechnoIndustriels',
    color: '#A9E2DA',
    description: 'Étude autour de discours industriels et technologiques.',
  },

  recit_citoyen: {
    type: 'recit_citoyen',
    label: 'Récit citoyen',
    icon: PratiqueNarrativeIcon,
    templateIds: [119],
    getUrl: (id) => `/corpus/recit-citoyen/${id}`,
    collectionUrl: '/corpus/recits-citoyens',
    collectionLabel: 'Récits Citoyens',
    color: '#C8E6C9',
    description: 'Exploration des perspectives citoyennes et sociales.',
  },

  recit_mediatique: {
    type: 'recit_mediatique',
    label: 'Récit médiatique',
    icon: PratiqueNarrativeIcon,
    templateIds: [120],
    getUrl: (id) => `/corpus/recit-mediatique/${id}`,
    collectionUrl: '/corpus/recits-mediatiques',
    collectionLabel: 'Récits Médiatiques',
    color: '#FFF1B8',
    description: 'Analyse de la couverture médiatique et presse.',
  },

  annotation: {
    type: 'annotation',
    label: 'Analyse critique',
    icon: undefined,
    templateIds: [101, 125],
    getUrl: (id) => `/corpus/analyse-critique/${id}`,
  },

  journee_etudes: {
    type: 'journee_etudes',
    label: 'Journée d\'études',
    icon: StudyDayIcon,
    templateIds: [121],
    getUrl: (id) => `/corpus/journees-etudes/conference/${id}`,
    collectionUrl: '/corpus/journees-etudes',
    collectionLabel: 'Journées d\'études',
  },

  seminaire: {
    type: 'seminaire',
    label: 'Séminaire',
    icon: SeminaireIcon,
    templateIds: [71],
    getUrl: (id) => `/corpus/seminaires/conference/${id}`,
    collectionUrl: '/corpus/seminaires',
    collectionLabel: 'Séminaires',
  },

  colloque: {
    type: 'colloque',
    label: 'Colloque',
    icon: ColloqueIcon,
    templateIds: [122],
    getUrl: (id) => `/corpus/colloques/conference/${id}`,
    collectionUrl: '/corpus/colloques',
    collectionLabel: 'Colloques',
  },

  element_esthetique: {
    type: 'element_esthetique',
    label: 'Élément esthétique',
    icon: undefined,
    templateIds: [118],
    getUrl: (id) => `/corpus/element-esthetique/${id}`,
  },

  element_narratif: {
    type: 'element_narratif',
    label: 'Élément narratif',
    icon: undefined,
    templateIds: [115],
    getUrl: (id) => `/corpus/element-narratif/${id}`,
  },

  experimentation: {
    type: 'experimentation',
    label: 'Expérimentation',
    icon: ExperimentationIcon,
    templateIds: [108],
    getUrl: (id) => `/corpus/experimentation/${id}`,
    collectionUrl: '/corpus/experimentations',
    collectionLabel: 'Expérimentations',
  },

  experimentation_etudiant: {
    type: 'experimentation_etudiant',
    label: 'Expérimentation (Étudiant)',
    icon: ExperimentationIcon,
    templateIds: [127],
    getUrl: (id) => `/espace-etudiant/experimentation/${id}`,
  },

  outil: {
    type: 'outil',
    label: 'Outil',
    icon: undefined,
    templateIds: [114],
    getUrl: (id) => `/corpus/outil/${id}`,
  },

  retour_experience: {
    type: 'retour_experience',
    label: 'Retour d\'expérience',
    icon: undefined,
    templateIds: [110],
    getUrl: (id) => `/corpus/retour-experience/${id}`,
  },

  outil_etudiant: {
    type: 'outil_etudiant',
    label: 'Outil (Étudiant)',
    icon: undefined,
    templateIds: [129],
    getUrl: (id) => `/espace-etudiant/outil/${id}`,
  },

  retour_experience_etudiant: {
    type: 'retour_experience_etudiant',
    label: 'Retour d\'expérience (Étudiant)',
    icon: undefined,
    templateIds: [128],
    getUrl: (id) => `/espace-etudiant/retour-experience/${id}`,
  },

  intervenant: {
    type: 'intervenant',
    label: 'Intervenant',
    collectionLabel: 'Intervenants',
    icon: undefined,
    templateIds: [72],
    getUrl: (id) => `/intervenant/${id}`,
  },
};

// ========================================
// Helpers et utilitaires
// ========================================

/**
 * Property IDs Omeka S pour les propriétés utilisées dans les vues dynamiques
 * mais potentiellement absentes du template de la ressource parente.
 * Source: /omk/api/properties?term=<term>
 */
export const OMEKA_PROPERTY_IDS: Record<string, number> = {
  'dcterms:references': 36,
  'dcterms:bibliographicCitation': 48,
};

/**
 * Map inversé: template_id -> ResourceType
 */
export const TEMPLATE_ID_TO_TYPE: Record<number, ResourceType> = Object.values(RESOURCE_TYPES).reduce((acc, config) => {
  config.templateIds.forEach((templateId) => {
    acc[templateId] = config.type;
  });
  return acc;
}, {} as Record<number, ResourceType>);

/**
 * Récupère la config d'un type de ressource par son template_id
 */
export function getResourceConfigByTemplateId(templateId: number | string): ResourceTypeConfig | null {
  const id = parseInt(String(templateId));
  const type = TEMPLATE_ID_TO_TYPE[id];
  return type ? RESOURCE_TYPES[type] : null;
}

/**
 * Récupère la config d'un type de ressource par son type
 */
export function getResourceConfigByType(type: string): ResourceTypeConfig | null {
  return RESOURCE_TYPES[type as ResourceType] || null;
}

/**
 * Récupère le nom d'affichage d'un type
 */
export function getRessourceLabel(type: string): string {
  const config = getResourceConfigByType(type);
  return config?.label || type;
}

/**
 * Récupère l'icône associée à un type
 */
export function getResourceIcon(type: string): React.FC<IconSvgProps> | undefined {
  const config = getResourceConfigByType(type);
  return config?.icon;
}

/**
 * Récupère l'URL d'une ressource
 */
export function getResourceUrl(type: string, id: string | number): string {
  const config = getResourceConfigByType(type);
  return config ? config.getUrl(id) : '#';
}

/**
 * Récupère la config d'un type de ressource par son URL de collection
 * Utile pour les pages collection qui utilisent l'URL pour déterminer le type
 */
export function getResourceConfigByCollectionUrl(url: string): ResourceTypeConfig | null {
  const config = Object.values(RESOURCE_TYPES).find(
    (config) => config.collectionUrl === url
  );
  return config || null;
}


/**
 * Récupère tous les template IDs utilisés
 */
export function getAllTemplateIds(): number[] {
  return Object.keys(TEMPLATE_ID_TO_TYPE).map(Number);
}

/**
 * Vérifie si un template ID est connu
 */
export function isKnownTemplateId(templateId: number | string): boolean {
  const id = parseInt(String(templateId));
  return id in TEMPLATE_ID_TO_TYPE;
}