/**
 * Configuration unifiée pour les pages de détail
 *
 * Ce système permet de définir une page de détail de manière déclarative :
 * - Les champs avec leur type, zone et options d'édition
 * - Les vues avec leur type de rendu
 *
 * Le système se charge automatiquement de :
 * - Générer les composants de rendu
 * - Créer les data fetchers pour Omeka S
 * - Gérer le mode édition et la sauvegarde
 */

import React from 'react';
import { SmartRecommendationsStrategy } from './config';

// ========================================
// Bouton contributeur (mode édition)
// ========================================

/**
 * Déclare un bouton "Ajouter un X" en mode édition.
 * Chaque bouton ouvre un ResourcePicker pour un seul templateId.
 */
export interface ContributorButton {
  /** Label affiché sur le bouton, ex: "Ajouter un Intervenant" */
  label: string;
  /** Template Omeka S ciblé, ex: 72 */
  templateId: number;
  /** Propriété Omeka S sur laquelle écrire, ex: "schema:agent" */
  property: string;
}

// ========================================
// Types de champs supportés
// ========================================

export type FieldType =
  | 'title' // Titre principal (affiché en grand dans le header)
  | 'text' // Texte simple (input)
  | 'textarea' // Zone de texte multiligne
  | 'date' // Date
  | 'slider' // Slider (0-100)
  | 'url' // Lien externe
  | 'resource' // Ressource liée (avec vignette et nom)
  | 'itemset' // Sélection depuis un item set Omeka S
  | 'select' // Sélection depuis une liste statique d'options
  | 'media' // Médias (images/vidéos)
  | 'status' // Statut (chip/badge)
  | 'percentage'; // Pourcentage avec barre de progression

// ========================================
// Zones d'affichage
// ========================================

export type FieldZone =
  | 'header' // Zone titre/métadonnées principales
  | 'overview' // Carte overview (médias, personnes, actions)
  | 'details'; // Carte details (description, date, etc.)

// ========================================
// Définition d'un champ
// ========================================

export interface FieldDefinition {
  /** Propriété Omeka S (ex: 'dcterms:title') */
  property: string;

  /** Type de champ pour le rendu et l'édition */
  type: FieldType;

  /** Label affiché */
  label?: string;

  /** Placeholder pour les inputs */
  placeholder?: string;

  /** Zone d'affichage */
  zone?: FieldZone;

  /** Si le champ est requis */
  required?: boolean;

  /** Si le champ est éditable (true par défaut) */
  editable?: boolean;

  /** Pour slider: valeur minimum */
  min?: number;

  /** Pour slider: valeur maximum */
  max?: number;

  /** Pour slider: pas */
  step?: number;

  /** Pour resource: template ID pour le picker */
  resourceTemplateId?: number;

  /** Pour resource: permettre sélection multiple */
  multiSelect?: boolean;

  /** Pour itemset: ID de l'item set Omeka S */
  itemSetId?: number;

  /** Pour select: liste statique de choix { value, label } */
  options?: { value: string; label: string }[];

  /** Pour select/customVocab: ID du custom vocab Omeka S (sauvegarde en customvocab:N) */
  customVocabId?: number;

  /** Propriétés sources multiples (pour combiner plusieurs propriétés) */
  sourceProperties?: string[];
}

// ========================================
// Mapping des champs
// ========================================

/**
 * Format de définition d'un champ :
 * - string : propriété Omeka S simple (ex: 'dcterms:title')
 * - string[] : propriétés multiples à combiner
 * - FieldDefinition : objet complet avec toutes les options
 */
export type FieldValue = string | string[] | FieldDefinition;

export interface SimplifiedFieldsMapping {
  /** Titre principal */
  title?: FieldValue;

  /** Date */
  date?: FieldValue;

  /** Description */
  description?: FieldValue;

  /** Statut */
  status?: FieldValue;

  /** Pourcentage d'avancement */
  percentage?: FieldValue;

  /** Contributeurs/Actants */
  contributors?: FieldValue;

