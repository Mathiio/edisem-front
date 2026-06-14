import { Layouts } from '@/components/layout/Layouts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addToast } from '@heroui/react';
import { Input, Select, SelectItem, Pagination } from '@/theme/components';
import { CreateResourceAction } from '@/components/features/espaceEtudiant/CreateResourceAction';
import {
  MySpaceResourceRow,
  MySpaceResourceRowSkeleton,
  MY_SPACE_ROW_GRID,
  getResourceRowSubtitle,
} from '@/components/features/espaceEtudiant/MySpaceResourceRow';
import { AlertModal } from '@/components/ui/AlertModal';
import {
  ExperimentationIcon,
  UniversityIcon,
  BookIcon,
  PratiqueNarrativeIcon,
  SeminaireIcon,
  UserIcon,
  ImageIcon,
  BuildingIcon,
  SearchIcon,
} from '@/components/ui/icons';
import { useAuth } from '@/hooks/useAuth';
import { deleteUserResource, getUserResources, type StudentResourceCard } from '@/services/StudentSpace';
import { filterMonEspaceResources, getResourceEditUrl, getRessourceLabel } from '@/config/resourceConfig';
import { experimentationConfigSimplified } from '@/pages/generic/config/experimentationConfig';
import { toolConfigSimplified } from '@/pages/generic/config/toolConfig';
import { conferenceConfigSimplified } from '@/pages/generic/config/conferenceConfig';
import { recitArtitstiqueConfigSimplified } from '@/pages/generic/config/recitArtitstiqueConfig';
import { recitScientifiqueConfigSimplified } from '@/pages/generic/config/recitScientifiqueConfig';
import { recitTechnoConfigSimplified } from '@/pages/generic/config/recitTechnoConfig';
import { recitCitoyenConfigSimplified } from '@/pages/generic/config/recitcitoyenConfig';
import { recitMediatiqueConfigSimplified } from '@/pages/generic/config/recitmediatiqueConfig';
import { bibliographyConfigSimplified } from '@/pages/generic/config/bibliographyConfig';
import { mediagraphyConfigSimplified } from '@/pages/generic/config/mediagraphyConfig';
import { personneConfigSimplified } from '@/pages/generic/config/personneConfig';
import { organisationConfigSimplified } from '@/pages/generic/config/organisationConfig';

const RECENT_COUNT = 5;
const PAGE_SIZE = 10;

const paginationClassNames = {
  wrapper: 'gap-1.5',
  item: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !shadow-none !cursor-pointer data-[hover=true]:!bg-c3',
  cursor: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-action !border-2 !border-c3 !text-selected !font-medium !shadow-none !cursor-pointer',
  prev: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !cursor-pointer data-[disabled=true]:!opacity-40 data-[disabled=true]:!cursor-default',
  next: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !cursor-pointer data-[disabled=true]:!opacity-40 data-[disabled=true]:!cursor-default',
};

const createableConfigs = [
  { config: experimentationConfigSimplified, route: '/add-resource/experimentation-chercheur', icon: ExperimentationIcon, category: 'experimentation', role: 'actant' as const },
  { config: toolConfigSimplified, route: '/add-resource/outil-chercheur', icon: UniversityIcon, category: 'outil', role: 'actant' as const },
  { config: conferenceConfigSimplified, route: '/add-resource/conference', icon: SeminaireIcon, category: 'conference', role: 'actant' as const, label: 'Conférence' },
  { config: personneConfigSimplified, route: '/add-resource/personne', icon: UserIcon, category: 'personne', role: 'actant' as const },
  { config: organisationConfigSimplified, route: '/add-resource/organisation', icon: BuildingIcon, category: 'organisation', role: 'actant' as const },
  { config: recitScientifiqueConfigSimplified, route: '/add-resource/recit-scientifique', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitArtitstiqueConfigSimplified, route: '/add-resource/recit-artistique', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitTechnoConfigSimplified, route: '/add-resource/recit-techno', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitCitoyenConfigSimplified, route: '/add-resource/recit-citoyen', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitMediatiqueConfigSimplified, route: '/add-resource/recit-mediatique', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: bibliographyConfigSimplified, route: '/add-resource/bibliographie', icon: BookIcon, category: 'bibliographie', role: 'any' as const },
  { config: mediagraphyConfigSimplified, route: '/add-resource/mediagraphie', icon: ImageIcon, category: 'mediagraphie', role: 'any' as const },
];

