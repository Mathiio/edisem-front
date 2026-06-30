import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import * as Items from '@/services/Items';
import { IntervenantAffiliations } from '@/components/features/pages/intervenants/IntervenantAffiliations';
import { Link } from '@heroui/react';
import { Layouts } from '@/components/layout/Layouts';
import { DynamicBreadcrumbs } from '@/components/layout/DynamicBreadcrumbs';
import { IntervenantKeywordCloud } from '@/components/features/pages/intervenants/IntervenantKeywordCloud';
import { IntervenantNetwork } from '@/components/features/pages/intervenants/IntervenantNetwork';
import { IntervenantInterventions } from '@/components/features/pages/intervenants/IntervenantInterventions';
import { UserIcon } from '@/components/ui/icons';

export const Intervenant: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [actant, setActant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conf, setConf] = useState<any[]>([]);
  const [breadcrumbTitle, setBreadcrumbTitle] = useState('Intervenant');

  const fetchActantData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetches actant details with keyword stats always included
      const actantData = await Items.getActantDetails(id);
      setActant(actantData);
      setConf(actantData?.interventionsList || []);
      
      // Mettre à jour le titre du breadcrumb avec le nom de l'actant
      const firstName = actantData?.firstname;
      const lastName = actantData?.lastname;

      if (firstName && lastName) {
        setBreadcrumbTitle(`${firstName} ${lastName} - Intervenant`);
      } else if (actantData?.title) {
        setBreadcrumbTitle(`${actantData.title} - Intervenant`);
      }
    } catch(e) {
        console.error("Error fetching actant details", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchActantData();
  }, [id, fetchActantData]);

  return (
    <Layouts className='col-span-10 flex flex-col gap-24'>
      <DynamicBreadcrumbs itemTitle={breadcrumbTitle} />
      <div className='flex flex-col items-center gap-20'>
        {loading ? (
          <div className='gap-5 w-full flex flex-col items-center animate-pulse'>
            <div className='w-24 h-24 rounded-2xl bg-c3/50' />
            <div className='flex flex-col items-center gap-2.5'>
              <div className='w-80 h-14 rounded-xl bg-c3/50' />
              <div className='w-40 h-5 rounded-lg bg-c3/50' />
            </div>
          </div>
        ) : (
          <div className='gap-5 text-c6 w-full flex flex-col items-center'>
            {actant?.picture ? (
              <img className='w-24 h-24 object-cover rounded-4xl' src={actant.picture} alt='' />
            ) : (
              <div className='w-24 h-24 rounded-4xl object-cover flex items-center justify-center bg-c3'>
                <UserIcon size={40} className='text-c6' />
              </div>
            )}
            <Link isExternal className='flex flex-col items-center gap-1' href={actant?.url || '#'}>
              <h1 className='text-6xl font-medium text-c6'>{actant?.firstname} {actant?.lastname}</h1>
              <p className='text-base text-c6'>{actant?.interventions} participation{actant?.interventions == 1 ? '' : 's'} sur la plateforme Edisem</p>
            </Link>
          </div>
        )}

        {/* Universités, Écoles, Labos */}
        <div className='w-full'>
          <IntervenantAffiliations
            universities={actant?.universities || []}
            doctoralSchools={actant?.doctoralSchools || []}
            laboratories={actant?.laboratories || []}
            loading={loading}
          />
        </div>
      </div>

      {/* Keyword Cloud */}
      {loading ? (
        <div className='w-full flex flex-col items-center gap-5 animate-pulse'>
          <div className='w-72 h-8 rounded-xl bg-c3/50' />
          <div className='w-full max-w-3xl h-48 rounded-2xl bg-c3/50' />
        </div>
      ) : actant?.keywordStats && (
        <IntervenantKeywordCloud keywordStats={actant.keywordStats} />
      )}

      {/* Proximity Graph */}
      <div className='w-full flex flex-col items-center gap-12'>
        <div className='flex flex-col gap-2 justify-center items-center'>
          <h2 className='text-c6 text-3xl transition-all ease-in-out'>Réseau de proximité</h2>
          <p className='text-base text-c5'>Explorez les intervenants qui partagent des thématiques similaires.</p>
        </div>
        <IntervenantNetwork currentActantId={id!} />
      </div>

      <IntervenantInterventions interventions={conf} loading={loading} />
    </Layouts>
  );
};