  /** Lien externe */
  externalLink?: FieldValue;

  /** Champs personnalisés */
  [key: string]: FieldValue | undefined;
}

// ========================================
// Types de rendu pour les vues
// ========================================

export type ViewRenderType = 'text' | 'items' | 'references' | 'categories' | 'citations' | 'microresumes' | 'custom' | 'vocabGroup';

// ========================================
// Configuration d'un champ vocabGroup
// ========================================

export type VocabGroupFieldType = 'textarea' | 'customVocab';

export interface VocabGroupField {
  /** Label affiché */
  label: string;
  /** Propriété Omeka S (ex: 'storyline:has_theme') */
  property: string;
  /** Type du champ : textarea libre ou sélection depuis custom-vocab */
  type: VocabGroupFieldType;
  /** ID du vocabulaire custom Omeka S (pour type = 'customVocab') */
  vocabId?: number;
  /** ID de la propriété Omeka S (pour la sauvegarde si l'item n'a pas encore de valeur) */
  propertyId?: number;
  /** Placeholder pour les textareas */
  placeholder?: string;
}

// ========================================
// Configuration d'une sous-catégorie (pour renderType='categories')
// ========================================

export interface CategorySubcategory {
  /** Clé unique */
  key: string;
  /** Label affiché */
  label: string;
  /** Propriété Omeka S */
  property: string;
  /** Permet d'ajouter plusieurs champs (bouton « Ajouter »). Défaut : true */
  allowMultipleInputs?: boolean;
}

// ========================================
// Configuration d'une catégorie (pour renderType='categories')
// ========================================

export interface CategoryConfig {
  /** Clé unique de la catégorie */
  key: string;
  /** Titre de la catégorie */
  title: string;
  /** Sous-catégories */
  subcategories: CategorySubcategory[];
}

// ========================================
// Configuration d'une vue
// ========================================

export interface SimplifiedViewConfig {
  /** Clé unique de la vue */
  key: string;

  /** Titre de la vue */
  title: string;

  /** Propriété Omeka S (optionnelle pour renderType='categories') */
  property?: string;

  /** Type de rendu */
  renderType: ViewRenderType;

  /** Pattern URL pour les items (ex: '/tool/:id') */
  urlPattern?: string;

  /** Type de référence (pour renderType='references') */
  referenceType?: 'scientific' | 'cultural';

  /** Catégories (pour renderType='categories') */
  categories?: CategoryConfig[];

  /** Si la vue est éditable */
  editable?: boolean;

  /** Message si vide */
  emptyMessage?: string;

  /** Template ID pour créer une nouvelle ressource */
  resourceTemplateId?: number;

  /** Si true, seule la création est autorisée (pas de sélection de ressources existantes) */
  createOnly?: boolean;

  /** Template IDs multiples (pour les references avec bibliographies et mediagraphies) */
  resourceTemplateIds?: number[];

  /** Item set IDs Omeka S (pour filtrer par groupe d'objets) */
  itemSetIds?: number[];

  /** Fonction de rendu custom (pour renderType='custom') */
  customRender?: (context: import('./config').RenderContentContext) => React.ReactNode;

  /** Masquer la vue en mode création/édition (donnée gérée automatiquement, ex. oa:hasTarget) */
  hiddenInForm?: boolean;

  /** Champs pour renderType='vocabGroup' (section avec plusieurs propriétés custom-vocab / textarea) */
  vocabFields?: VocabGroupField[];
}

// ========================================
// Configuration complète
// ========================================

export interface SimplifiedDetailConfig {
  /** Nom du type de ressource */
  resourceType: string;

  /** Template ID Omeka S */
  templateId: number;

  /** Configuration des champs */
  fields: SimplifiedFieldsMapping;

  /** Vues à afficher dans la colonne de droite */
  views?: SimplifiedViewConfig[];

  /** Afficher les keywords */
  showKeywords?: boolean;

  /** Afficher les recommandations */
  showRecommendations?: boolean;

