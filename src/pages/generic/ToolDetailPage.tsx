import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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

  useEffect(() => {
    if (!id) {
      setConfig(toolConfig);
      return;
    }

    let cancelled = false;

    getResourceDetails(id)
      .then((details) => {
        if (cancelled) return;
        const templateId = details?.template_id;
        setConfig(getToolConfigForTemplateId(templateId));
      })
      .catch(() => {
        if (!cancelled) setConfig(toolConfig);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return <ConfigurableDetailPage config={config} initialMode={initialMode} />;
};