type ResourceCategory =
  | 'all'
  | 'conference'
  | 'recit'
  | 'experimentation'
  | 'organisation'
  | 'bibliographie'
  | 'mediagraphie'
  | 'personne'
  | 'outil';

type SortOrder = 'asc' | 'desc';

const TYPE_FILTERS: { key: ResourceCategory; label: string }[] = [
  { key: 'all', label: 'Toutes les ressources' },
  { key: 'conference', label: 'Conférences' },
  { key: 'recit', label: 'Récits' },
  { key: 'experimentation', label: 'Expérimentations' },
  { key: 'organisation', label: 'Organisations' },
  { key: 'bibliographie', label: 'Bibliographies' },
  { key: 'mediagraphie', label: 'Médiagraphies' },
  { key: 'personne', label: 'Personnes' },
  { key: 'outil', label: 'Outils' },
];

const EXCLUDED_TYPES = new Set(['experimentation_etudiant', 'outil_etudiant', 'retour_experience_etudiant', 'retour_experience']);

function getResourceCategory(type: string | undefined): ResourceCategory | null {
  if (!type) return null;
  if (type.includes('seminaire') || type.includes('conference') || type.includes('colloque') || type === 'journee_etudes') {
    return 'conference';
  }
  if (type.includes('recit')) return 'recit';
  if (type === 'experimentation') return 'experimentation';
  if (type === 'organisation') return 'organisation';
  if (type === 'bibliographie') return 'bibliographie';
  if (type === 'mediagraphie') return 'mediagraphie';
  if (type === 'personne') return 'personne';
  if (type === 'outil') return 'outil';
  return null;
}

function sortByModifiedDesc(a: StudentResourceCard, b: StudentResourceCard): number {
  return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
}

