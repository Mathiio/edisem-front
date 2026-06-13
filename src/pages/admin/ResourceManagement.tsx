import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  addToast,
  Avatar,
} from '@heroui/react';
import { Button, primaryButtonClass, cancelButtonClass } from '@/theme/components/button';
import { Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/theme/components';
import { Layouts } from '@/components/layout/Layouts';
import { TrashIcon, EditIcon, ExperimentationIcon, UserIcon } from '@/components/ui/icons';
import { ModalTitle } from '@/components/ui/ModalTitle';
import { AlertModal } from '@/components/ui/AlertModal';
import { MySpaceActionButton } from '@/components/features/espaceEtudiant/MySpaceResourceRow';
import { getCourses, type Course, type StudentResourceCard, deleteUserResource } from '@/services/StudentSpace';
import { getRessourceLabel } from '@/config/resourceConfig';

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=StudentSpace';

// Types
interface ResourceWithCourse extends StudentResourceCard {
  courseId: number | null;
  courseTitle: string | null;
}

// Récupérer toutes les ressources avec leur cours associé
async function fetchAllResources(): Promise<ResourceWithCourse[]> {
  const url = `${API_BASE}&action=getAllResourcesAdmin&json=1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des ressources');
  }
  return await response.json();
}

// Mettre à jour le cours d'une ressource
async function updateResourceCourse(resourceId: number, courseId: number | null): Promise<{ success: boolean; error?: string }> {
  const url = `${API_BASE}&action=updateResourceCourse&resourceId=${resourceId}&courseId=${courseId ?? ''}&json=1`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || 'Erreur lors de la mise à jour');
  }
  return data;
}

// Composant Wrapper
const Wrapper: React.FC<{ children: React.ReactNode; embedded?: boolean }> = ({ children, embedded }) => {
  if (embedded) {
    return <div className='flex flex-col gap-8'>{children}</div>;
  }
  return <Layouts className='col-span-10 flex flex-col gap-12 z-0 overflow-visible'>{children}</Layouts>;
};

interface ResourceManagementProps {
  embedded?: boolean;
  onNavigateToCourse?: (courseId: number) => void;
}

const ResourceManagement: React.FC<ResourceManagementProps> = ({ embedded = false, onNavigateToCourse }) => {
  const [resources, setResources] = useState<ResourceWithCourse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal pour changer le cours
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceWithCourse | null>(null);
  const [newCourseId, setNewCourseId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Modal de suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<ResourceWithCourse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Charger les données
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resourcesData, coursesData] = await Promise.all([fetchAllResources(), getCourses()]);
      setResources(resourcesData);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrer les ressources
  const filteredResources = resources.filter((resource) => {
    // Filtre par cours
    if (filterCourse !== 'all') {
      if (filterCourse === 'none' && resource.courseId !== null) return false;
      if (filterCourse === 'teacher' && resource.courseId !== null) return false;
      if (filterCourse !== 'none' && filterCourse !== 'teacher' && String(resource.courseId) !== filterCourse) return false;
    }
    // Filtre par type
    if (filterType !== 'all' && resource.type !== filterType) return false;
    return true;
  });

  // Statistiques
  const stats = {
    total: resources.length,
    experimentations: resources.filter((r) => r.type === 'experimentation_etudiant').length,
    tools: resources.filter((r) => r.type === 'outil_etudiant').length,
    feedbacks: resources.filter((r) => r.type === 'retour_experience_etudiant').length,
    withCourse: resources.filter((r) => r.courseId !== null).length,
    teacherResources: resources.filter((r) => r.courseId === null).length,
  };

  // Ouvrir la modal de déplacement
  const handleMoveClick = (resource: ResourceWithCourse) => {
    setSelectedResource(resource);
    setNewCourseId(resource.courseId ? String(resource.courseId) : 'teacher');
    setMoveModalOpen(true);
  };

  // Confirmer le déplacement
  const handleConfirmMove = async () => {
    if (!selectedResource) return;

    setSubmitting(true);
    try {
      const courseId = newCourseId === 'teacher' ? null : parseInt(newCourseId);
      await updateResourceCourse(selectedResource.id as number, courseId);

      addToast({
        title: 'Succès',
        description: 'La ressource a été déplacée avec succès',
        color: 'success',
      });

      await loadData();
      setMoveModalOpen(false);
    } catch (error: any) {
      console.error('Error moving resource:', error);
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible de déplacer la ressource',
        color: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Ouvrir la modal de suppression
  const handleDeleteClick = (resource: ResourceWithCourse) => {
    setResourceToDelete(resource);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalOpen(false);
    setResourceToDelete(null);
  };

  // Confirmer la suppression définitive (DELETE Omeka S)
  const handleConfirmDelete = async () => {
    if (!resourceToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUserResource(resourceToDelete.id);
      addToast({
        title: 'Succès',
        description: 'La ressource a été supprimée',
        color: 'success',
      });
      await loadData();
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la ressource',
        color: 'danger',
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setResourceToDelete(null);
    }
  };

  if (loading) {
    return (
      <Wrapper embedded={embedded}>
        <div className='flex flex-col gap-4 min-h-[400px] items-center justify-center py-5'>
          <Spinner color="current" className="text-c6" />
          <p className="text-c6">Chargement en cours...</p>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper embedded={embedded}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-medium text-c6'>Gestion des Ressources</h1>
          <p className='text-sm text-c5 mt-px'>
            {stats.total} ressource{stats.total > 1 ? 's' : ''} • {stats.withCourse} liée{stats.withCourse > 1 ? 's' : ''} à un cours • {stats.teacherResources} enseignante
            {stats.teacherResources > 1 ? 's' : ''}
          </p>
        </div>
        <div className='flex gap-2.5 pb-6'>
          <Select
            label='Filtrer par cours'
            labelPlacement='outside-top'
            selectedKeys={[filterCourse]}
            onSelectionChange={(keys) => setFilterCourse(Array.from(keys)[0] as string)}
            className='max-w-lg'
            classNames={{ trigger: 'min-w-[200px]' }}
            >
            {[{ id: 'all', label: 'Tous les cours' }, { id: 'teacher', label: 'Ressources enseignantes' }, ...courses.map((c) => ({ id: String(c.id), label: c.title }))].map(
              (option) => (
                <SelectItem key={option.id}>{option.label}</SelectItem>
              ),
            )}
          </Select>

          <Select
            label='Filtrer par type'
            labelPlacement='outside-top'
            selectedKeys={[filterType]}
            onSelectionChange={(keys) => setFilterType(Array.from(keys)[0] as string)}
            className='max-w-lg'
            classNames={{ trigger: 'min-w-[200px]' }}
            >
            {[
              { id: 'all', label: 'Tous les types' },
              { id: 'experimentation_etudiant', label: 'Expérimentations' },
              { id: 'outil_etudiant', label: 'Outils' },
              { id: 'retour_experience_etudiant', label: "Retours d'expérience" },
            ].map((option) => (
              <SelectItem key={option.id}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Tableau */}
      <div className='bg-c2 rounded-xl p-5'>
        <Table
          aria-label='Tableau des ressources'
          classNames={{
            wrapper: 'bg-transparent shadow-none rounded-xl',
            th: 'bg-c3 text-c6 h-12 first:rounded-l-8 last:rounded-r-8',
            td: 'text-c6',
          }}>
          <TableHeader>
            <TableColumn>RESSOURCE</TableColumn>
            <TableColumn>TYPE</TableColumn>
            <TableColumn>COURS</TableColumn>
            <TableColumn>CRÉATEUR(S)</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody 
            emptyContent='Aucune ressource trouvée'
          >
            {filteredResources.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell>
                  <div className='flex items-center gap-2.5'>
                    {resource.thumbnail && (
                      <img
                        src={resource.thumbnail.startsWith('http') ? resource.thumbnail : `https://tests.arcanes.ca/omk${resource.thumbnail}`}
                        alt={resource.title}
                        className='w-6 h-6 rounded-sm object-cover'
                      />
                    )}
                    <span className='font-medium'>{resource.title}</span>
                  </div>
                </TableCell>
                <TableCell>{getRessourceLabel(resource.type)}</TableCell>
                <TableCell>
                  {resource.courseId ? (
                    <span
                      className={
                        onNavigateToCourse ? 'text-c6 border border-c4/10 cursor-pointer transition-colors px-4 py-1.5 bg-c3 hover:bg-c4/10 rounded-xl' : 'text-c6'
                      }
                      onClick={() => onNavigateToCourse?.(resource.courseId as number)}>
                      {courses.find((c) => c.id === resource.courseId)?.code || resource.courseTitle}
                    </span>
                  ) : (
                    <span className='text-c5 text-12 border border-c4/10 px-4 py-1.5 bg-c3 rounded-xl'>Enseignant</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className='flex flex-col gap-1.5 max-w-[200px]'>
                    {resource.actants?.slice(0, 2).map((actant, index) => (
                      <div key={index} className='flex items-center gap-1'>
                        <Avatar
                          src={actant.picture ? (actant.picture.startsWith('http') ? actant.picture : `https://tests.arcanes.ca/omk${actant.picture}`) : undefined}
                          fallback={<UserIcon size={12} />}
                          size='sm'
                          className='w-7 h-7 rounded-lg bg-c3 flex-shrink-0'
                        />
                        <span className='text-c6 text-sm truncate'>{actant.title}</span>
                      </div>
                    ))}
                    {resource.actants && resource.actants.length > 2 && (
                      <span className='text-c5 text-xs'>
                        +{resource.actants.length - 2} autre{resource.actants.length - 2 > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-1.5'>
                    <MySpaceActionButton onClick={() => handleMoveClick(resource)} title='Déplacer' aria-label='Déplacer la ressource'>
                      <EditIcon size={16} />
                    </MySpaceActionButton>
                    <MySpaceActionButton variant='danger' onClick={() => handleDeleteClick(resource)} title='Supprimer' aria-label='Supprimer la ressource'>
                      <TrashIcon size={16} />
                    </MySpaceActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Déplacer */}
      <Modal isOpen={moveModalOpen} onClose={() => setMoveModalOpen(false)} size='md'>
        <ModalContent>
          <ModalHeader className='flex flex-col gap-px'>
            <ModalTitle icon={EditIcon} iconColor='text-action' iconBg='bg-action/20' title='Déplacer la ressource' />
          </ModalHeader>
          <ModalBody>
            <div className='flex flex-col gap-5'>
              <div className='flex items-center gap-2.5 p-4 bg-c3 rounded-xl'>
                {selectedResource?.thumbnail ? (
                  <img
                    src={selectedResource.thumbnail.startsWith('http') ? selectedResource.thumbnail : `https://tests.arcanes.ca/omk${selectedResource.thumbnail}`}
                    alt={selectedResource.title}
                    className='w-12 h-12 rounded-lg object-cover'
                  />
                ) : (
                  <div className='w-12 h-12 rounded-lg bg-c4 flex items-center justify-center'>
                    <ExperimentationIcon size={20} className='text-c5' />
                  </div>
                )}
                <div>
                  <p className='text-c6 font-medium'>{selectedResource?.title}</p>
                  <p className='text-c5 text-xs'>{getRessourceLabel(selectedResource?.type || '')}</p>
                </div>
              </div>

              <Select
                label='Nouvelle destination'
                labelPlacement='outside-top'
                selectedKeys={newCourseId ? [newCourseId] : []}
                onSelectionChange={(keys) => setNewCourseId(Array.from(keys)[0] as string)}>
                {[
                  { id: 'teacher', label: 'Ressources enseignantes', isTeacher: true },
                  ...courses.map((c) => ({ id: String(c.id), label: `${c.title}${c.code ? ` (${c.code})` : ''}`, isTeacher: false })),
                ].map((option) => (
                  <SelectItem key={option.id} className={option.isTeacher ? '!text-action font-medium' : undefined}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant='light' onPress={() => setMoveModalOpen(false)} className={cancelButtonClass}>
              Annuler
            </Button>
            <Button onPress={handleConfirmMove} isLoading={submitting} className={primaryButtonClass}>
              Déplacer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title='Confirmer la suppression'
        type='danger'
        confirmLabel='Supprimer'
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        description={
          <>
            <p>
              Êtes-vous sûr de vouloir supprimer la ressource{' '}
              <span className='text-c6 font-medium'>&quot;{resourceToDelete?.title}&quot;</span> ?
            </p>
            <p className='text-c4 text-sm mt-2.5'>Cette action est irréversible.</p>
          </>
        }
      />
    </Wrapper>
  );
};

export default ResourceManagement;
