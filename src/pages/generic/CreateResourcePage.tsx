import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { Button } from '@/theme/components/button';
import { GenericDetailPageConfig } from './config';
import { getResourceEditUrl } from '@/config/resourceConfig';
import { getAutoContributorConfig } from './resourceHelpers';
import { getTemplatePropertiesMap } from '@/services/Items';
import { OMEKA_API_BASE as API_BASE, omekaApiUrl } from '@/utils/omekaApi';

interface CreateResourcePageProps {
  config: GenericDetailPageConfig;
}

/**
 * Page de transition pour la création d'une ressource en mode "draft-first".
 *
 * Flux :
 *  1. Monte avec un spinner
 *  2. Crée immédiatement un item minimal (privé) dans Omeka S
 *  3. Redirige vers la page d'édition de cet item avec ?draft=1
 *
 * Avantages :
 *  - La ressource a un ID dès le début → les enfants créés via les onglets peuvent s'y lier
 *  - "Annuler" dans le formulaire = supprimer le brouillon (et ses enfants) en cascade
 *  - Aucun orphelin possible
 */
export const CreateResourcePage: React.FC<CreateResourcePageProps> = ({ config }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    // attemptedRef empêche la double exécution de React Strict Mode.
    // On n'utilise PAS de flag "cancelled" car la navigation depuis un effet nettoyé
    // fonctionne correctement avec React Router v6 et évite que createDraft() se
    // termine sans naviguer après le double-mount de Strict Mode.
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    async function createDraft() {
      try {
        if (!config.resourceTemplateId) {
          throw new Error('resourceTemplateId non défini dans la config');
        }

        const omekaUserId = localStorage.getItem('omekaUserId');
        const userId = localStorage.getItem('userId');
        const courseId = searchParams.get('courseId');

        const propMap = await getTemplatePropertiesMap(config.resourceTemplateId);

        const itemData: Record<string, any> = {
          'o:resource_template': { 'o:id': config.resourceTemplateId },
          'o:is_public': false,
        };

        if (omekaUserId && parseInt(omekaUserId, 10) > 0) {
          itemData['o:owner'] = { 'o:id': parseInt(omekaUserId, 10) };
        }

        if (courseId) {
          const coursePropertyId = propMap['dcterms:isPartOf'] || 33;
          itemData['dcterms:isPartOf'] = [
            {
              type: 'resource',
              property_id: coursePropertyId,
              value_resource_id: parseInt(courseId, 10),
              is_public: true,
            },
          ];
        }

        // Pré-remplir le contributeur automatique (personne connectée)
        const autoContributor = getAutoContributorConfig(config.resourceTemplateId);
        if (autoContributor && userId) {
          const contributorId = parseInt(userId, 10);
          const contributorPropertyId = propMap[autoContributor.property];
          if (contributorId && contributorPropertyId) {
            itemData[autoContributor.property] = [
              {
                type: 'resource',
                property_id: contributorPropertyId,
                value_resource_id: contributorId,
                is_public: true,
              },
            ];
          }
        }

        const response = await fetch(omekaApiUrl(`${API_BASE}items`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Erreur ${response.status} lors de la création du brouillon : ${errorBody}`);
        }

        const result = await response.json();
        const newId: number = result['o:id'];

        if (!newId) {
          throw new Error("L'API n'a pas retourné d'identifiant pour la ressource créée.");
        }

        // Construire l'URL d'édition en ajoutant ?draft=1 (et éventuellement courseId)
        const editUrl = getResourceEditUrl(config.type || '', newId);
        const courseParam = courseId ? `&courseId=${courseId}` : '';
        navigate(`${editUrl}&draft=1${courseParam}`, { replace: true });
      } catch (err: any) {
        console.error('[CreateResourcePage] Draft creation failed:', err);
        setError(err.message || 'Erreur lors de la création de la ressource');
      }
    }

    createDraft();
  }, []);

  if (error) {
    return (
      <div className='bg-c1 flex flex-col items-center justify-center min-h-[100vh] gap-4'>
        <p className='text-danger text-sm'>{error}</p>
        <Button variant='light' className='text-c5' onPress={() => window.history.back()}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className='bg-c1 flex flex-col items-center justify-center min-h-[100vh] gap-4'>
      <Spinner size='lg' color='current' className='text-c5' />
      <p className='text-c5 text-sm'>Création de la ressource en cours…</p>
    </div>
  );
};