  /** Afficher les commentaires */
  showComments?: boolean;

  /** Titre des recommandations */
  recommendationsTitle?: string;

  /** Type pour les liens du carousel de recommandations */
  recommendationType?: string;

  /** Smart recommendations */
  smartRecommendations?: SmartRecommendationsStrategy;

  /** Vue par défaut */
  defaultView?: string;

  /**
   * Label affiché dans la bannière d'édition et le dropdown "Créer" (remplace le label du type).
   * Utile quand plusieurs sous-types partagent un même formulaire (ex: conférences → "Conférence").
   */
  resourceLabel?: string;

  /** Formulaire d'édition activé */
  formEnabled?: boolean;

  /** Mode édition en une seule colonne (médias → formulaire → vues) */
  editSingleColumn?: boolean;

  /**
   * Mode upload média en édition :
   * - gallery : galerie multi-médias + YouTube (défaut)
   * - photo : une seule image (ex. conférencier, personne)
   * - none : pas de zone média
   */
  mediaUploadMode?: 'gallery' | 'photo' | 'none';

  /**
   * Mode du sélecteur de ressources liées (champs multiselection du formulaire).
   * - grid : grille avec vignettes (défaut)
   * - alphabetic : liste alphabétique sans image (ex. mots-clés)
   */
  resourcePickerDisplay?: 'grid' | 'alphabetic';

  /**
   * Boutons d'ajout de contributeurs en mode édition.
   * Un bouton = un type de ressource = un ResourcePicker dédié.
   */
  contributorButtons?: ContributorButton[];

  // ---- Overrides custom (pour configs avancées comme les conférences) ----

  /** Data fetcher custom — remplace le fetcher Omeka S par défaut */
  customDataFetcher?: (id: string) => Promise<import('./config').FetchResult>;

  /** Fetcher de recommandations custom */
  customRecommendationsFetcher?: (ids: any[], fetchedData?: any) => Promise<any[]>;

  /** Composant overview custom — remplace SimpleOverviewCard */
  customOverviewComponent?: React.ComponentType<any>;
  customOverviewSkeleton?: React.ComponentType<any>;

  /** Composant details custom — remplace SimpleDetailsCard */
  customDetailsComponent?: React.ComponentType<any>;
  customDetailsSkeleton?: React.ComponentType<any>;

  /** Mappers custom pour les props overview/details */
  customMapOverviewProps?: (itemDetails: any, currentVideoTime: number) => any;
  customMapDetailsProps?: (itemDetails: any) => any;

  /** Mapper custom pour les recommandations */
  customMapRecommendationProps?: (item: any) => any;
}

// ========================================
// Type interne pour les champs extraits (utilisé par les composants)
// ========================================

export interface InternalFieldConfig {
  /** Clé du champ (ex: 'title', 'description') */
  key: string;

  /** Propriété Omeka S (ex: 'dcterms:title') */
  property: string;

  /** Label affiché */
  label: string;

  /** Type de champ */
  type: FieldType;

  /** Zone d'affichage */
  zone: FieldZone;

  /** Placeholder */
  placeholder?: string;

  /** Si requis */
  required?: boolean;

  /** Si éditable */
  editable?: boolean;

  /** Pour slider */
  min?: number;
  max?: number;
  step?: number;

  /** Pour resource */
  resourceTemplateId?: number;
  multiSelect?: boolean;

  /** Pour itemset */
  itemSetId?: number;

  /** Pour select: liste statique de choix */
  options?: { value: string; label: string }[];

  /** Pour select/customVocab: ID du custom vocab Omeka S */
  customVocabId?: number;

  /** Propriétés sources multiples */
  sourceProperties?: string[];
}

// ========================================
// Valeurs par défaut pour les champs standard
// ========================================

