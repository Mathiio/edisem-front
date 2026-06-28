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
import { Input, Checkbox, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem } from '@/theme/components';
import { Layouts } from '@/components/layout/Layouts';
import { AddIcon, EditIcon, TrashIcon, ChainLinkIcon, SchoolIcon } from '@/components/ui/icons';
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
import { AdminSelectionBar } from '@/components/features/admin/AdminSelectionBar';
import { getCourses, getStudentCourses, enrollStudent, unenrollStudent, type Course } from '@/services/UserSpace';

// Types
interface OmekaUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created: string;
}

interface StudentItem {
  id: number;
  firstname: string;
  lastname: string;
  title: string;
  mail: string;
  studentNumber: string;
  classNumber: string;
  picture: string | null;
  omekaUserId: number | null;
  linkedUser?: OmekaUser | null;
  courses?: Course[]; // Cours auxquels l'étudiant est inscrit
}

interface FormData {
  firstname: string;
  lastname: string;
  email: string;
  studentNumber: string;
  classNumber: string;
  omekaUserId: number | null;
  createUser: boolean;
  courseIds: number[]; // Cours à inscrire lors de la création
}

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=UserSpace';

// Récupérer les étudiants
async function fetchStudents(): Promise<StudentItem[]> {
  const url = `${API_BASE}&action=getStudentsAdmin&json=1`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error('[StudentManagement] Error response:', text);
    throw new Error('Erreur lors de la récupération des étudiants');
  }
  const data = await response.json();
  return data;
}

// Récupérer les utilisateurs Omeka S
async function fetchOmekaUsers(): Promise<OmekaUser[]> {
  const url = `${API_BASE}&action=getOmekaUsers&json=1`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error('[StudentManagement] Users error response:', text);
    throw new Error('Erreur lors de la récupération des utilisateurs');
  }
  const data = await response.json();
  return data;
}

// Créer un étudiant
async function createStudent(data: FormData): Promise<any> {
  // Passer les données dans l'URL car Omeka S ne lit pas le body JSON
  const params = new URLSearchParams({
    firstname: data.firstname,
    lastname: data.lastname,
    email: data.email,
    studentNumber: data.studentNumber || '',
    classNumber: data.classNumber || '',
    createUser: data.createUser ? '1' : '0',
  });
  const url = `${API_BASE}&action=createStudent&json=1&${params.toString()}`;

  const response = await fetch(url);

  const responseText = await response.text();

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    console.error('[StudentManagement] Failed to parse JSON:', e);
    throw new Error('Réponse invalide du serveur');
  }

  // Afficher les logs de debug
  if (result.debug) {
    result.debug.forEach((log: string) => console.log('  -', log));
  }
  if (result.userError) {
    console.warn('[StudentManagement] User creation error:', result.userError);
  }

  if (result.error) {
    console.error('[StudentManagement] Server error:', result.error);
    throw new Error(result.error);
  }

  return result;
}

