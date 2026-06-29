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
  CONFERENCE_TEMPLATE_ID,
  LEGACY_CONFERENCE_TEMPLATE_IDS,
} from './conferenceTypeConfig';

export {
  CONFERENCE_TEMPLATE_ID,
  resolveResourceTypeFromOmekaItem,
  getConferenceDetailUrl,
} from './conferenceTypeConfig';
import {
  SeminaireIcon,
  ColloqueIcon,
  StudyDayIcon,
  ExperimentationIcon,
  PratiqueNarrativeIcon,
  UniversityIcon,
  BookIcon,
  CollectionIcon,
  ImageIcon,
  BuildingIcon,
  EditIcon,
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
  | 'intervenant'
  | 'personne'
  | 'organisation'
  | 'universite'
  | 'ecole_doctorale'
  | 'laboratoire'
  | 'mot_cle';

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
  /** Route /add-resource/... pour la création (full-page) */
  createUrl?: string;
  /** Pas de page vue : ouverture directe en formulaire d'édition */
  formOnly?: boolean;
  /** Accessible uniquement via la ressource parente — exclu de Mon espace */
  parentLinkedOnly?: boolean;
  /** Genre grammatical pour « Lier le/la/l'… » (défaut : masculin) */
  gender?: 'm' | 'f';
}

