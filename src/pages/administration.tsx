import { Layouts } from '@/components/layout/Layouts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, SelectItem, Pagination, addToast } from '@/theme/components';
import {
  MySpaceResourceRow,
  MySpaceResourceRowSkeleton,
  getResourceRowSubtitle,
} from '@/components/features/espaceEtudiant/MySpaceResourceRow';
import { AlertModal } from '@/components/ui/AlertModal';
import { SearchIcon, SettingsIcon } from '@/components/ui/icons';
import {
  GLOBAL_ADMIN_TEMPLATE_OPTIONS,
  getGlobalAdminEditUrl,
  getResourceUrl,
} from '@/config/resourceConfig';
import {
  fetchGlobalAdminCatalog,
  fetchGlobalAdminOwners,
  fetchGlobalAdminRecent,
  type AdminResourceCard,
  type OmekaOwnerOption,
} from '@/services/globalAdminApi';
import { deleteUserResource } from '@/services/UserSpace';

const RECENT_COUNT = 20;
const PAGE_SIZE = 10;
const CATALOG_LIMIT = 100;

const paginationClassNames = {
  wrapper: 'gap-1.5',
  item: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !shadow-none !cursor-pointer data-[hover=true]:!bg-c3',
  cursor: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-action !border-2 !border-c3 !text-selected !font-medium !shadow-none !cursor-pointer',
  prev: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !cursor-pointer data-[disabled=true]:!opacity-40 data-[disabled=true]:!cursor-default',
  next: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !cursor-pointer data-[disabled=true]:!opacity-40 data-[disabled=true]:!cursor-default',
};

type SortOrder = 'asc' | 'desc';

function getAdminRowSubtitle(item: AdminResourceCard): string {
  if (item.owner_name) return item.owner_name;
  return getResourceRowSubtitle(item);
}

