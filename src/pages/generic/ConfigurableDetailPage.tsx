import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { GenericDetailPage } from './GenericDetailPage';
import { GenericDetailPageConfig, PageMode } from './config';
import { StudentFormWrapper } from '@/components/features/forms/StudentFormWrapper';

interface ConfigurableDetailPageProps {
  config: GenericDetailPageConfig;
  initialMode?: PageMode;
}

/**
 * Wrapper pour utiliser les configs directement dans les routes
 * sans avoir besoin de créer un fichier page séparé
 *
 * Usage dans App.tsx:
 * <Route path='/conference/:id' element={<ConfigurableDetailPage config={conferenceConfig} />} />
 * <Route path='/add-resource/experimentation' element={<ConfigurableDetailPage config={experimentationConfig} initialMode="create" />} />
 *
 * En mode view: affiche GenericDetailPage directement
 * En mode edit/create: utilise StudentFormWrapper pour permettre les onglets
 * formOnly (bibliographie, organisation, etc.) : pas de vue, formulaire direct si :id
 */
export const ConfigurableDetailPage: React.FC<ConfigurableDetailPageProps> = ({ config, initialMode = 'view' }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get('mode') as PageMode | null;

  const effectiveMode: PageMode = (() => {
    if (initialMode === 'create') return 'create';
    if (config.formOnly && id) return 'edit';
    if (urlMode === 'edit') return 'edit';
    if (initialMode !== 'view') return initialMode;
    return 'view';
  })();

  if (effectiveMode === 'view') {
    return <GenericDetailPage config={config} initialMode='view' />;
  }

  return <StudentFormWrapper initialConfig={config} initialMode={effectiveMode} />;
};