export const RESOURCE_TYPES: Record<ResourceType, ResourceTypeConfig> = {
  mediagraphie: {
    type: 'mediagraphie',
    label: 'Médiagraphie',
    gender: 'f',
    icon: ImageIcon,
    color: '#FFB8E6',
    templateIds: [83, 98],
    getUrl: (id) => `/corpus/mediagraphie/${id}`,
    createUrl: '/add-resource/mediagraphie',
    formOnly: true,
  },

  bibliographie: {
    type: 'bibliographie',
    label: 'Bibliographie',
    gender: 'f',
    icon: undefined,
    templateIds: [81, 99],
    getUrl: (id) => `/corpus/bibliographie/${id}`,
    createUrl: '/add-resource/bibliographie',
    formOnly: true,
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
    description: 'Analyses de publications scientifiques et académiques.',
    createUrl: '/add-resource/recit-scientifique',
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
    createUrl: '/add-resource/recit-artistique',
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
    createUrl: '/add-resource/recit-techno',
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
    createUrl: '/add-resource/recit-citoyen',
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
    createUrl: '/add-resource/recit-mediatique',
  },

  annotation: {
    type: 'annotation',
    label: 'Analyse critique',
    gender: 'f',
    icon: undefined,
    templateIds: [101, 125],
    getUrl: (id) => `/corpus/analyse-critique/${id}`,
    parentLinkedOnly: true,
  },

  journee_etudes: {
    type: 'journee_etudes',
    label: 'Journée d\'études',
    icon: StudyDayIcon,
    templateIds: [CONFERENCE_TEMPLATE_ID],
    getUrl: (id) => `/corpus/journees-etudes/conference/${id}`,
    collectionUrl: '/corpus/journees-etudes',
    collectionLabel: 'Journées d\'études',
  },

  seminaire: {
    type: 'seminaire',
    label: 'Séminaire',
    icon: SeminaireIcon,
    templateIds: [CONFERENCE_TEMPLATE_ID],
    getUrl: (id) => `/corpus/seminaires/conference/${id}`,
    collectionUrl: '/corpus/seminaires',
    collectionLabel: 'Séminaires',
  },

  colloque: {
    type: 'colloque',
    label: 'Colloque',
    icon: ColloqueIcon,
    templateIds: [CONFERENCE_TEMPLATE_ID],
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
    parentLinkedOnly: true,
  },

  element_narratif: {
    type: 'element_narratif',
    label: 'Élément narratif',
    icon: undefined,
    templateIds: [115],
    getUrl: (id) => `/corpus/element-narratif/${id}`,
    parentLinkedOnly: true,
  },

  experimentation: {
    type: 'experimentation',
    label: 'Expérimentation',
    gender: 'f',
    icon: ExperimentationIcon,
    templateIds: [108],
    getUrl: (id) => `/corpus/experimentation/${id}`,
    collectionUrl: '/corpus/experimentations',
    collectionLabel: 'Expérimentations',
    createUrl: '/add-resource/experimentation-chercheur',
  },

  experimentation_etudiant: {
    type: 'experimentation_etudiant',
    label: 'Expérimentation (Étudiant)',
    gender: 'f',
    icon: ExperimentationIcon,
    templateIds: [127],
    getUrl: (id) => `/espace-etudiant/experimentation/${id}`,
    createUrl: '/add-resource/experimentation',
  },

  outil: {
    type: 'outil',
    label: 'Outil',
    icon: undefined,
    templateIds: [114],
    getUrl: (id) => `/corpus/outil/${id}`,
    createUrl: '/add-resource/outil-chercheur',
  },

  retour_experience: {
    type: 'retour_experience',
    label: 'Retour d\'expérience',
    gender: 'm',
    icon: undefined,
    templateIds: [110],
    getUrl: (id) => `/corpus/retour-experience/${id}`,
    createUrl: '/add-resource/retour-experience-chercheur',
    parentLinkedOnly: true,
  },

  outil_etudiant: {
    type: 'outil_etudiant',
    label: 'Outil (Étudiant)',
    gender: 'm',
    icon: undefined,
    templateIds: [129],
    getUrl: (id) => `/corpus/outil/${id}`,
    createUrl: '/add-resource/outil',
  },

  retour_experience_etudiant: {
    type: 'retour_experience_etudiant',
    label: 'Retour d\'expérience (Étudiant)',
    gender: 'm',
    icon: undefined,
    templateIds: [128],
    getUrl: (id) => `/espace-etudiant/retour-experience/${id}`,
    createUrl: '/add-resource/retour-experience',
    parentLinkedOnly: true,
  },

  intervenant: {
    type: 'intervenant',
    label: 'Intervenant',
    gender: 'm',
    collectionLabel: 'Intervenants',
    icon: undefined,
    templateIds: [72],
    getUrl: (id) => `/intervenant/${id}`,
    createUrl: '/add-resource/intervenant',
  },

  personne: {
    type: 'personne',
    label: 'Personne',
    gender: 'f',
    collectionLabel: 'Personnes',
    icon: undefined,
    templateIds: [33],
    getUrl: (id) => `/personne/${id}`,
    createUrl: '/add-resource/personne',
  },

  organisation: {
    type: 'organisation',
    label: 'Organisation',
    gender: 'f',
    collectionLabel: 'Organisations',
    icon: BuildingIcon,
    color: '#FFD6A5',
    templateIds: [104],
    getUrl: (id) => `/organisation/${id}`,
    createUrl: '/add-resource/organisation',
    formOnly: true,
  },

  universite: {
    type: 'universite',
    label: 'Université',
    gender: 'f',
    collectionLabel: 'Universités',
    icon: undefined,
    templateIds: [73],
    getUrl: (id) => `/universite/${id}`,
    createUrl: '/add-resource/universite',
    formOnly: true,
  },

  ecole_doctorale: {
    type: 'ecole_doctorale',
    label: 'École doctorale',
    gender: 'f',
    collectionLabel: 'Écoles doctorales',
    icon: undefined,
    templateIds: [74],
    getUrl: (id) => `/ecole-doctorale/${id}`,
    createUrl: '/add-resource/ecole-doctorale',
    formOnly: true,
  },

  laboratoire: {
    type: 'laboratoire',
    label: 'Laboratoire',
    gender: 'm',
    collectionLabel: 'Laboratoires',
    icon: undefined,
    templateIds: [91],
    getUrl: (id) => `/laboratoire/${id}`,
    createUrl: '/add-resource/laboratoire',
    formOnly: true,
  },

  mot_cle: {
    type: 'mot_cle',
    label: 'Mot-clé',
    gender: 'm',
    collectionLabel: 'Mots-clés',
    icon: undefined,
    templateIds: [34],
    getUrl: (id) => `/add-resource/mot-cle/${id}`,
    createUrl: '/add-resource/mot-cle',
    formOnly: true,
    parentLinkedOnly: true,
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
  'dcterms:type': 8,
};

/**
 * Map inversé: template_id -> ResourceType
 * Le template 71 est partagé par séminaire / journée d'études / colloque — résolu via dcterms:type.
 */
export const TEMPLATE_ID_TO_TYPE: Record<number, ResourceType> = (() => {
  const acc: Record<number, ResourceType> = {
    [CONFERENCE_TEMPLATE_ID]: 'seminaire',
    [LEGACY_CONFERENCE_TEMPLATE_IDS.journee_etudes]: 'journee_etudes',
    [LEGACY_CONFERENCE_TEMPLATE_IDS.colloque]: 'colloque',
  };

  Object.values(RESOURCE_TYPES).forEach((config) => {
    config.templateIds.forEach((templateId) => {
      if (templateId === CONFERENCE_TEMPLATE_ID) return;
      acc[templateId] = config.type;
    });
  });

  return acc;
})();

/**
 * Récupère la config d'un type de ressource par son template_id
 */
/** Template IDs des bibliographies (chercheur + étudiant) */
export const BIBLIOGRAPHY_TEMPLATE_IDS = RESOURCE_TYPES.bibliographie.templateIds;

/** Template IDs des médiagraphies (chercheur + étudiant) */
export const MEDIAGRAPHY_TEMPLATE_IDS = RESOURCE_TYPES.mediagraphie.templateIds;

/** Sépare les template IDs mixtes bibliographie / médiagraphie */
export function splitBibliographyMediagraphyTemplateIds(templateIds: number[]): {
  bibliographies: number[];
  mediagraphies: number[];
  isMixed: boolean;
} {
  const bibliographies = templateIds.filter((id) => BIBLIOGRAPHY_TEMPLATE_IDS.includes(id));
  const mediagraphies = templateIds.filter((id) => MEDIAGRAPHY_TEMPLATE_IDS.includes(id));
  return {
    bibliographies,
    mediagraphies,
    isMixed: bibliographies.length > 0 && mediagraphies.length > 0,
  };
}

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

/** Libellé du bouton de sauvegarde en onglet enfant : « Lier le/la/l'[ressource] » */
export function getResourceLinkSaveLabel(type: string): string {
  const config = getResourceConfigByType(type);
  const label = (config?.label ?? type).toLowerCase();
  const gender = config?.gender ?? 'm';

  if (/^[aeiouéèêëàâîïôùûü]/i.test(label)) {
    return `Lier l'${label}`;
  }
  return gender === 'f' ? `Lier la ${label}` : `Lier le ${label}`;
}

/**
 * Récupère l'icône associée à un type
 */
export function getResourceIcon(type: string): React.FC<IconSvgProps> | undefined {
  const config = getResourceConfigByType(type);
  return config?.icon;
}

/** Thème visuel aligné sur les sections mon-espace (icône + couleur) */
const MON_ESPACE_THEME_RULES: { match: (type: string) => boolean; icon: React.FC<IconSvgProps>; color: string }[] = [
  { match: (t) => t.includes('seminaire') || t.includes('conference') || t.includes('colloque') || t.includes('journee'), icon: SeminaireIcon, color: '#FFB6C1' },
  { match: (t) => t.includes('recit'), icon: PratiqueNarrativeIcon, color: '#AFC8FF' },
  { match: (t) => t.includes('annotation') || t.includes('analyse'), icon: CollectionIcon, color: '#D4A5FF' },
  { match: (t) => t.includes('experimentation'), icon: ExperimentationIcon, color: '#A9E2DA' },
  { match: (t) => t.includes('retour') || t.includes('feedback'), icon: BookIcon, color: '#C8E6C9' },
  { match: (t) => t.includes('outil'), icon: UniversityIcon, color: '#FFF1B8' },
  { match: (t) => t.includes('element'), icon: CollectionIcon, color: '#FFD6A5' },
  { match: (t) => t.includes('organisation'), icon: BuildingIcon, color: '#FFD6A5' },
  { match: (t) => t.includes('mediagraphie'), icon: ImageIcon, color: '#FFB8E6' },
  { match: (t) => t.includes('bibliographie'), icon: BookIcon, color: '#B8D4FF' },
];

export function getResourceDisplayTheme(type: string): {
  label: string;
  icon: React.FC<IconSvgProps>;
  color: string;
} {
  const config = getResourceConfigByType(type);
  const label = config?.label || type;
  const rule = MON_ESPACE_THEME_RULES.find((r) => r.match(type));

  return {
    label,
    icon: config?.icon ?? rule?.icon ?? EditIcon,
    color: config?.color ?? rule?.color ?? '#A9E2DA',
  };
}

/**
 * Récupère l'URL d'une ressource
 */
export function getResourceUrl(type: string, id: string | number): string {
  const config = getResourceConfigByType(type);
  return config ? config.getUrl(id) : '#';
}

/** Types sans page vue — formulaire d'édition uniquement */
export function isFormOnlyResourceType(type: string | undefined): boolean {
  if (!type) return false;
  const config = getResourceConfigByType(type);
  return Boolean(config?.formOnly);
}

/** Types liés à une ressource parente — exclus de Mon espace */
export function isParentLinkedOnlyResourceType(type: string | undefined): boolean {
  if (!type) return false;
  const config = getResourceConfigByType(type);
  return Boolean(config?.parentLinkedOnly);
}

/** Filtre les ressources affichées dans Mon espace */
export function filterMonEspaceResources<T extends { type: string }>(resources: T[]): T[] {
  return resources.filter((r) => !isParentLinkedOnlyResourceType(r.type));
}

/** Template IDs des ressources accessibles uniquement via leur parent */
export function getParentLinkedOnlyTemplateIds(): number[] {
  return Object.values(RESOURCE_TYPES)
    .filter((c) => c.parentLinkedOnly)
    .flatMap((c) => c.templateIds);
}

/** Types supprimés en cascade avec leur ressource parente (non transverses). */
const CASCADE_DELETE_WITH_PARENT_TYPES = new Set<ResourceType>([
  'annotation',
  'retour_experience',
  'retour_experience_etudiant',
  'element_narratif',
  'element_esthetique',
]);

/** Templates Omeka supprimés automatiquement quand on supprime le parent. */
export function getCascadeDeleteWithParentTemplateIds(): number[] {
  return Object.values(RESOURCE_TYPES)
    .filter((c) => CASCADE_DELETE_WITH_PARENT_TYPES.has(c.type))
    .flatMap((c) => c.templateIds);
}

export function isCascadeDeleteWithParentTemplate(templateId?: number | null): boolean {
  if (templateId == null) return false;
  return getCascadeDeleteWithParentTemplateIds().includes(Number(templateId));
}

/** Templates gérés depuis la page /administration (global_admin) */
export const GLOBAL_ADMIN_TEMPLATE_OPTIONS: { id: number; label: string }[] = [
  { id: 81, label: 'Bibliographie' },
  { id: 104, label: 'Organisation' },
  { id: 71, label: 'Conférence' },
  { id: 108, label: 'Expérimentation' },
  { id: 127, label: 'Expérimentation étudiant' },
  { id: 83, label: 'Médiagraphie' },
  { id: 114, label: 'Outil' },
  { id: 129, label: 'Outil étudiant' },
  { id: 33, label: 'Personne' },
  { id: 103, label: 'Récit artistique' },
  { id: 119, label: 'Récit citoyen' },
  { id: 120, label: 'Récit médiatique' },
  { id: 124, label: 'Récit scientifique' },
  { id: 117, label: 'Récit techno' },
];

export const GLOBAL_ADMIN_TEMPLATE_IDS = GLOBAL_ADMIN_TEMPLATE_OPTIONS.map((t) => t.id);

/** URL d'édition full-page pour un type de ressource */
export function getResourceEditUrl(type: string, id: string | number): string {
  const url = getResourceUrl(type, id);
  if (url === '#') return `/espace-etudiant/experimentation/${id}?mode=edit`;
  return `${url}?mode=edit`;
}

/** URL d'édition en mode super-admin (contourne les restrictions de propriété) */
export function getGlobalAdminEditUrl(type: string, id: string | number): string {
  const base = getResourceEditUrl(type, id);
  return `${base}${base.includes('?') ? '&' : '?'}globalAdmin=1`;
}

/** Page de retour après annulation / sortie du mode édition */
export function getEditExitPath(isGlobalAdminEdit?: boolean, userType?: string | null): string {
  if (isGlobalAdminEdit) return '/administration';
  return getMonEspacePath(userType);
}

/** Page Mon espace selon le profil (actant → mon-espace-4, étudiant → mon-espace) */
export function getMonEspacePath(userType?: string | null): string {
  if (userType === 'actant') return '/mon-espace-4';
  if (userType) return '/mon-espace';
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored) as { type?: string };
      if (parsed.type === 'actant') return '/mon-espace-4';
    }
  } catch {
    // ignore
  }
  return '/mon-espace';
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