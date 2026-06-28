import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Chip,
  Avatar,
} from '@heroui/react';
import { addToast } from '@/theme/components';
import {
  Button,
  outlineButtonClass,
  primaryButtonClass,
  cancelButtonClass,
} from '@/theme/components/button';
import { Input, Select, SelectItem, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/theme/components';
import { Layouts } from '@/components/layout/Layouts';
import { ChainLinkIcon, UserIcon, UploadIcon, TrashIcon, EditIcon } from '@/components/ui/icons';
import { ModalTitle } from '@/components/ui/ModalTitle';
import { AlertModal } from '@/components/ui/AlertModal';
import { MySpaceActionButton } from '@/components/features/espaceEtudiant/MySpaceResourceRow';
import {
  AdminListToolbar,
  AdminListPagination,
  AdminListEmptyState,
  adminTableClassNames,
  adminActionsWrapperClass,
} from '@/components/features/admin/AdminListToolbar';
import { matchesAdminSearch, sortByStringField } from '@/components/features/admin/adminListConfig';
import { useAdminListControls } from '@/hooks/useAdminListControls';
import { getActantsForLogin, linkActantToUser, createOmekaUserForActant, createActantWithUser, deleteActant, type Actant } from '@/services/UserSpace';

// Types
interface OmekaUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created: string;
}

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=UserSpace';

