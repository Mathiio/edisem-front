import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as Items from '@/services/Items';
import { UserIcon } from '@/components/ui/icons';
import { Layouts } from '@/components/layout/Layouts';
import { DynamicBreadcrumbs } from '@/components/layout/DynamicBreadcrumbs';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';

export const Personne: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [personne, setPersonne] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  const [breadcrumbTitle, setBreadcrumbTitle] = useState('Personne');

  const fetchPersonneData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await Items.getPersonnes(Number(id));
      setPersonne(data);

      const name = data?.name || `${data?.firstName ?? ''} ${data?.lastName ?? ''}`.trim();
      if (name) setBreadcrumbTitle(`${name} - Personne`);
    } catch (error) {
      console.error('Error fetching personne data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchResources = useCallback(async () => {
    if (!id) return;
    setLoadingResources(true);
    try {
      const data = await Items.getCardsByPersonne(id);
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching personne resources:', error);
    } finally {
      setLoadingResources(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPersonneData();
    fetchResources();
  }, [id, fetchPersonneData, fetchResources]);

  const jobTitles: string[] = personne?.jobTitle?.map((j: any) => j.title ?? j) ?? [];

  return (
    <Layouts className='col-span-10 flex flex-col gap-24'>
      <DynamicBreadcrumbs itemTitle={breadcrumbTitle} />

      {/* Header – avatar + nom + métier */}
      <div className='flex flex-col items-center gap-5'>
        {loading ? (
          <div className='flex flex-col items-center gap-5 animate-pulse'>
            <div className='w-24 h-24 rounded-2xl bg-c3/50' />
            <div className='flex flex-col items-center gap-2.5'>
              <div className='w-80 h-14 rounded-xl bg-c3/50' />
              <div className='w-48 h-5 rounded-lg bg-c3/50' />
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center gap-5 text-c6'>
            {personne?.picture ? (
              <img
                className='w-24 h-24 object-cover rounded-4xl'
                src={personne.picture}
                alt=''
              />
            ) : (
              <div className='w-24 h-24 rounded-4xl flex items-center justify-center bg-c3'>
                <UserIcon size={40} className='text-c6' />
              </div>
            )}
            <div className='flex flex-col items-center gap-1'>
              <h1 className='text-6xl font-medium text-c6'>{personne?.name}</h1>
              {jobTitles.length > 0 && (
                <p className='text-base text-c5'>
                  {jobTitles.length === 1 ? 'Intervient en tant que' : 'Intervient en tant que'} {jobTitles.join(' · ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className='w-full flex justify-center'>
        <div className='w-full max-w-[1000px]'>
          {loading ? (
            <div className='animate-pulse border-c3 border-2 p-6 rounded-3xl flex flex-col gap-3'>
              <div className='w-32 h-5 rounded-lg bg-c3/50' />
              <div className='flex flex-col gap-2'>
                <div className='w-full h-4 rounded-lg bg-c3/50' />
                <div className='w-full h-4 rounded-lg bg-c3/50' />
                <div className='w-3/4 h-4 rounded-lg bg-c3/50' />
              </div>
            </div>
          ) : (
            <div className='bg-c2/40 border-c3 border-2 p-6 rounded-3xl flex flex-col gap-3'>
              {personne?.description ? (
                <p className='text-sm text-c5 leading-relaxed text-center px-1'>{personne.description}</p>
              ) : (
                <p className='text-sm text-c5 italic opacity-50 px-1'>Aucune description disponible.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ressources associées */}
      {(loadingResources || resources.length > 0) && (
        <div className='w-full flex flex-col items-center gap-12'>
          <div className='flex flex-col gap-2 justify-center items-center'>
            {loadingResources ? (
              <div className='flex flex-col items-center gap-2 animate-pulse'>
                <div className='w-52 h-9 rounded-xl bg-c3/50' />
                <div className='w-72 h-5 rounded-lg bg-c3/50' />
              </div>
            ) : (
              <>
                <h2 className='text-c6 text-3xl'>Ressources associées</h2>
                <p className='text-base text-c5'>Découvrez les ressources liées à cette personne</p>
              </>
            )}
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full'>
            {loadingResources
              ? Array.from({ length: 8 }).map((_, i) => <ResourceCardSkeleton key={i} />)
              : resources.map((item, i) => <ResourceCard key={i} item={item} />)}
          </div>
        </div>
      )}
    </Layouts>
  );
};
