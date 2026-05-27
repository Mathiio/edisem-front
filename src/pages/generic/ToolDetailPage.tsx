import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '@/theme/components';
import { ConfigurableDetailPage } from './ConfigurableDetailPage';
import { getToolConfigForTemplateId, toolConfig } from './config/toolConfig';
import { getResourceDetails } from '@/services/resourceDetails';
import type { PageMode } from './config';

interface ToolDetailPageProps {
  initialMode?: PageMode;
}

/**
 * Page outil unifiée (chercheur template 114 + étudiant template 129).
 * Même UI ; la config de sauvegarde suit le template Omeka de l'item.
 */
export const ToolDetailPage: React.FC<ToolDetailPageProps> = ({ initialMode = 'view' }) => {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState(toolConfig);
  const [ready, setReady] = useState(!id);

  useEffect(() => {
    if (!id) {
      setConfig(toolConfig);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    getResourceDetails(id)
      .then((details) => {
        if (cancelled) return;
        const templateId = details?.template_id;
        setConfig(getToolConfigForTemplateId(templateId));
      })
      .catch(() => {
        if (!cancelled) setConfig(toolConfig);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!ready) {
    return (
      <div className='col-span-10 flex items-center justify-center py-24'>
        <Spinner size='lg' color='current' className='text-c5' />
      </div>
    );
  }

  return <ConfigurableDetailPage config={config} initialMode={initialMode} />;
};