export const DEFAULT_FIELD_CONFIG: Record<string, Partial<InternalFieldConfig>> = {
  title: {
    label: 'Titre',
    type: 'title',
    zone: 'header',
    placeholder: 'Titre',
  },
  date: {
    label: 'Date',
    type: 'date',
    zone: 'details',
  },
  description: {
    label: 'Description',
    type: 'textarea',
    zone: 'details',
    placeholder: 'Description...',
  },
  status: {
    label: 'Statut',
    type: 'status',
    zone: 'overview',
  },
  percentage: {
    label: 'Avancement',
    type: 'percentage',
    zone: 'overview',
    min: 0,
    max: 100,
    step: 5,
  },
  contributors: {
    label: 'Contributeurs',
    type: 'resource',
    zone: 'overview',
    resourceTemplateId: 96,
    multiSelect: true,
  },
  externalLink: {
    label: 'Lien externe',
    type: 'url',
    zone: 'details',
    placeholder: 'https://...',
  },
};

// ========================================
// Helper: Extraire les champs de la config
// ========================================

export const extractFieldsFromConfig = (fields: SimplifiedFieldsMapping): InternalFieldConfig[] => {
  const result: InternalFieldConfig[] = [];

  Object.entries(fields).forEach(([key, fieldValue]) => {
    if (!fieldValue) return;

    const defaults = DEFAULT_FIELD_CONFIG[key] || {};

    // Gérer les différents formats de fieldValue
    if (typeof fieldValue === 'string') {
      // Format simple : juste une propriété Omeka S
      result.push({
        key,
        property: fieldValue,
        label: defaults.label || key,
        type: defaults.type || 'text',
        zone: defaults.zone || 'details',
        placeholder: defaults.placeholder,
        min: defaults.min,
        max: defaults.max,
        step: defaults.step,
        resourceTemplateId: defaults.resourceTemplateId,
        multiSelect: defaults.multiSelect,
      });
    } else if (Array.isArray(fieldValue)) {
      // Format tableau : plusieurs propriétés sources
      result.push({
        key,
        property: fieldValue[0], // Propriété principale
        label: defaults.label || key,
        type: defaults.type || 'text',
        zone: defaults.zone || 'details',
        placeholder: defaults.placeholder,
        min: defaults.min,
        max: defaults.max,
        step: defaults.step,
        resourceTemplateId: defaults.resourceTemplateId,
        multiSelect: defaults.multiSelect,
        sourceProperties: fieldValue, // Toutes les propriétés sources
      });
    } else {
      // Format objet complet : FieldDefinition
      result.push({
        key,
        property: fieldValue.property,
        label: fieldValue.label || defaults.label || key,
        type: fieldValue.type || defaults.type || 'text',
        zone: fieldValue.zone || defaults.zone || 'details',
        placeholder: fieldValue.placeholder || defaults.placeholder,
        required: fieldValue.required,
        editable: fieldValue.editable,
        min: fieldValue.min ?? defaults.min,
        max: fieldValue.max ?? defaults.max,
        step: fieldValue.step ?? defaults.step,
        resourceTemplateId: fieldValue.resourceTemplateId ?? defaults.resourceTemplateId,
        multiSelect: fieldValue.multiSelect ?? defaults.multiSelect,
        itemSetId: fieldValue.itemSetId,
        options: fieldValue.options,
        customVocabId: fieldValue.customVocabId,
        sourceProperties: fieldValue.sourceProperties,
      });
    }
  });

  // Ajouter les médias automatiquement
  result.push({
    key: 'media',
    property: 'associatedMedia',
    label: 'Médias',
    type: 'media',
    zone: 'overview',
  });

  return result;
};

// ========================================
// Helpers pour filtrer les champs par zone
// ========================================

export const getFieldsByZone = (fields: InternalFieldConfig[], zone: FieldZone): InternalFieldConfig[] => {
  return fields.filter((f) => f.zone === zone);
};

export const getHeaderFields = (fields: InternalFieldConfig[]) => getFieldsByZone(fields, 'header');

export const getOverviewFields = (fields: InternalFieldConfig[]) => getFieldsByZone(fields, 'overview');

export const getDetailsFields = (fields: InternalFieldConfig[]) => getFieldsByZone(fields, 'details');