// Mettre à jour un étudiant
async function updateStudent(id: number, data: Partial<FormData>): Promise<any> {
  const response = await fetch(`${API_BASE}&action=updateStudent&id=${id}&json=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la mise à jour');
  }
  return response.json();
}

// Lier un étudiant à un utilisateur Omeka S
async function linkStudentToUser(studentId: number, userId: number): Promise<any> {
  const response = await fetch(`${API_BASE}&action=linkStudentToUser&studentId=${studentId}&userId=${userId}&json=1`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la liaison');
  }
  return response.json();
}

// Supprimer un étudiant
async function deleteStudent(id: number): Promise<any> {
  const response = await fetch(`${API_BASE}&action=deleteStudent&id=${id}&json=1`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la suppression');
  }
  return response.json();
}

interface StudentManagementProps {
  embedded?: boolean;
  onNavigateToCourse?: (courseId: number) => void;
  onNavigateToCoursesSection?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  embedded = false,
  onNavigateToCourse,
  onNavigateToCoursesSection,
}) => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [omekaUsers, setOmekaUsers] = useState<OmekaUser[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isCoursesModalOpen, setIsCoursesModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [linkingStudent, setLinkingStudent] = useState<StudentItem | null>(null);
  const [managingCoursesStudent, setManagingCoursesStudent] = useState<StudentItem | null>(null);
  const [studentCourseIds, setStudentCourseIds] = useState<number[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstname: '',
    lastname: '',
    email: '',
    studentNumber: '',
    classNumber: '',
    omekaUserId: null,
    createUser: true,
    courseIds: [],
  });
  // États pour la sélection multiple (batch actions)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [deleteStudentModalOpen, setDeleteStudentModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentItem | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsData, usersData, coursesData] = await Promise.all([fetchStudents(), fetchOmekaUsers(), getCourses()]);

      const studentsArray = Array.isArray(studentsData) ? studentsData : [];
      const coursesArray = Array.isArray(coursesData) ? coursesData : [];

      // Charger les cours pour chaque étudiant et lier les utilisateurs Omeka
      const usersArray = Array.isArray(usersData) ? usersData : [];
      const studentsWithCoursesAndUsers = await Promise.all(
        studentsArray.map(async (student) => {
          try {
            const studentCourses = await getStudentCourses(student.id);
            const linkedUser = student.omekaUserId ? usersArray.find((u) => u.id === student.omekaUserId) || null : null;
            return { ...student, courses: Array.isArray(studentCourses) ? studentCourses : [], linkedUser };
          } catch {
            const linkedUser = student.omekaUserId ? usersArray.find((u) => u.id === student.omekaUserId) || null : null;
            return { ...student, courses: [], linkedUser };
          }
        }),
      );

      setStudents(studentsWithCoursesAndUsers);
      setOmekaUsers(Array.isArray(usersData) ? usersData : []);
      setAllCourses(coursesArray);
    } catch (error: any) {
      console.error('[StudentManagement] Error loading data:', error);
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

  const filterFn = useCallback(
    (student: StudentItem) => {
      if (linkFilter === 'linked' && !student.omekaUserId) return false;
      if (linkFilter === 'unlinked' && student.omekaUserId) return false;
      if (courseFilter !== 'all') {
        const courseId = parseInt(courseFilter, 10);
        if (!student.courses?.some((c) => c.id === courseId)) return false;
      }
      return true;
    },
    [linkFilter, courseFilter],
  );

  const searchFn = useCallback((student: StudentItem, query: string) => {
    const courseLabels = student.courses?.map((c) => c.title || c.code).join(' ') || '';
    return matchesAdminSearch(
      query,
      student.title,
      student.firstname,
      student.lastname,
      student.mail,
      student.studentNumber,
      student.classNumber,
      courseLabels,
    );
  }, []);

  const sortFn = useCallback(
    (a: StudentItem, b: StudentItem, order: 'asc' | 'desc') => sortByStringField(a.title, b.title, order),
    [],
  );

  const {
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    filteredItems: filteredStudents,
    paginatedItems: paginatedStudents,
    totalPages,
    totalCount,
    pageSize,
  } = useAdminListControls({
    items: students,
    filterFn,
    searchFn,
    sortFn,
    filterDeps: [linkFilter, courseFilter],
  });

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormData({
      firstname: '',
      lastname: '',
      email: '',
      studentNumber: '',
      classNumber: '',
      omekaUserId: null,
      createUser: true,
      courseIds: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: StudentItem) => {
    setEditingStudent(student);
    setFormData({
      firstname: student.firstname,
      lastname: student.lastname,
      email: student.mail,
      studentNumber: student.studentNumber || '',
      classNumber: student.classNumber || '',
      omekaUserId: student.omekaUserId,
      createUser: false,
      courseIds: [], // Non utilisé en mode édition
    });
    setIsModalOpen(true);
  };

  const handleOpenLink = (student: StudentItem) => {
    setLinkingStudent(student);
    setSelectedUserId(student.omekaUserId);
    setIsLinkModalOpen(true);
  };

  const handleOpenCourses = async (student: StudentItem) => {
    setManagingCoursesStudent(student);
    setIsCoursesModalOpen(true);
    setLoadingCourses(true);

    try {
      const courses = await getStudentCourses(student.id);
      setStudentCourseIds(Array.isArray(courses) ? courses.map((c) => c.id) : []);
    } catch (error: any) {
      console.error('Error loading student courses:', error);
      setStudentCourseIds([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleToggleCourse = async (courseId: number, isEnrolled: boolean) => {
    if (!managingCoursesStudent) return;

    setSubmitting(true);
    try {
      if (isEnrolled) {
        await unenrollStudent(managingCoursesStudent.id, courseId);
        setStudentCourseIds((prev) => prev.filter((id) => id !== courseId));
        addToast({
          title: 'Succès',
          description: 'Étudiant désinscrit du cours',
          classNames: { base: 'bg-success text-white' },
        });
      } else {
        await enrollStudent(managingCoursesStudent.id, courseId);
        setStudentCourseIds((prev) => [...prev, courseId]);
        addToast({
          title: 'Succès',
          description: 'Étudiant inscrit au cours',
          classNames: { base: 'bg-success text-white' },
        });
      }
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

  const handleSubmit = async () => {
    if (!formData.firstname || !formData.lastname || !formData.email) {
      addToast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        classNames: { base: 'bg-danger text-white' },
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, formData);
        addToast({
          title: 'Succès',
          description: 'Étudiant mis à jour',
          classNames: { base: 'bg-success text-white' },
        });
      } else {
        // Créer l'étudiant
        const result = await createStudent(formData);

        // Inscrire aux cours sélectionnés si l'étudiant a été créé avec succès
        if (result.studentId && formData.courseIds.length > 0) {
          const enrollmentErrors: string[] = [];
          for (const courseId of formData.courseIds) {
            try {
              await enrollStudent(result.studentId, courseId);
            } catch (e: any) {
              enrollmentErrors.push(e.message);
            }
          }

          if (enrollmentErrors.length > 0) {
            addToast({
              title: 'Attention',
              description: `Étudiant créé mais erreur lors de l'inscription à certains cours`,
              classNames: { base: 'bg-warning text-white' },
            });
          } else {
            addToast({
              title: 'Succès',
              description: `Étudiant créé et inscrit à ${formData.courseIds.length} cours`,
              classNames: { base: 'bg-success text-white' },
            });
          }
        } else {
          addToast({
            title: 'Succès',
            description: 'Étudiant créé' + (formData.createUser ? ' avec son compte utilisateur' : ''),
            classNames: { base: 'bg-success text-white' },
          });
        }
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

  const handleLink = async () => {
    if (!linkingStudent || !selectedUserId) return;

    setSubmitting(true);
    try {
      await linkStudentToUser(linkingStudent.id, selectedUserId);
      addToast({
        title: 'Succès',
        description: "Étudiant lié à l'utilisateur",
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

  const openDeleteStudentModal = (student: StudentItem) => {
    setStudentToDelete(student);
    setDeleteStudentModalOpen(true);
  };

  const closeDeleteStudentModal = () => {
    if (deletingStudent) return;
    setDeleteStudentModalOpen(false);
    setStudentToDelete(null);
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    setDeletingStudent(true);
    try {
      await deleteStudent(studentToDelete.id);
      addToast({
        title: 'Succès',
        description: 'Étudiant supprimé',
        classNames: { base: 'bg-success text-white' },
      });
      loadData();
      setDeleteStudentModalOpen(false);
      setStudentToDelete(null);
    } catch (error: any) {
      addToast({
        title: 'Erreur',
        description: error.message,
        classNames: { base: 'bg-danger text-white' },
      });
    } finally {
      setDeletingStudent(false);
    }
  };

  // Fonctions pour la sélection multiple
  const handleToggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAllStudents = (selected: boolean) => {
    if (selected) {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const openBatchDeleteModal = () => {
    if (selectedStudentIds.size === 0) return;
    setBatchDeleteModalOpen(true);
  };

  const closeBatchDeleteModal = () => {
    if (deletingBatch) return;
    setBatchDeleteModalOpen(false);
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedStudentIds.size === 0) return;

    const idsToDelete = Array.from(selectedStudentIds);
    setDeletingBatch(true);
    let success = 0;
    let errors = 0;

    for (const studentId of idsToDelete) {
      try {
        await deleteStudent(studentId);
        success++;
      } catch {
        errors++;
      }
    }

    setDeletingBatch(false);
    setSelectedStudentIds(new Set());
    setBatchDeleteModalOpen(false);

    if (errors > 0) {
      addToast({
        title: 'Suppression partielle',
        description: `${success} supprimé(s), ${errors} erreur(s)`,
        classNames: { base: 'bg-warning text-white' },
      });
    } else {
      addToast({
        title: 'Succès',
        description: `${success} étudiant(s) supprimé(s)`,
        classNames: { base: 'bg-success text-white' },
      });
    }

    loadData();
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Filtrer les utilisateurs non liés
  const availableUsers = omekaUsers.filter((user) => !students.some((s) => s.omekaUserId === user.id) || user.id === linkingStudent?.omekaUserId);

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
            <SectionTitle className={sectionTitleClass}>Gestion des Étudiants</SectionTitle>
            <p className='text-sm text-c5 mt-px'>
              {students.length} étudiant{students.length > 1 ? 's' : ''} • {omekaUsers.length} utilisateur{omekaUsers.length > 1 ? 's' : ''} Omeka S
            </p>
          </div>
          <div className='flex gap-2'>
            <Button className={outlineButtonClass} startContent={<AddIcon size={14} />} onPress={handleOpenCreate}>
              Nouvel Étudiant
            </Button>
          </div>
        </div>

        {/* Barre d'actions batch */}
        <AdminSelectionBar
          count={selectedStudentIds.size}
          itemLabel='étudiant'
          onClearSelection={handleClearSelection}
          onDelete={openBatchDeleteModal}
          isDeleting={deletingBatch}
        />

        {/* Table des étudiants */}
        <div className='bg-c2/50 rounded-xl p-5 flex flex-col gap-4'>
          <AdminListToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder='Rechercher un étudiant…'
            totalCount={totalCount}
            totalLabel='étudiant'
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            filters={
              <>
                <Select
                  size='sm'
                  selectedKeys={[courseFilter]}
                  onSelectionChange={(keys) => setCourseFilter(Array.from(keys)[0] as string)}
                  className='w-full lg:w-56'
                  aria-label='Filtrer par cours'>
                  {[
                    { id: 'all', label: 'Tous les cours' },
                    ...allCourses.map((course) => ({ id: String(course.id), label: course.title })),
                  ].map((option) => (
                    <SelectItem key={option.id}>{option.label}</SelectItem>
                  ))}
                </Select>

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
              </>
            }
          />

          {paginatedStudents.length === 0 ? (
            <AdminListEmptyState message='Aucun étudiant ne correspond à votre recherche.' />
          ) : (
            <Table aria-label='Liste des étudiants' classNames={adminTableClassNames}>
            <TableHeader>
              <TableColumn width={50}>
                <Checkbox
                  isSelected={
                    filteredStudents.length > 0 &&
                    filteredStudents.every((s) => selectedStudentIds.has(s.id))
                  }
                  isIndeterminate={
                    filteredStudents.some((s) => selectedStudentIds.has(s.id)) &&
                    !filteredStudents.every((s) => selectedStudentIds.has(s.id))
                  }
                  onValueChange={handleSelectAllStudents}
                  size='sm'
                />
              </TableColumn>
              <TableColumn>ÉTUDIANT</TableColumn>
              <TableColumn>N° ÉTUDIANT</TableColumn>
              <TableColumn>COURS</TableColumn>
              <TableColumn>EMAIL</TableColumn>
              <TableColumn>UTILISATEUR OMEKA</TableColumn>
              <TableColumn className='text-left'>
                <div className={adminActionsWrapperClass}>ACTIONS</div>
              </TableColumn>
            </TableHeader>
            <TableBody emptyContent='Aucun étudiant'>
              {paginatedStudents.map((student) => {
                const isSelected = selectedStudentIds.has(student.id);
                const hasSelection = selectedStudentIds.size > 0;
                return (
                  <TableRow key={student.id} className={isSelected ? 'bg-action/10' : ''}>
                    <TableCell>
                      <Checkbox isSelected={isSelected} onValueChange={() => handleToggleStudentSelection(student.id)} size='sm' />
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Avatar src={student.picture || undefined} name={student.title} size='sm' className='bg-c3 p-2 border border-c4/10 rounded-xl' />
                        <span className='font-medium'>{student.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{student.studentNumber || <span className='text-c4'>-</span>}</TableCell>
                    <TableCell>
                      <div className='flex flex-wrap gap-px items-center'>
                        {student.courses && student.courses.length > 0 ? (
                          <>
                            {student.courses.slice(0, 2).map((course) => (
                              <span
                                key={course.id}
                                className={
                                  onNavigateToCourse
                                    ? 'text-c6 border border-c4/10 cursor-pointer transition-colors px-4 py-1.5 bg-c3 hover:bg-c4/10 rounded-xl'
                                    : 'text-c6 border border-c4/10 px-4 py-1.5 bg-c3 rounded-xl'
                                }
                                onClick={() => onNavigateToCourse?.(course.id)}>
                                {course.code || course.title.substring(0, 12)}
                              </span>
                            ))}
                            {student.courses.length > 2 && (
                              <Chip size='sm' variant='flat' className='bg-c4 text-c6'>
                                +{student.courses.length - 2}
                              </Chip>
                            )}
                          </>
                        ) : (
                          <Chip variant='flat' className='text-c6 border border-c4/10 px-4 py-2 bg-c3 rounded-xl text-md'>
                            Aucun
                          </Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{student.mail}</TableCell>
                    <TableCell>
                      {student.omekaUserId ? (
                        <div className='flex flex-col gap-px'>
                          <Chip size='sm' color='success' variant='flat'>
                            ID: {student.omekaUserId}
                          </Chip>
                          {student.linkedUser && (
                            <span className='text-c5 text-xs'>
                              {student.linkedUser.name} ({student.linkedUser.role})
                            </span>
                          )}
                        </div>
                      ) : (
                        <Chip size='sm' color='warning' variant='flat'>
                          Non lié
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasSelection ? (
                        <div className={adminActionsWrapperClass}>
                          <span className='text-c4 text-xs italic'>Sélection active</span>
                        </div>
                      ) : (
                        <div className={adminActionsWrapperClass}>
                          <MySpaceActionButton onClick={() => handleOpenCourses(student)} title='Gérer les cours' aria-label='Gérer les cours'>
                            <SchoolIcon size={16} />
                          </MySpaceActionButton>
                          <MySpaceActionButton onClick={() => handleOpenLink(student)} title='Lier utilisateur' aria-label='Lier utilisateur'>
                            <ChainLinkIcon size={16} />
                          </MySpaceActionButton>
                          <MySpaceActionButton onClick={() => handleOpenEdit(student)} title='Modifier' aria-label="Modifier l'étudiant">
                            <EditIcon size={16} />
                          </MySpaceActionButton>
                          <MySpaceActionButton variant='danger' onClick={() => openDeleteStudentModal(student)} title='Supprimer' aria-label="Supprimer l'étudiant">
                            <TrashIcon size={16} />
                          </MySpaceActionButton>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
                icon={editingStudent ? EditIcon : AddIcon}
                iconColor='text-action'
                iconBg='bg-action/20'
                title={editingStudent ? "Modifier l'étudiant" : 'Nouvel étudiant'}
              />
            </ModalHeader>
            <ModalBody className='gap-4'>
              <div className='grid grid-cols-2 gap-4'>
                <Input
                  label='Prénom'
                  labelPlacement='outside-top'
                  placeholder='Jean'
                  value={formData.firstname}
                  onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                  isRequired
                />
                <Input
                  label='Nom'
                  labelPlacement='outside-top'
                  placeholder='Dupont'
                  value={formData.lastname}
                  onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                  isRequired
                />
              </div>
              <Input
                label='Email'
                labelPlacement='outside-top'
                placeholder='jean.dupont@universite.fr'
                type='email'
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                isRequired
              />
              <Input
                label='Numéro étudiant'
                labelPlacement='outside-top'
                placeholder='20231234'
                value={formData.studentNumber}
                onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
              />
              {!editingStudent && (
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    id='createUser'
                    checked={formData.createUser}
                    onChange={(e) => setFormData({ ...formData, createUser: e.target.checked })}
                    className='w-4 h-4'
                  />
                  <label htmlFor='createUser' className='text-c6 text-sm'>
                    Créer automatiquement un compte utilisateur Omeka S
                  </label>
                </div>
              )}
              {/* Sélection des cours (uniquement en création) */}
              {!editingStudent && allCourses.length > 0 && (
                <div className='flex flex-col gap-2'>
                  <label className='text-c5 text-sm'>Inscrire à des cours (optionnel)</label>
                  <div className='flex flex-col gap-2 max-h-[150px] overflow-y-auto bg-c1 p-3 rounded-lg'>
                    {allCourses.map((course) => {
                      const isSelected = formData.courseIds.includes(course.id);
                      return (
                        <div
                          key={course.id}
                          onClick={() => {
                            if (isSelected) {
                              setFormData({ ...formData, courseIds: formData.courseIds.filter((id) => id !== course.id) });
                            } else {
                              setFormData({ ...formData, courseIds: [...formData.courseIds, course.id] });
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-action/20 border border-action/30' : 'bg-c3 hover:bg-c4'
                          }`}>
                          <div className='flex items-center gap-2'>
                            <Checkbox
                              isSelected={isSelected}
                              onValueChange={() => {
                                if (isSelected) {
                                  setFormData({ ...formData, courseIds: formData.courseIds.filter((id) => id !== course.id) });
                                } else {
                                  setFormData({ ...formData, courseIds: [...formData.courseIds, course.id] });
                                }
                              }}
                              size='sm'
                            />
                            <span className='text-c6 text-sm'>{course.title}</span>
                            {course.code && (
                              <Chip size='sm' variant='flat' className='bg-c4 text-xs'>
                                {course.code}
                              </Chip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {formData.courseIds.length > 0 && (
                    <p className='text-c5 text-xs'>
                      {formData.courseIds.length} cours sélectionné{formData.courseIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsModalOpen(false)} className={cancelButtonClass}>
                Annuler
              </Button>
              <Button className={primaryButtonClass} onPress={handleSubmit} isLoading={submitting}>
                {editingStudent ? 'Mettre à jour' : 'Créer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Liaison */}
        <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} size='lg'>
          <ModalContent>
            <ModalHeader className='flex flex-col gap-px'>
              <ModalTitle
                icon={ChainLinkIcon}
                iconColor='text-action'
                iconBg='bg-action/20'
                title={<>Lier {linkingStudent?.title} à un utilisateur</>}
              />
            </ModalHeader>
            <ModalBody>
              <p className='text-c5 text-sm mb-4'>
                Sélectionnez l'utilisateur Omeka S à associer à cet étudiant. Cela permettra de définir le bon propriétaire lors de la création de ressources.
              </p>
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
                      <Chip size='sm' variant='flat'>
                        {user.role}
                      </Chip>
                    </div>
                  ))
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsLinkModalOpen(false)} className={cancelButtonClass}>
                Annuler
              </Button>
              <Button className={primaryButtonClass} onPress={handleLink} isLoading={submitting} isDisabled={!selectedUserId}>
                Lier
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Gestion des Cours */}
        <Modal isOpen={isCoursesModalOpen} onClose={() => setIsCoursesModalOpen(false)} size='lg'>
          <ModalContent>
            <ModalHeader className='flex flex-col gap-px'>
              <ModalTitle
                icon={SchoolIcon}
                iconColor='text-action'
                iconBg='bg-action/20'
                title={<>Cours de {managingCoursesStudent?.title}</>}
              />
            </ModalHeader>
            <ModalBody>
              {loadingCourses ? (
                <div className='flex justify-center py-8'>
                  <Spinner />
                </div>
              ) : allCourses.length === 0 ? (
                <div className='text-center py-8'>
                  <p className='text-c4 mb-4'>Aucun cours disponible</p>
                  <Button className={outlineButtonClass} onPress={() => onNavigateToCoursesSection?.()}>
                    Créer un cours
                  </Button>
                </div>
              ) : (
                <div className='flex flex-col gap-3 max-h-[400px] overflow-y-auto'>
                  {allCourses.map((course) => {
                    const isEnrolled = studentCourseIds.includes(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => !submitting && handleToggleCourse(course.id, isEnrolled)}
                        className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer  ${isEnrolled ? 'bg-action/15 border-2 border-action' : 'bg-c3 border-2 border-transparent hover:border-c4'}`}>
                        <div className='flex-1'>
                          <div className='flex items-center gap-3'>
                            <p className='text-c6 font-medium text-base'>{course.title}</p>
                            {course.code && (
                              <Chip size='sm' variant='flat' className='bg-c6 text-c1 font-medium rounded-lg px-2'>
                                {course.code}
                              </Chip>
                            )}
                          </div>
                          <p className='text-c5 text-sm mt-px'>{[course.level, course.session, course.year].filter(Boolean).join(' • ') || 'Aucune info'}</p>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${isEnrolled ? 'bg-action border-action' : 'bg-transparent border-c4'}`}>
                          {isEnrolled && (
                            <svg className='w-4 h-4 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={3}>
                              <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className='text-c4 text-xs mt-4'>
                {studentCourseIds.length} cours sélectionné{studentCourseIds.length !== 1 ? 's' : ''}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={() => setIsCoursesModalOpen(false)} className={cancelButtonClass}>
                Fermer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <AlertModal
          isOpen={deleteStudentModalOpen}
          onClose={closeDeleteStudentModal}
          title="Supprimer l'étudiant"
          type='danger'
          confirmLabel='Supprimer'
          onConfirm={handleConfirmDeleteStudent}
          isLoading={deletingStudent}
          description={
            <p>
              Supprimer l&apos;étudiant <span className='text-c6 font-medium'>{studentToDelete?.title}</span> ?
            </p>
          }
        />

        <AlertModal
          isOpen={batchDeleteModalOpen}
          onClose={closeBatchDeleteModal}
          title='Supprimer la sélection'
          type='danger'
          confirmLabel='Supprimer'
          onConfirm={handleConfirmBatchDelete}
          isLoading={deletingBatch}
          description={
            <p>
              Supprimer {selectedStudentIds.size} étudiant{selectedStudentIds.size > 1 ? 's' : ''} sélectionné
              {selectedStudentIds.size > 1 ? 's' : ''} ?
            </p>
          }
        />
      </div>
    </Wrapper>
  );
};

export default StudentManagement;