// Récupérer les utilisateurs Omeka S
async function fetchOmekaUsers(): Promise<OmekaUser[]> {
  const url = `${API_BASE}&action=getOmekaUsers&json=1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des utilisateurs');
  }
  return await response.json();
}

interface ActantManagementProps {
  embedded?: boolean;
}

export const ActantManagement: React.FC<ActantManagementProps> = ({ embedded = false }) => {
  const [actants, setActants] = useState<Actant[]>([]);
  const [omekaUsers, setOmekaUsers] = useState<OmekaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedActant, setSelectedActant] = useState<Actant | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form pour création d'utilisateur
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('author');

  // Import batch
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchRole, setBatchRole] = useState('author');
  const [batchResults, setBatchResults] = useState<Array<{ name: string; email: string; success: boolean; error?: string }>>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Suppression
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actantToDelete, setActantToDelete] = useState<Actant | null>(null);
  const [deleteUserToo, setDeleteUserToo] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActant, setEditingActant] = useState<Actant | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editFirstname, setEditFirstname] = useState('');
  const [editLastname, setEditLastname] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [actantsData, usersData] = await Promise.all([getActantsForLogin(), fetchOmekaUsers()]);
      setActants(Array.isArray(actantsData) ? actantsData : []);
      setOmekaUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('[ActantManagement] Error loading data:', error);
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les données',
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mode pour la modal de liaison : 'link' ou 'create'
  const [linkMode, setLinkMode] = useState<'link' | 'create'>('link');

  const handleOpenLink = (actant: Actant) => {
    setSelectedActant(actant);
    setSelectedUserId(actant.omekaUserId || null);
    // Pré-remplir les champs de création avec les infos de l'actant
    setNewUserEmail(actant.mail || '');
    setNewUserName(actant.title || `${actant.firstname} ${actant.lastname}`.trim() || '');
    setNewUserRole('author');
    setLinkMode('link');
    setIsLinkModalOpen(true);
  };

  const handleLink = async () => {
    if (!selectedActant || !selectedUserId) return;

    setSubmitting(true);
    try {
      await linkActantToUser(selectedActant.id, selectedUserId);
      addToast({
        title: 'Succès',
        description: "Actant lié à l'utilisateur Omeka S",
        classNames: { base: 'bg-success text-white' },
      });
      setIsLinkModalOpen(false);
      loadData();
    } catch (error: any) {
      addToast({
        title: 'Erreur',
        description: error.message,
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!selectedActant || !newUserEmail || !newUserName) {
      addToast({
        title: 'Erreur',
        description: 'Email et nom requis',
        classNames: { base: 'bg-danger text-white' },
      });
      return;
    }

    setSubmitting(true);
    try {
      await createOmekaUserForActant(selectedActant.id, newUserEmail, newUserName, newUserRole);
      addToast({
        title: 'Succès',
        description: "Utilisateur Omeka S créé et lié à l'actant",
        classNames: { base: 'bg-success text-white' },
      });
      setIsLinkModalOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('author');
      loadData();
    } catch (error: any) {
      addToast({
        title: 'Erreur',
        description: error.message,
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Parse le texte pour extraire nom et email
  // Formats supportés:
  // - "Prénom Nom <email@domain.com>"
  // - "Nom, Prénom <email@domain.com>"
  // - "Prénom Nom email@domain.com <email@domain.com>"
  const parseActantLine = (line: string): { name: string; email: string } | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Chercher l'email entre < >
    const emailMatch = trimmed.match(/<([^>]+@[^>]+)>/);
    if (emailMatch) {
      const email = emailMatch[1].trim();
      // Enlever l'email et tout ce qui est après pour garder juste le nom
      let name = trimmed.replace(/<[^>]+>/, '').trim();
      // Nettoyer les emails en double qui peuvent apparaître avant le < >
      name = name.replace(/\S+@\S+/g, '').trim();
      // Si format "Nom, Prénom", inverser
      if (name.includes(',')) {
        const parts = name.split(',').map((p) => p.trim());
        name = `${parts[1]} ${parts[0]}`;
      }
      return { name, email };
    }

    // Sinon chercher un email simple
    const simpleEmailMatch = trimmed.match(/(\S+@\S+)/);
    if (simpleEmailMatch) {
      const email = simpleEmailMatch[1];
      const name = trimmed.replace(email, '').trim();
      return { name: name || email.split('@')[0], email };
    }

    return null;
  };

  // Traiter l'import batch
  const handleBatchImport = async () => {
    const lines = batchInput.split('\n').filter((l) => l.trim());
    const parsed = lines.map(parseActantLine).filter((p): p is { name: string; email: string } => p !== null);

    if (parsed.length === 0) {
      addToast({
        title: 'Erreur',
        description: 'Aucune entrée valide trouvée',
        classNames: { base: 'bg-danger text-white' },
      });
      return;
    }

    setBatchProcessing(true);
    setBatchResults([]);

    const results: Array<{ name: string; email: string; success: boolean; error?: string }> = [];

    for (const entry of parsed) {
      try {
        await createActantWithUser(entry.email, entry.name, batchRole);
        results.push({ ...entry, success: true });
      } catch (error: any) {
        results.push({ ...entry, success: false, error: error.message });
      }
      setBatchResults([...results]);
    }

    setBatchProcessing(false);

    const successCount = results.filter((r) => r.success).length;
    addToast({
      title: 'Import terminé',
      description: `${successCount}/${results.length} actant(s) créé(s) avec succès`,
      classNames: { base: successCount === results.length ? 'bg-success text-white' : 'bg-warning text-white' },
    });

    if (successCount > 0) {
      loadData();
    }
  };

  // Ouvrir la modal d'édition
  const handleOpenEdit = (actant: Actant) => {
    setEditingActant(actant);
    setEditEmail(actant.mail || '');
    setEditName(actant.title || '');
    setEditFirstname(actant.firstname || '');
    setEditLastname(actant.lastname || '');
    setIsEditModalOpen(true);
  };

  // Sauvegarder les modifications de l'actant
  const handleSaveEdit = async () => {
    if (!editingActant) return;

    setSaving(true);
    try {
      const url = `${API_BASE}&action=updateActant&actantId=${editingActant.id}&email=${encodeURIComponent(editEmail)}&name=${encodeURIComponent(editName)}&firstname=${encodeURIComponent(editFirstname)}&lastname=${encodeURIComponent(editLastname)}&json=1`;
      const response = await fetch(url, { method: 'POST' });
      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      addToast({
        title: 'Succès',
        description: 'Actant mis à jour',
        classNames: { base: 'bg-success text-white' },
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (error: any) {
      addToast({
        title: 'Erreur',
        description: error.message,
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setSaving(false);
    }
  };

  // Ouvrir la modal de suppression
  const handleOpenDelete = (actant: Actant) => {
    setActantToDelete(actant);
    setDeleteUserToo(false);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setIsDeleteModalOpen(false);
    setActantToDelete(null);
  };

  // Confirmer la suppression
  const handleConfirmDelete = async () => {
    if (!actantToDelete) return;

    setDeleting(true);
    try {
      await deleteActant(actantToDelete.id, deleteUserToo);
      addToast({
        title: 'Succès',
        description: `Actant "${actantToDelete.title}" supprimé${deleteUserToo ? ' avec son utilisateur' : ''}`,
        classNames: { base: 'bg-success text-white' },
      });
      setIsDeleteModalOpen(false);
      setActantToDelete(null);
      loadData();
    } catch (error: any) {
      addToast({
        title: 'Erreur',
        description: error.message,
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setDeleting(false);
    }
  };

  // Filtrer les utilisateurs non liés pour la modal de liaison
  const availableUsers = omekaUsers.filter((user) => !actants.some((a) => a.omekaUserId === user.id) || user.id === selectedActant?.omekaUserId);

  // Compter les actants liés/non liés
  const linkedCount = actants.filter((a) => a.omekaUserId).length;
  const unlinkedCount = actants.length - linkedCount;

  const filterFn = useCallback(
    (actant: Actant) => {
      if (linkFilter === 'linked') return Boolean(actant.omekaUserId);
      if (linkFilter === 'unlinked') return !actant.omekaUserId;
      return true;
    },
    [linkFilter],
  );

  const searchFn = useCallback((actant: Actant, query: string) => {
    const displayName = actant.title || `${actant.firstname} ${actant.lastname}`.trim();
    return matchesAdminSearch(
      query,
      displayName,
      actant.mail,
      actant.omekaUserName,
      actant.omekaUserRole,
      String(actant.id),
    );
  }, []);

  const sortFn = useCallback((a: Actant, b: Actant, order: 'asc' | 'desc') => {
    const nameA = a.title || `${a.firstname} ${a.lastname}`.trim();
    const nameB = b.title || `${b.firstname} ${b.lastname}`.trim();
    return sortByStringField(nameA, nameB, order);
  }, []);

  const {
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    paginatedItems: paginatedActants,
    totalPages,
    totalCount,
    pageSize,
  } = useAdminListControls({
    items: actants,
    filterFn,
    searchFn,
    sortFn,
    filterDeps: [linkFilter],
  });

  const Wrapper = embedded ? React.Fragment : Layouts;
  const wrapperProps = embedded ? {} : { className: 'flex flex-col col-span-10 gap-6' };
  const SectionTitle = embedded ? 'h2' : 'h1';
  const sectionTitleClass = embedded ? 'text-xl text-c6 font-semibold' : 'text-3xl font-medium text-c6';

  if (loading) {
    return (
      <Wrapper {...wrapperProps}>
        <div className='flex flex-col gap-4 min-h-[400px] items-center justify-center py-5'>
          <Spinner color="current" className="text-c6" />
          <p className="text-c6">Chargement en cours...</p>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...wrapperProps}>
      <div className={embedded ? 'flex flex-col gap-6' : ''}>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <SectionTitle className={sectionTitleClass}>Gestion des Actants</SectionTitle>
            <p className='text-sm text-c5 mt-px'>
              {actants.length} actant{actants.length > 1 ? 's' : ''} (template 72) | {linkedCount} lié{linkedCount > 1 ? 's' : ''} | {unlinkedCount} non lié
              {unlinkedCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className='flex flex-wrap gap-2 items-center'>
            <div
              role='status'
              className='inline-flex h-[40px] min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 bg-c3 text-selected text-sm font-medium pointer-events-none select-none border border-c4/10'>
              <UserIcon size={14} className='shrink-0' aria-hidden />
              <span className='whitespace-nowrap'>
                {omekaUsers.length} utilisateur{omekaUsers.length > 1 ? 's' : ''} Omeka S
              </span>
            </div>
            <Button
              className={outlineButtonClass}
              startContent={<UploadIcon size={16} />}
              onPress={() => {
                setBatchInput('');
                setBatchResults([]);
                setIsBatchModalOpen(true);
              }}>
              Import batch
            </Button>
          </div>
        </div>

        {/* Table des actants */}
        <div className='bg-c2/50 rounded-xl p-5 flex flex-col gap-4'>
          <AdminListToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder='Rechercher un actant…'
            totalCount={totalCount}
            totalLabel='actant'
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            filters={
              <Select
                size='sm'
                selectedKeys={[linkFilter]}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0];
                  if (key === 'all' || key === 'linked' || key === 'unlinked') setLinkFilter(key);
                }}
                className='w-full lg:w-48'
                aria-label='Filtrer par liaison Omeka'>
                <SelectItem key='all'>Tous</SelectItem>
                <SelectItem key='linked'>Liés à Omeka</SelectItem>
                <SelectItem key='unlinked'>Non liés</SelectItem>
              </Select>
            }
          />

          {paginatedActants.length === 0 ? (
            <AdminListEmptyState message='Aucun actant ne correspond à votre recherche.' />
          ) : (
            <Table aria-label='Liste des actants' classNames={adminTableClassNames}>
            <TableHeader>
              <TableColumn>ACTANT</TableColumn>
              <TableColumn>EMAIL</TableColumn>
              <TableColumn>UTILISATEUR OMEKA S</TableColumn>
              <TableColumn className='text-left'>
                <div className={adminActionsWrapperClass}>ACTIONS</div>
              </TableColumn>
            </TableHeader>
            <TableBody emptyContent='Aucun actant trouvé'>
              {paginatedActants.map((actant) => (
                <TableRow key={actant.id}>
                  <TableCell>
                    <div className='flex items-center gap-3'>
                      <Avatar src={actant.picture || undefined} name={actant.title} size='sm' className='bg-c4 rounded-xl' />
                      <div className='flex flex-col'>
                        <span className='font-medium'>{actant.title || `${actant.firstname} ${actant.lastname}`.trim() || 'Sans nom'}</span>
                        <span className='text-c4 text-xs'>Item #{actant.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{actant.mail || <span className='text-c4'>-</span>}</TableCell>
                  <TableCell>
                    {actant.omekaUserId ? (
                      <div className='flex gap-2 items-center'>
                        <Chip size='sm' color='success' variant='flat'>
                          ID: {actant.omekaUserId}
                        </Chip>
                        <span className='text-c5 text-xs'>
                          {actant.omekaUserName} ({actant.omekaUserRole})
                        </span>
                      </div>
                    ) : (
                      <Chip size='sm' color='warning' variant='flat'>
                        Non lié
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={adminActionsWrapperClass}>
                      <MySpaceActionButton onClick={() => handleOpenEdit(actant)} title="Modifier l'actant" aria-label="Modifier l'actant">
                        <EditIcon size={16} />
                      </MySpaceActionButton>
                      <MySpaceActionButton onClick={() => handleOpenLink(actant)} title='Lier à un utilisateur Omeka S' aria-label='Lier à un utilisateur Omeka S'>
                        <ChainLinkIcon size={16} />
                      </MySpaceActionButton>
                      <MySpaceActionButton variant='danger' onClick={() => handleOpenDelete(actant)} title='Supprimer' aria-label="Supprimer l'actant">
                        <TrashIcon size={16} />
                      </MySpaceActionButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}

          <AdminListPagination
            totalCount={totalCount}
            pageSize={pageSize}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        {/* Modal Liaison / Création Utilisateur */}
        <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} size='lg'>
          <ModalContent>
            <ModalHeader className='flex flex-col gap-px'>
              <ModalTitle
                icon={ChainLinkIcon}
                iconColor='text-action'
                iconBg='bg-action/20'
                title={
                  <>
                    {selectedActant?.omekaUserId ? 'Modifier la liaison' : 'Lier'} {selectedActant?.title} à un utilisateur Omeka S
                  </>
                }
              />
            </ModalHeader>
            <ModalBody className='gap-4'>
              {/* Onglets */}
              <div className='flex gap-2 border-b border-c3 pb-2'>
                <Button
                  onClick={() => setLinkMode('link')}
                  className={`w-full ${linkMode === 'link' ? primaryButtonClass : outlineButtonClass}`}>
                  Utilisateur existant
                </Button>
                <Button
                  onClick={() => setLinkMode('create')}
                  className={`w-full ${linkMode === 'create' ? primaryButtonClass : outlineButtonClass}`}>
                  Créer un utilisateur
                </Button>
              </div>

              {linkMode === 'link' ? (
                <>
                  <p className='text-c5 text-sm'>Sélectionnez l'utilisateur Omeka S à associer à cet actant.</p>
                  <div className='flex flex-col gap-2 max-h-[300px] overflow-y-auto'>
                    {availableUsers.length === 0 ? (
                      <p className='text-c4 text-center py-4'>Aucun utilisateur disponible</p>
                    ) : (
                      availableUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUserId(user.id)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedUserId === user.id ? 'bg-action/20 border-2 border-action' : 'bg-c2 border border-c3 hover:bg-c3'
                          }`}>
                          <div>
                            <p className='text-c6 font-medium'>{user.name}</p>
                            <p className='text-c5 text-xs'>{user.email}</p>
                          </div>
                          <Chip size='sm' variant='flat' className={user.role === 'admin' || user.role === 'global_admin' ? 'bg-action/20 text-action' : 'bg-c3'}>
                            {user.role}
                          </Chip>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className='text-c5 text-sm'>Créez un nouvel utilisateur Omeka S qui sera automatiquement lié à cet actant.</p>
                  <Input
                    label='Email'
                    labelPlacement='outside-top'
                    placeholder='email@exemple.com'
                    type='email'
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    isRequired
                  />
                  <Input
                    label='Nom complet'
                    labelPlacement='outside-top'
                    placeholder='Prénom Nom'
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    isRequired
                  />
                  <Select
                    label='Rôle'
                    labelPlacement='outside-top'
                    selectedKeys={[newUserRole]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      if (selected) setNewUserRole(String(selected));
                    }}>
                    <SelectItem key='author'>Auteur (author)</SelectItem>
                    <SelectItem key='editor'>Éditeur (editor)</SelectItem>
                    <SelectItem key='admin'>Administrateur (admin)</SelectItem>
                  </Select>
                  <p className='text-c4 text-xs'>Un mot de passe temporaire sera généré. L'utilisateur devra le réinitialiser via Omeka S.</p>
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsLinkModalOpen(false)} className={cancelButtonClass}>
                Annuler
              </Button>
              {linkMode === 'link' ? (
                <Button className={primaryButtonClass} onPress={handleLink} isLoading={submitting} isDisabled={!selectedUserId}>
                  Lier
                </Button>
              ) : (
                <Button className={primaryButtonClass} onPress={handleCreateUser} isLoading={submitting} isDisabled={!newUserEmail || !newUserName}>
                  Créer et lier
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Import Batch */}
        <Modal isOpen={isBatchModalOpen} onClose={() => !batchProcessing && setIsBatchModalOpen(false)} size='2xl'>
          <ModalContent>
            <ModalHeader className='flex flex-col gap-px'>
              <ModalTitle icon={UploadIcon} iconColor='text-blue-500' iconBg='bg-blue-500/20' title="Import batch d'actants" />
            </ModalHeader>
            <ModalBody className='gap-4'>
              <p className='text-c5 text-sm'>Collez une liste d'actants avec leurs emails. Chaque ligne créera un actant et un utilisateur Omeka S.</p>
              <div className='bg-c3 rounded-lg p-2.5'>
                <p className='text-c4 text-xs mb-2'>Formats supportés :</p>
                <code className='text-c5 text-xs block'>Prénom Nom &lt;email@domain.com&gt;</code>
                <code className='text-c5 text-xs block'>Nom, Prénom &lt;email@domain.com&gt;</code>
              </div>
              <Textarea
                aria-label="Liste d'actants à importer"
                placeholder={`Maxime Girard <maxime.girard@example.com>\nJean-Marc Larrue <jean-marc.larrue@example.com>\nRichert, Fabien <fabien.richert@example.com>`}
                value={batchInput}
                onValueChange={setBatchInput}
                isDisabled={batchProcessing}
                minRows={10}
                classNames={{ input: 'min-h-[200px]' }}
              />
              <Select
                label='Rôle pour tous les utilisateurs'
                labelPlacement='outside-top'
                selectedKeys={[batchRole]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  if (selected) setBatchRole(String(selected));
                }}
                isDisabled={batchProcessing}>
                <SelectItem key='author'>Auteur (author)</SelectItem>
                <SelectItem key='editor'>Éditeur (editor)</SelectItem>
                <SelectItem key='admin'>Administrateur (admin)</SelectItem>
              </Select>

              {/* Résultats */}
              {batchResults.length > 0 && (
                <div className='flex flex-col gap-2 max-h-[200px] overflow-y-auto'>
                  <p className='text-c5 text-sm font-medium'>Résultats :</p>
                  {batchResults.map((result, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 rounded-lg ${result.success ? 'bg-success/20' : 'bg-danger/20'}`}>
                      <div>
                        <p className='text-c6 text-sm'>{result.name}</p>
                        <p className='text-c5 text-xs'>{result.email}</p>
                      </div>
                      {result.success ? (
                        <Chip size='sm' color='success' variant='flat'>
                          Créé
                        </Chip>
                      ) : (
                        <Chip size='sm' color='danger' variant='flat'>
                          {result.error || 'Erreur'}
                        </Chip>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsBatchModalOpen(false)} className={cancelButtonClass} isDisabled={batchProcessing}>
                Fermer
              </Button>
              <Button className={primaryButtonClass} onPress={handleBatchImport} isLoading={batchProcessing} isDisabled={!batchInput.trim() || batchProcessing}>
                Importer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <AlertModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          title="Supprimer l'actant"
          type='danger'
          confirmLabel='Supprimer'
          onConfirm={handleConfirmDelete}
          isLoading={deleting}
          description={
            <>
              <p>
                Êtes-vous sûr de vouloir supprimer l&apos;actant{' '}
                <span className='text-c6 font-medium'>&quot;{actantToDelete?.title}&quot;</span> ?
              </p>
              {actantToDelete?.omekaUserId && (
                <div className='mt-4 rounded-lg bg-c3 p-3'>
                  <label className='flex cursor-pointer items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={deleteUserToo}
                      onChange={(e) => setDeleteUserToo(e.target.checked)}
                      className='h-4 w-4 accent-action'
                    />
                    <span className='text-sm text-c6'>
                      Supprimer aussi l&apos;utilisateur Omeka S ({actantToDelete.omekaUserName})
                    </span>
                  </label>
                  <p className='mt-2 text-xs text-c4'>L&apos;utilisateur sera supprimé uniquement s&apos;il n&apos;a pas d&apos;autres ressources.</p>
                </div>
              )}
            </>
          }
        />

        {/* Modal Édition */}
        <Modal isOpen={isEditModalOpen} onClose={() => !saving && setIsEditModalOpen(false)} size='lg'>
          <ModalContent>
            <ModalHeader className='flex flex-col gap-px'>
              <ModalTitle icon={EditIcon} iconColor='text-action' iconBg='bg-action/20' title="Modifier l'actant" />
            </ModalHeader>
            <ModalBody className='gap-4'>
              <Input
                label='Nom complet (titre)'
                labelPlacement='outside-top'
                placeholder='Prénom Nom'
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className='grid grid-cols-2 gap-4'>
                <Input
                  label='Prénom'
                  labelPlacement='outside-top'
                  placeholder='Prénom'
                  value={editFirstname}
                  onChange={(e) => setEditFirstname(e.target.value)}
                />
                <Input
                  label='Nom de famille'
                  labelPlacement='outside-top'
                  placeholder='Nom'
                  value={editLastname}
                  onChange={(e) => setEditLastname(e.target.value)}
                />
              </div>
              <Input
                label='Email'
                labelPlacement='outside-top'
                placeholder='email@exemple.com'
                type='email'
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
              {editingActant?.omekaUserId && (
                <p className='text-c4 text-xs'>
                  Lié à l'utilisateur Omeka S : {editingActant.omekaUserName} (ID: {editingActant.omekaUserId})
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsEditModalOpen(false)} className={cancelButtonClass} isDisabled={saving}>
                Annuler
              </Button>
              <Button className={primaryButtonClass} onPress={handleSaveEdit} isLoading={saving}>
                Enregistrer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </Wrapper>
  );
};

export default ActantManagement;