function sortByTitle(a: StudentResourceCard, b: StudentResourceCard, order: SortOrder): number {
  const cmp = (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
  return order === 'asc' ? cmp : -cmp;
}

function matchesSearch(item: StudentResourceCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [item.title, getResourceRowSubtitle(item), getRessourceLabel(item.type)].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

export const MonEspace4: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [allResources, setAllResources] = useState<StudentResourceCard[]>([]);
  const [typeFilter, setTypeFilter] = useState<ResourceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isActant = userData?.type === 'actant';

  const filteredCreateableConfigs = useMemo(
    () => createableConfigs.filter((c) => c.role === 'any' || isActant),
    [isActant],
  );

  const fullName = useMemo(() => {
    if (userData?.firstname && userData?.lastname) return `${userData.firstname} ${userData.lastname}`;
    return userData?.firstname || userData?.lastname || 'Utilisateur';
  }, [userData?.firstname, userData?.lastname]);

  const userTypeLabel = useMemo(() => {
    switch (userData?.type) {
      case 'actant':
        return 'Actant';
      case 'student':
        return 'Étudiant';
      default:
        return 'Membre';
    }
  }, [userData?.type]);

  const CACHE_KEY = useMemo(() => {
    const omekaUserId = userData?.omekaUserId ?? localStorage.getItem('omekaUserId');
    return omekaUserId ? `monespace4_resources_${omekaUserId}` : null;
  }, [userData?.omekaUserId]);

  // Charger le cache session immédiatement (avant le premier fetch)
  useEffect(() => {
    if (!CACHE_KEY) return;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: StudentResourceCard[] = JSON.parse(cached);
        if (parsed.length > 0) {
          setAllResources(parsed);
          setLoading(false); // Afficher le cache en attendant le rafraîchissement
        }
      }
    } catch {
      // Cache corrompu — ignorer
    }
  }, [CACHE_KEY]);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(() => {
        // Ne pas afficher le spinner si on a déjà du contenu (re-fetch silencieux)
        const hasCached = CACHE_KEY ? sessionStorage.getItem(CACHE_KEY) != null : false;
        return hasCached ? false : true;
      });
      const userId = localStorage.getItem('userId');
      const omekaUserId =
        userData?.omekaUserId ??
        (localStorage.getItem('omekaUserId') ? parseInt(localStorage.getItem('omekaUserId')!, 10) : null);
      if (!userId && !omekaUserId) return;

      const resources = await getUserResources(userId ? parseInt(userId, 10) : 0, omekaUserId);
      const filtered = filterMonEspaceResources(resources)
        .filter((r) => !EXCLUDED_TYPES.has(r.type))
        .filter((r) => getResourceCategory(r.type) != null)
        .sort(sortByModifiedDesc);

      setAllResources(filtered);

      // Mettre en cache pour la prochaine visite
      if (CACHE_KEY && filtered.length > 0) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
        } catch {
          // sessionStorage plein — ignorer
        }
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }, [userData?.omekaUserId, CACHE_KEY]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const recentResources = useMemo(() => allResources.slice(0, RECENT_COUNT), [allResources]);
  const recentIds = useMemo(() => new Set(recentResources.map((r) => String(r.id))), [recentResources]);

  const tableResources = useMemo(() => {
    let items = allResources.filter((r) => !recentIds.has(String(r.id)));

    if (typeFilter !== 'all') {
      items = items.filter((r) => getResourceCategory(r.type) === typeFilter);
    }

    if (searchQuery.trim()) {
      items = items.filter((r) => matchesSearch(r, searchQuery));
    }

    return [...items].sort((a, b) => sortByTitle(a, b, sortOrder));
  }, [allResources, recentIds, typeFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(tableResources.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [typeFilter, searchQuery, sortOrder]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedResources = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tableResources.slice(start, start + PAGE_SIZE);
  }, [tableResources, page]);

  const handleCreateResource = useCallback((route: string) => navigate(route), [navigate]);

  const handleEdit = useCallback(
    (id: string, type?: string) => {
      if (type) {
        navigate(getResourceEditUrl(type, id));
        return;
      }
      navigate(getResourceEditUrl('experimentation', id));
    },
    [navigate],
  );

  const handleDeleteClick = useCallback(
    (id: string) => {
      const item = allResources.find((r) => String(r.id) === String(id));
      if (item) {
        setItemToDelete({ id, title: item.title || 'Sans titre' });
        setDeleteModalOpen(true);
      }
    },
    [allResources],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserResource(itemToDelete.id);
      setAllResources((prev) => prev.filter((item) => String(item.id) !== String(itemToDelete.id)));
      addToast({ title: 'Succès', description: 'Ressource supprimée.', color: 'success' });
      await fetchResources();
    } catch (error) {
      console.error('Error deleting:', error);
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la suppression.',
        color: 'danger',
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, fetchResources]);

  return (
    <Layouts className='col-span-10 flex flex-col gap-12 z-0 overflow-visible'>
      {/* En-tête profil + création */}
      <div className='flex flex-col gap-6 pt-16'>
        <div className='flex items-center justify-between gap-6 flex-wrap'>
          <div className='flex items-center gap-5 min-w-0'>
            <div className='size-18 rounded-xl bg-gradient-to-br from-c3 to-c2 flex items-center justify-center border-2 border-c3 overflow-hidden shrink-0'>
              {userData?.picture ? (
                <img src={userData.picture} alt={fullName} className='w-full h-full object-cover' />
              ) : (
                <UserIcon size={32} className='text-c5' />
              )}
            </div>
            <div className='flex flex-col min-w-0'>
              <h1 className='text-3xl text-c6 font-semibold truncate'>{fullName}</h1>
              <div className='flex items-center gap-2.5 flex-wrap'>
                <span className='text-c4 text-sm'>{userTypeLabel}</span>
                <span className='text-c3'>|</span>
                <span className='text-c4 text-sm'>
                  {allResources.length} ressource{allResources.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {filteredCreateableConfigs.length > 0 && (
            <CreateResourceAction
              configs={filteredCreateableConfigs}
              onCreate={handleCreateResource}
              triggerLabel='Créer une ressource'
              menuLabel='Créer une ressource'
            />
          )}
        </div>
      </div>

      {/* Dernières modifications */}
      <section className='flex flex-col gap-4'>
        <h2 className='text-xl text-c6 font-semibold'>Dernières modifications</h2>

        <div className={`hidden lg:grid ${MY_SPACE_ROW_GRID} gap-x-4 px-4 text-c4 text-xs uppercase tracking-wide`}>
          <span className='w-12' />
          <span>Titre</span>
          <span>Contributeur / org.</span>
          <span>Type</span>
          <span className='text-right pr-1'>Actions</span>
        </div>

        {loading ? (
          <div className='flex flex-col gap-2'>
            {Array.from({ length: 3 }).map((_, i) => (
              <MySpaceResourceRowSkeleton key={i} />
            ))}
          </div>
        ) : recentResources.length === 0 ? (
          <p className='text-c4 text-sm py-4'>Aucune ressource pour le moment.</p>
        ) : (
          <div className='flex flex-col gap-2'>
            {recentResources.map((item) => (
              <MySpaceResourceRow
                key={`recent-${item.type}-${item.id}`}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </section>

      {/* Tableau principal */}
      <section className='flex flex-col gap-4'>
        <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
          <h2 className='text-xl text-c6 font-semibold'>Toutes mes ressources</h2>
          <p className='text-c4 text-sm'>
            {tableResources.length} élément{tableResources.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Recherche → filtre → tri */}
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end'>
          <Input
            aria-label='Rechercher une ressource'
            placeholder='Rechercher une ressource…'
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<SearchIcon size={16} className='text-c5 shrink-0' />}
            className='flex-1 min-w-0'
            classNames={{ inputWrapper: '!min-h-[44px]' }}
          />

          <Select
            size='sm'
            selectedKeys={[typeFilter]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key) setTypeFilter(String(key) as ResourceCategory);
            }}
            className='w-full lg:w-56'
            aria-label='Filtrer par type de ressource'>
            {TYPE_FILTERS.map(({ key, label }) => (
              <SelectItem key={key} className='text-c6 hover:bg-c3'>
                {label}
              </SelectItem>
            ))}
          </Select>

          <Select
            size='sm'
            selectedKeys={[sortOrder]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key === 'asc' || key === 'desc') setSortOrder(key);
            }}
            className='w-full lg:w-44'
            aria-label='Trier les ressources'>
            <SelectItem key='asc' className='text-c6 hover:bg-c3'>
              A → Z
            </SelectItem>
            <SelectItem key='desc' className='text-c6 hover:bg-c3'>
              Z → A
            </SelectItem>
          </Select>
        </div>

        <div className={`hidden lg:grid ${MY_SPACE_ROW_GRID} gap-x-4 px-4 text-c4 text-xs uppercase tracking-wide`}>
          <span className='w-12' />
          <span>Titre</span>
          <span>Contributeur / org.</span>
          <span>Type</span>
          <span className='text-right pr-1'>Actions</span>
        </div>

        {loading ? (
          <div className='flex flex-col gap-2'>
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <MySpaceResourceRowSkeleton key={i} />
            ))}
          </div>
        ) : paginatedResources.length === 0 ? (
          <div className='border-2 border-dashed border-c3 rounded-xl py-12 text-center text-c4 text-sm'>
            Aucune ressource ne correspond à votre recherche.
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            {paginatedResources.map((item) => (
              <MySpaceResourceRow
                key={`table-${item.type}-${item.id}`}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}

        {!loading && tableResources.length > PAGE_SIZE && (
          <div className='flex justify-end pt-1'>
            <Pagination
              total={totalPages}
              page={page}
              onChange={setPage}
              showControls
              radius='lg'
              classNames={paginationClassNames}
            />
          </div>
        )}
      </section>

      <AlertModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title='Confirmer la suppression'
        type='danger'
        confirmLabel='Supprimer'
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        description={
          <>
            <p>
              Êtes-vous sûr de vouloir supprimer la ressource{' '}
              <span className='text-c6 font-medium'>&quot;{itemToDelete?.title}&quot;</span> ?
            </p>
            <p className='text-c4 text-sm mt-2.5'>Cette action est irréversible.</p>
          </>
        }
      />
    </Layouts>
  );
};