function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function ResourceTablePagination({
  totalItems,
  page,
  onPageChange,
}: {
  totalItems: number;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (totalItems <= PAGE_SIZE) return null;

  return (
    <div className='flex justify-end pt-1'>
      <Pagination
        total={totalPages}
        page={page}
        onChange={onPageChange}
        showControls
        radius='lg'
        classNames={paginationClassNames}
      />
    </div>
  );
}

export const AdministrationPage: React.FC = () => {
  const navigate = useNavigate();

  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingOwners, setLoadingOwners] = useState(true);

  const [recentResources, setRecentResources] = useState<AdminResourceCard[]>([]);
  const [catalogResources, setCatalogResources] = useState<AdminResourceCard[]>([]);
  const [owners, setOwners] = useState<OmekaOwnerOption[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [recentPage, setRecentPage] = useState(1);
  const [catalogPage, setCatalogPage] = useState(1);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ownerSelectItems = useMemo(
    () => [
      { key: 'all', label: 'Tous' },
      ...owners.map((owner) => ({
        key: String(owner.id),
        label: owner.name || owner.email || `Utilisateur ${owner.id}`,
      })),
    ],
    [owners],
  );

  const templateSelectItems = useMemo(
    () => [{ key: 'all', label: 'Tous les types' }, ...GLOBAL_ADMIN_TEMPLATE_OPTIONS.map((opt) => ({ key: String(opt.id), label: opt.label }))],
    [],
  );

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      setRecentResources(await fetchGlobalAdminRecent());
    } catch (error) {
      console.error('Error loading recent admin resources:', error);
      setRecentResources([]);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const loadOwners = useCallback(async () => {
    setLoadingOwners(true);
    try {
      setOwners(await fetchGlobalAdminOwners());
    } catch (error) {
      console.error('Error loading Omeka owners:', error);
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const data = await fetchGlobalAdminCatalog({
        q: searchQuery.trim() || undefined,
        ownerId: ownerFilter !== 'all' ? Number(ownerFilter) : undefined,
        templateId: templateFilter !== 'all' ? Number(templateFilter) : undefined,
        sort: sortOrder,
      });
      setCatalogResources(data.items ?? []);
    } catch (error) {
      console.error('Error loading admin catalog:', error);
      setCatalogResources([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, [searchQuery, ownerFilter, templateFilter, sortOrder]);

  useEffect(() => {
    void loadRecent();
    void loadOwners();
  }, [loadRecent, loadOwners]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setCatalogPage(1);
  }, [searchQuery, ownerFilter, templateFilter, sortOrder]);

  const filteredCatalog = useMemo(() => catalogResources, [catalogResources]);

  const paginatedRecent = useMemo(
    () => paginateItems(recentResources, recentPage, PAGE_SIZE),
    [recentResources, recentPage],
  );

  const paginatedCatalog = useMemo(
    () => paginateItems(filteredCatalog, catalogPage, PAGE_SIZE),
    [filteredCatalog, catalogPage],
  );

  const recentTotalPages = Math.max(1, Math.ceil(recentResources.length / PAGE_SIZE));
  const catalogTotalPages = Math.max(1, Math.ceil(filteredCatalog.length / PAGE_SIZE));

  useEffect(() => {
    if (recentPage > recentTotalPages) setRecentPage(recentTotalPages);
  }, [recentPage, recentTotalPages]);

  useEffect(() => {
    if (catalogPage > catalogTotalPages) setCatalogPage(catalogTotalPages);
  }, [catalogPage, catalogTotalPages]);

  const handleEdit = useCallback(
    (id: string, type?: string) => {
      if (type) {
        navigate(getGlobalAdminEditUrl(type, id));
        return;
      }
      navigate(getGlobalAdminEditUrl('experimentation', id));
    },
    [navigate],
  );

  const handleView = useCallback(
    (id: string, type?: string) => {
      if (type) {
        navigate(getResourceUrl(type, id));
        return;
      }
      navigate(getResourceUrl('experimentation', id));
    },
    [navigate],
  );

  const handleDeleteClick = useCallback(
    (id: string) => {
      const item =
        recentResources.find((r) => String(r.id) === String(id)) ??
        catalogResources.find((r) => String(r.id) === String(id));
      if (item) {
        setItemToDelete({ id, title: item.title || 'Sans titre' });
        setDeleteModalOpen(true);
      }
    },
    [recentResources, catalogResources],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserResource(itemToDelete.id);
      const deletedId = String(itemToDelete.id);
      setRecentResources((prev) => prev.filter((item) => String(item.id) !== deletedId));
      setCatalogResources((prev) => prev.filter((item) => String(item.id) !== deletedId));
      setDeleteModalOpen(false);
      setItemToDelete(null);
      addToast({ title: 'Succès', description: 'Ressource supprimée.', color: 'success' });
      void loadRecent();
      void loadCatalog();
    } catch (error) {
      console.error('Error deleting resource:', error);
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la suppression.',
        color: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, loadRecent, loadCatalog]);

  const mapRow = (item: AdminResourceCard, keyPrefix: string) => (
    <MySpaceResourceRow
      key={`${keyPrefix}-${item.type}-${item.id}`}
      item={item}
      subtitleOverride={getAdminRowSubtitle(item)}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDeleteClick}
    />
  );

  return (
    <Layouts className='col-span-10 flex flex-col gap-12 z-0 overflow-visible'>
      <div className='flex flex-col gap-2 pt-16'>
        <div className='flex items-center gap-3'>
          <SettingsIcon size={28} className='text-c5 shrink-0' />
          <div className='flex flex-col'>
            <h1 className='text-3xl text-c6 font-semibold'>Administration</h1>
            <p className='text-c4 text-sm max-w-2xl'>
              Gestion globale des ressources Edisem. 
            </p>
          </div>
        </div>
      </div>

      <section className='flex flex-col gap-4'>
        <h2 className='text-xl text-c6 font-semibold'>Dernières modifications</h2>
        <p className='text-c4 text-sm -mt-4'>
          Les {RECENT_COUNT} ressources modifiées le plus récemment (tous types confondus).
        </p>

        {loadingRecent && recentResources.length === 0 ? (
          <div className='flex flex-col gap-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <MySpaceResourceRowSkeleton key={i} />
            ))}
          </div>
        ) : recentResources.length === 0 ? (
          <div className='border-2 border-c3 rounded-xl py-12 text-center text-c4 text-sm'>
            Aucune ressource trouvée.
          </div>
        ) : (
          <>
            <div className='flex flex-col gap-2'>
              {paginatedRecent.map((item) => mapRow(item, 'recent'))}
            </div>
            <ResourceTablePagination
              totalItems={recentResources.length}
              page={recentPage}
              onPageChange={setRecentPage}
            />
          </>
        )}
      </section>

      <section className='flex flex-col gap-4'>
        <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
          <h2 className='text-xl text-c6 font-semibold'>Catalogue</h2>
          <p className='text-c4 text-sm'>
            {loadingCatalog
              ? 'Chargement…'
              : `${filteredCatalog.length} élément${filteredCatalog.length !== 1 ? 's' : ''}${
                  filteredCatalog.length >= CATALOG_LIMIT ? ` (max. ${CATALOG_LIMIT})` : ''
                }`}
          </p>
        </div>

        <div className='flex flex-col gap-3 xl:flex-row xl:items-end xl:flex-wrap'>
          <Input
            aria-label='Rechercher une ressource'
            placeholder='Rechercher une ressource…'
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<SearchIcon size={16} className='text-c5 shrink-0' />}
            className='flex-1 min-w-[220px]'
            classNames={{ inputWrapper: '!min-h-[44px]' }}
          />

          <Select
            size='sm'
            label='Propriétaire'
            selectedKeys={[ownerFilter]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key) setOwnerFilter(String(key));
            }}
            className='w-full sm:w-56'
            isLoading={loadingOwners}
            aria-label='Filtrer par propriétaire'>
            {ownerSelectItems.map((item) => (
              <SelectItem key={item.key} textValue={item.label}>
                {item.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            size='sm'
            label='Type'
            selectedKeys={[templateFilter]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key) setTemplateFilter(String(key));
            }}
            className='w-full sm:w-56'
            aria-label='Filtrer par type'>
            {templateSelectItems.map((item) => (
              <SelectItem key={item.key}>{item.label}</SelectItem>
            ))}
          </Select>

          <Select
            size='sm'
            label='Tri'
            selectedKeys={[sortOrder]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key === 'asc' || key === 'desc') setSortOrder(key);
            }}
            className='w-full sm:w-44'
            aria-label='Tri par titre'>
            <SelectItem key='asc'>Titre A → Z</SelectItem>
            <SelectItem key='desc'>Titre Z → A</SelectItem>
          </Select>
        </div>

        {loadingCatalog ? (
          <div className='flex flex-col gap-2'>
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <MySpaceResourceRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className='border-2 border-c3 rounded-xl py-12 text-center text-c4 text-sm'>
            Aucun résultat pour ces critères.
          </div>
        ) : (
          <>
            <div className='flex flex-col gap-2'>
              {paginatedCatalog.map((item) => mapRow(item, 'catalog'))}
            </div>
            <ResourceTablePagination
              totalItems={filteredCatalog.length}
              page={catalogPage}
              onPageChange={setCatalogPage}
            />
          </>
        )}
      </section>

      <AlertModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
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
            <p className='text-c4 text-sm mt-2.5'>
              Les ressources liées non transverses (analyses, retours, éléments narratifs ou esthétiques) seront
              également supprimées. Cette action est irréversible.
            </p>
          </>
        }
      />
    </Layouts>
  );
};

export default AdministrationPage;
