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

export type ViewRenderType = 'text' | 'items' | 'references' | 'categories' | 'citations' | 'microresumes' | 'custom';

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

  /** Template IDs multiples (pour les references avec bibliographies et mediagraphies) */
  resourceTemplateIds?: number[];

  /** Fonction de rendu custom (pour renderType='custom') */
  customRender?: (context: import('./config').RenderContentContext) => React.ReactNode;
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

  /** Formulaire d'édition activé */
  formEnabled?: boolean;

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
