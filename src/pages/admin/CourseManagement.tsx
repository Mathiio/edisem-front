import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Chip,
} from '@heroui/react';
import { addToast } from '@/theme/components';
import { Button, outlineButtonClass, primaryButtonClass, cancelButtonClass } from '@/theme/components/button';
import { Input, Select, SelectItem, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/theme/components';
import { Layouts } from '@/components/layout/Layouts';
import { AddIcon, EditIcon, TrashIcon, UserIcon } from '@/components/ui/icons';
import { ModalTitle } from '@/components/ui/ModalTitle';
import { AlertModal } from '@/components/ui/AlertModal';
import { MySpaceActionButton } from '@/components/features/shared/my-space/MySpaceResourceRow';
import {
  AdminListToolbar,
  AdminListPagination,
  AdminListEmptyState,
  adminTableClassNames,
  adminActionsWrapperClass,
} from '@/components/features/pages/user-management/AdminListToolbar';
import { matchesAdminSearch, sortByStringField } from '@/components/features/pages/user-management/adminListConfig';
import { useAdminListControls } from '@/hooks/useAdminListControls';
import { getCourses, createCourse, updateCourse, deleteCourse, getCourseStudents, type Course, type CourseFormData, type Student } from '@/services/UserSpace';

// Sessions disponibles
const SESSIONS = ['Automne', 'Hiver', 'Été'];

// Niveaux d'études (cycles universitaires)
const LEVELS = ['1er cycle', '2e cycle', '3e cycle'];

// Générer les années (année courante + 5 ans avant et après)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i));

interface CourseManagementProps {
  embedded?: boolean; // Si true, n'affiche pas le Layout wrapper
  highlightCourseId?: number | null; // ID du cours à mettre en surbrillance
}

export const CourseManagement: React.FC<CourseManagementProps> = ({ embedded = false, highlightCourseId: propHighlightCourseId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [highlightedCourseId, setHighlightedCourseId] = useState<number | null>(null);
  const [lastHighlightedId, setLastHighlightedId] = useState<number | null>(null);
  const [deleteCourseModalOpen, setDeleteCourseModalOpen] = useState(false);
  const [coursePendingDelete, setCoursePendingDelete] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // Appliquer le highlight directement sur le DOM (HeroUI ne passe pas les props au tr)
  useEffect(() => {
    const courseIdToHighlight = propHighlightCourseId || highlightedCourseId;

    // Éviter les déclenchements répétés pour le même cours
    if (!courseIdToHighlight || courses.length === 0 || courseIdToHighlight === lastHighlightedId) {
      return;
    }

    setLastHighlightedId(courseIdToHighlight);

    // Délai pour laisser le DOM se rendre (scroll vers la section cours)
    setTimeout(() => {
      const marker = document.getElementById(`course-marker-${courseIdToHighlight}`);
      if (marker) {
        const row = marker.closest('tr');
        if (row) {
          row.style.transition = '0.3s ease-in-out';
          row.style.backgroundColor = '#13111f';
          row.style.outline = '2px solid #ffffff';
          row.style.outlineOffset = '-1px';
          row.style.borderRadius = '8px';
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Animation pulse manuelle
          let pulse = true;
          const interval = setInterval(() => {
            if (row) {
              row.style.backgroundColor = pulse ? '#13111f' : '#201e2d';
              pulse = !pulse;
            }
          }, 500);

          // Nettoyer après 3 secondes
          setTimeout(() => {
            clearInterval(interval);
            if (row) {
              row.style.backgroundColor = '';
              row.style.outline = '';
              row.style.outlineOffset = '';
              row.style.borderRadius = '';
            }
            setLastHighlightedId(null);
          }, 3000);
        }
      }
    }, 200);
  }, [propHighlightCourseId, highlightedCourseId, courses.length, lastHighlightedId]);

  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    code: '',
    level: '',
    session: '',
    year: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const coursesData = await getCourses();
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error: any) {
      console.error('Error loading courses:', error);
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les cours',
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gestion du highlight depuis l'URL
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && !loading) {
      const courseId = parseInt(highlightId);
      setHighlightedCourseId(courseId);

      // Scroll vers la ligne après un court délai
      setTimeout(() => {
        const element = document.getElementById(`course-row-${courseId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);

      // Retirer le highlight après 3 secondes
      setTimeout(() => {
        setHighlightedCourseId(null);
        setSearchParams({});
      }, 3000);
    }
  }, [searchParams, loading, setSearchParams]);

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      code: '',
      level: '',
      session: '',
      year: String(currentYear),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      code: course.code || '',
      level: course.level || '',
      session: course.session || '',
      year: course.year || '',
    });
    setIsModalOpen(true);
  };

  const handleViewStudents = async (course: Course) => {
    setViewingCourse(course);
    setIsStudentsModalOpen(true);
    setLoadingStudents(true);

    try {
      const students = await getCourseStudents(course.id);
      setCourseStudents(Array.isArray(students) ? students : []);
    } catch (error: any) {
      console.error('Error loading course students:', error);
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les étudiants',
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      addToast({
        title: 'Erreur',
        description: 'Le titre du cours est requis',
        classNames: { base: 'bg-danger text-white' },
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
        addToast({
          title: 'Succès',
          description: 'Cours mis à jour',
          classNames: { base: 'bg-success text-white' },
        });
      } else {
        await createCourse(formData);
        addToast({
          title: 'Succès',
          description: 'Cours créé',
          classNames: { base: 'bg-success text-white' },
        });
      }
      setIsModalOpen(false);
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

  const openDeleteCourseModal = (course: Course) => {
    setCoursePendingDelete(course);
    setDeleteCourseModalOpen(true);
  };

  const closeDeleteCourseModal = () => {
    if (deletingCourse) return;
    setDeleteCourseModalOpen(false);
    setCoursePendingDelete(null);
  };

  const handleConfirmDeleteCourse = async () => {
    if (!coursePendingDelete) return;

    setDeletingCourse(true);
    try {
      await deleteCourse(coursePendingDelete.id);
      addToast({
        title: 'Succès',
        description: 'Cours supprimé',
        classNames: { base: 'bg-success text-white' },
      });
      loadData();
      setDeleteCourseModalOpen(false);
      setCoursePendingDelete(null);
    } catch (error: any) {
      addToast({
        title: 'Erreur',
        description: error.message,
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setDeletingCourse(false);
    }
  };

  const searchFn = useCallback((course: Course, query: string) => {
    return matchesAdminSearch(
      query,
      course.title,
      course.description,
      course.code,
      course.level,
      course.session,
      course.year,
    );
  }, []);

  const sortFn = useCallback(
    (a: Course, b: Course, order: 'asc' | 'desc') => sortByStringField(a.title, b.title, order),
    [],
  );

  const {
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    paginatedItems: paginatedCourses,
    totalPages,
    totalCount,
    pageSize,
  } = useAdminListControls({
    items: courses,
    searchFn,
    sortFn,
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
            <SectionTitle className={sectionTitleClass}>Gestion des Cours</SectionTitle>
            <p className='text-sm text-c5 mt-px'>{courses.length} cours</p>
          </div>
          <Button className={outlineButtonClass} startContent={<AddIcon size={14} />} onPress={handleOpenCreate}>
            Nouveau Cours
          </Button>
        </div>

        {/* Table des cours */}
        <div className='bg-c2/50 rounded-xl p-5 flex flex-col gap-4'>
          <AdminListToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder='Rechercher un cours…'
            totalCount={totalCount}
            totalLabel='cours'
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
          />

          {paginatedCourses.length === 0 ? (
            <AdminListEmptyState message='Aucun cours ne correspond à votre recherche.' />
          ) : (
            <Table aria-label='Liste des cours' classNames={adminTableClassNames}>
            <TableHeader>
              <TableColumn>COURS</TableColumn>
              <TableColumn>CODE</TableColumn>
              <TableColumn>NIVEAU</TableColumn>
              <TableColumn>SESSION</TableColumn>
              <TableColumn>ANNÉE</TableColumn>
              <TableColumn>ÉTUDIANTS</TableColumn>
              <TableColumn className='text-left'>
                <div className={adminActionsWrapperClass}>ACTIONS</div>
              </TableColumn>
            </TableHeader>
            <TableBody emptyContent='Aucun cours'>
              {paginatedCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <span id={`course-marker-${course.id}`} className='hidden' />
                    <div>
                      <p className='font-medium'>{course.title}</p>
                      {course.description && <p className='text-xs text-c4 truncate max-w-[300px]'>{course.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {course.code ? (
                      <Chip variant='flat' className='text-c6 border border-c4/10 px-4 py-2 bg-c3 rounded-lg'>
                        {course.code}
                      </Chip>
                    ) : (
                      <span className='text-c4'>-</span>
                    )}
                  </TableCell>
                  <TableCell>{course.level || <span className='text-c4'>-</span>}</TableCell>
                  <TableCell>{course.session || <span className='text-c4'>-</span>}</TableCell>
                  <TableCell>{course.year || <span className='text-c4'>-</span>}</TableCell>
                  <TableCell>
                    {course.studentCount} étudiant{course.studentCount !== 1 ? 's' : ''}
                  </TableCell>
                  <TableCell>
                    <div className={adminActionsWrapperClass}>
                      <MySpaceActionButton onClick={() => handleViewStudents(course)} title='Voir les étudiants' aria-label='Voir les étudiants'>
                        <UserIcon size={16} />
                      </MySpaceActionButton>
                      <MySpaceActionButton onClick={() => handleOpenEdit(course)} title='Modifier' aria-label='Modifier le cours'>
                        <EditIcon size={16} />
                      </MySpaceActionButton>
                      <MySpaceActionButton variant='danger' onClick={() => openDeleteCourseModal(course)} title='Supprimer' aria-label='Supprimer le cours'>
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

        {/* Modal Création/Édition */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size='lg'>
          <ModalContent>
            <ModalHeader className='flex flex-col gap-px'>
              <ModalTitle
                icon={editingCourse ? EditIcon : AddIcon}
                iconColor='text-action'
                iconBg='bg-action/20'
                title={editingCourse ? 'Modifier le cours' : 'Nouveau cours'}
              />
            </ModalHeader>
            <ModalBody className='gap-4'>
              <Input
                label='Titre du cours'
                labelPlacement='outside-top'
                placeholder='Introduction à la narratologie'
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                isRequired
              />

              <Textarea
                label='Description'
                labelPlacement='outside-top'
                placeholder='Description du cours...'
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className='grid grid-cols-2 gap-4'>
                <Input
                  label='Code du cours'
                  labelPlacement='outside-top'
                  placeholder='ART2030'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
                <Select
                  label='Niveau'
                  labelPlacement='outside-top'
                  placeholder='Sélectionner un niveau'
                  selectedKeys={formData.level ? [formData.level] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setFormData({ ...formData, level: selected || '' });
                  }}>
                  {LEVELS.map((level) => (
                    <SelectItem key={level}>{level}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <Select
                  label='Session'
                  labelPlacement='outside-top'
                  placeholder='Sélectionner une session'
                  selectedKeys={formData.session ? [formData.session] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setFormData({ ...formData, session: selected || '' });
                  }}>
                  {SESSIONS.map((session) => (
                    <SelectItem key={session}>{session}</SelectItem>
                  ))}
                </Select>

                <Select
                  label='Année'
                  labelPlacement='outside-top'
                  placeholder='Sélectionner une année'
                  selectedKeys={formData.year ? [formData.year] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setFormData({ ...formData, year: selected || '' });
                  }}>
                  {YEARS.map((year) => (
                    <SelectItem key={year}>{year}</SelectItem>
                  ))}
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsModalOpen(false)} className={cancelButtonClass}>
                Annuler
              </Button>
              <Button className={primaryButtonClass} onPress={handleSubmit} isLoading={submitting}>
                {editingCourse ? 'Mettre à jour' : 'Créer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Liste des étudiants */}
        <Modal isOpen={isStudentsModalOpen} onClose={() => setIsStudentsModalOpen(false)} size='lg'>
          <ModalContent>
            <ModalHeader className='flex flex-col gap-px'>
              <ModalTitle
                icon={UserIcon}
                iconColor='text-action'
                iconBg='bg-action/20'
                title={<>Étudiants inscrits à &quot;{viewingCourse?.title}&quot;</>}
              />
            </ModalHeader>
            <ModalBody>
              {loadingStudents ? (
                <div className='flex justify-center py-8'>
                  <Spinner />
                </div>
              ) : courseStudents.length === 0 ? (
                <p className='text-c4 text-center py-8'>Aucun étudiant inscrit à ce cours</p>
              ) : (
                <div className='flex flex-col gap-2 max-h-[400px] overflow-y-auto'>
                  {courseStudents.map((student) => (
                    <div key={student.id} className='flex items-center gap-3 p-3 bg-c2 border border-c3 rounded-lg'>
                      {student.picture ? (
                        <img src={student.picture} alt={student.title} className='w-7 h-7 rounded-lg object-cover' />
                      ) : (
                        <div className='w-7 h-7 rounded-lg bg-c3 border border-c4/10 flex items-center justify-center text-c6 text-sm font-medium'>
                          {student.firstname?.[0]}
                          {student.lastname?.[0]}
                        </div>
                      )}
                      <div className='flex-1'>
                        <p className='text-c6 font-medium'>{student.title}</p>
                        <p className='text-c5 text-xs'>{student.mail}</p>
                      </div>
                      {student.studentNumber && (
                        <div className='bg-c3 rounded-lg px-4 py-1 text-c6 text-sm font-medium'>
                          {student.studentNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsStudentsModalOpen(false)} className={cancelButtonClass}>
                Fermer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <AlertModal
          isOpen={deleteCourseModalOpen}
          onClose={closeDeleteCourseModal}
          title='Supprimer le cours'
          type='danger'
          confirmLabel='Supprimer'
          onConfirm={handleConfirmDeleteCourse}
          isLoading={deletingCourse}
          description={
            <>
              <p>
                Supprimer le cours <span className='text-c6 font-medium'>&quot;{coursePendingDelete?.title}&quot;</span> ? Les étudiants seront désinscrits.
              </p>
            </>
          }
        />
      </div>
    </Wrapper>
  );
};

export default CourseManagement;
