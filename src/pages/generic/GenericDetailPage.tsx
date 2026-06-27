/**
 * GenericDetailPage — routeur léger
 *
 * Choisit entre le mode affichage (GenericViewPage) et le mode
 * édition/création (GenericEditPage) selon l'URL et les props.
 *
 * Toute la logique métier vit dans les deux composants dédiés.
 */
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { GenericDetailPageConfig, PageMode } from './config';
import { GenericEditPage, GenericEditPageProps } from './GenericEditPage';
import { GenericViewPage } from './GenericViewPage';

// ================================
// Types partagés (réexportés pour les consommateurs existants)
// ================================
export interface PendingLink {
  linkedField: string;
  resourceId: string | number;
  resourceTitle?: string;
}

export interface GenericDetailPageProps {
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
}

// ================================
// Routeur
// ================================
export const GenericDetailPage: React.FC<GenericDetailPageProps> = (props) => {
  const { initialMode = 'view', itemId: propItemId, parentResourceId } = props;
  const [searchParams] = useSearchParams();

  const urlMode = searchParams.get('mode') as PageMode | null;

  // Un brouillon est une ressource principale créée via CreateResourcePage (?draft=1),
  // jamais encore publiée. Ne s'applique pas aux onglets enfants.
  const isDraft =
    searchParams.get('draft') === '1' &&
    initialMode !== 'create' &&
    parentResourceId == null;

  // Mode effectif : props > URL > défaut
  const effectiveMode: PageMode =
    initialMode !== 'view' ? initialMode : urlMode === 'edit' ? 'edit' : 'view';

  const isEditing = effectiveMode === 'edit' || effectiveMode === 'create' || isDraft;

  if (isEditing) {
    const editProps: GenericEditPageProps = {
      ...props,
      initialMode: effectiveMode as 'edit' | 'create',
      isDraft,
    };
    return <GenericEditPage {...editProps} />;
  }

  return <GenericViewPage config={props.config} itemId={propItemId} />;
};
