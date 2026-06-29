import { Layouts } from '@/components/layout/Layouts';
import { PageBanner } from '@/components/ui/PageBanner';
import { motion, Variants } from 'framer-motion';
import { MySpaceResourceCard, MySpaceResourceCardSkeleton } from '@/components/features/shared/my-space/MySpaceResourceCard';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserResources, getStudentCourses, getCourses, deleteUserResource, type Course } from '@/services/UserSpace';
import { addToast } from '@/theme/components';
import { CreateResourceAction } from '@/components/features/shared/my-space/CreateResourceAction';
import { ExperimentationIcon, UniversityIcon, WarningIcon, BookIcon } from '@/components/ui/icons';
import { useNavigate } from 'react-router-dom';
import { experimentationStudentConfigSimplified } from '@/pages/generic/config/experimentationStudentConfig';
import { toolStudentConfigSimplified } from '@/pages/generic/config/toolConfig';
import { bibliographyConfigSimplified } from '@/pages/generic/config/bibliographyConfig';
import { getResourceEditUrl } from '@/config/resourceConfig';
import { useAuth } from '@/hooks/useAuth';
import { AlertModal } from '@/components/ui/AlertModal';
import { Select, SelectItem } from '@/theme/components';

// Registre des configs créables avec leurs routes et icônes
const createableConfigs = [
  {
    config: experimentationStudentConfigSimplified,
    route: '/add-resource/experimentation',
    icon: ExperimentationIcon,
  },
  {
    config: toolStudentConfigSimplified,
    route: '/add-resource/outil',
    icon: UniversityIcon,
  },
  {
    config: bibliographyConfigSimplified,
    route: '/add-resource/bibliographie',
    icon: BookIcon,
  },
];

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.15 },
  }),
};

export const StudentMySpace: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [experimentationsStudents, setExperimentationsStudents] = useState<any[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // États pour la gestion des cours
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Option spéciale pour les ressources enseignantes (sans cours)
  const TEACHER_RESOURCES_OPTION = 'teacher-resources';

  // Vérifier si l'utilisateur est un actant
  const isActant = userData?.type === 'actant';

  // Pré-sélectionner "Ressources enseignantes" pour les actants
  useEffect(() => {
    if (isActant) {
      setSelectedCourseId(TEACHER_RESOURCES_OPTION);
    }
  }, [isActant]);

  // Vérifier si l'utilisateur peut créer des ressources
  const canCreate = useMemo(() => {
    if (isActant) return true; // Les actants peuvent toujours créer
    return courses.length > 0; // Les étudiants doivent avoir au moins un cours
  }, [isActant, courses.length]);

  // Informations utilisateur dérivées (kept for future use)
  const _fullName = useMemo(() => {
    if (userData?.firstname && userData?.lastname) {
      return `${userData.firstname} ${userData.lastname}`;
    }
    return userData?.firstname || userData?.lastname || 'Utilisateur';
  }, [userData?.firstname, userData?.lastname]);

  const _userTypeLabel = useMemo(() => {
    switch (userData?.type) {
      case 'actant':
        return 'Actant';
      case 'student':
        return 'Étudiant';
      default:
        return 'Membre';
    }
  }, [userData?.type]);
  void _fullName;
  void _userTypeLabel;

  const fetchExperimentations = useCallback(async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const omekaUserId = userData?.omekaUserId ?? (localStorage.getItem('omekaUserId') ? parseInt(localStorage.getItem('omekaUserId')!, 10) : null);
      if (!userId && !omekaUserId) return;
      const resources = await getUserResources(userId ? parseInt(userId, 10) : 0, omekaUserId);
      resources.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
      setExperimentationsStudents(resources);
    } catch (error) {
      console.error('Error loading student resources:', error);
    } finally {
      setLoading(false);
    }
  }, [userData?.omekaUserId]);

  useEffect(() => {
    fetchExperimentations();
  }, [fetchExperimentations]);

  // Charger les cours de l'utilisateur
  useEffect(() => {
    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const userId = localStorage.getItem('userId');

        if (isActant) {
          // Les actants voient tous les cours
          const allCourses = await getCourses();
          const coursesArray = Array.isArray(allCourses) ? allCourses : [];
          setCourses(coursesArray);
        } else if (userId) {
          // Les étudiants ne voient que leurs cours
          const studentCourses = await getStudentCourses(parseInt(userId));
          setCourses(Array.isArray(studentCourses) ? studentCourses : []);

          // Si un seul cours, le sélectionner automatiquement
          if (studentCourses.length === 1) {
            setSelectedCourseId(studentCourses[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading courses:', error);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, [isActant]);

  // Handler pour créer une ressource avec le cours sélectionné
  const handleCreateResource = useCallback(
    (route: string) => {
      // Pour les actants, une sélection est obligatoire (cours ou ressources enseignantes)
      if (isActant && !selectedCourseId) {
        addToast({
          title: 'Sélection requise',
          description: 'Veuillez sélectionner un cours ou "Ressources enseignantes" avant de créer une ressource.',
          color: 'warning',
        });
        return;
      }

      // Déterminer le courseId à utiliser
      // Si "Ressources enseignantes" est sélectionné, pas de courseId
      const courseId = selectedCourseId === TEACHER_RESOURCES_OPTION ? null : selectedCourseId || (courses.length === 1 ? courses[0].id : null);

      // Naviguer avec le courseId en query param (ou sans pour ressources enseignantes)
      navigate(`${route}${courseId ? `?courseId=${courseId}` : ''}`);
    },
    [selectedCourseId, courses, isActant, navigate, TEACHER_RESOURCES_OPTION],
  );

  // Handler pour modifier une ressource - navigue vers la page de détail en mode édition
  const handleEdit = useCallback(
    (id: string, type?: string) => {
      if (type) {
        navigate(getResourceEditUrl(type, id));
        return;
      }
      navigate(getResourceEditUrl('experimentation_etudiant', id));
    },
    [navigate],
  );

  // Handler pour ouvrir la modal de suppression
  const handleDeleteClick = useCallback(
    (id: string) => {
      const item = experimentationsStudents.find((exp) => String(exp.id) === String(id));
      if (item) {
        setItemToDelete({ id, title: item.title || 'Sans titre' });
        setDeleteModalOpen(true);
      }
    },
    [experimentationsStudents],
  );

  // Handler pour confirmer la suppression définitive (DELETE Omeka S)
  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUserResource(itemToDelete.id);
      setExperimentationsStudents((prev) => prev.filter((item) => String(item.id) !== String(itemToDelete.id)));
      setDeleteModalOpen(false);
      setItemToDelete(null);
      addToast({
        title: 'Succès',
        description: 'La ressource a été supprimée avec succès.',
        color: 'success',
      });
      void fetchExperimentations();
    } catch (error) {
      console.error('Error deleting resource:', error);
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression.',
        color: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, fetchExperimentations]);

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        title={
          <>
            <span>Mon espace</span>
            <span>ma communauté</span>
          </>
        }
        icon={<UniversityIcon />}
        description='Un espace personnel pensé pour centraliser vos activités, suivre vos démarches et accéder facilement aux ressources qui vous accompagnent tout au long de votre parcours.'
      />

      {/* Avertissement si étudiant sans cours */}
      {!isActant && !loadingCourses && courses.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='flex justify-center w-full'>
          <div className='flex items-center gap-4 bg-warning/10 border-2 border-warning/30 rounded-xl px-5 py-4 max-w-xl'>
            <WarningIcon size={24} className='text-warning flex-shrink-0' />
            <div className='flex flex-col gap-1.5'>
              <span className='text-c6 font-medium'>Inscription requise</span>
              <span className='text-c5 text-sm'>Vous devez être inscrit à au moins un cours pour créer des ressources. Contactez votre enseignant pour vous inscrire.</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sélecteur de cours et bouton d'ajout */}
      <div className='flex justify-center w-full gap-4 items-end'>
        {/* Sélecteur de cours pour les actants ou étudiants multi-cours */}
        {canCreate && (isActant || courses.length > 1) && (
          <Select
            label='Destination'
            placeholder='Sélectionnez une destination'
            selectedKeys={selectedCourseId ? [String(selectedCourseId)] : []}
            onSelectionChange={(keys) => {
              const id = Array.from(keys)[0];
              if (id === TEACHER_RESOURCES_OPTION) {
                setSelectedCourseId(TEACHER_RESOURCES_OPTION);
              } else {
                setSelectedCourseId(id ? parseInt(String(id)) : null);
              }
            }}
            isLoading={loadingCourses}
            isRequired={isActant}
            className='max-w-xs'>
            {(() => {
              const options = [
                // Option Ressources enseignantes pour les actants
                ...(isActant
                  ? [
                      {
                        id: TEACHER_RESOURCES_OPTION,
                        label: 'Ressources enseignantes',
                        isTeacher: true,
                      },
                    ]
                  : []),
                // Liste des cours
                ...courses.map((course) => ({
                  id: String(course.id),
                  label: `${course.title}${course.code ? ` (${course.code})` : ''}`,
                  isTeacher: false,
                })),
              ];
              return options;
            })().map((option) => (
              <SelectItem key={option.id} className={option.isTeacher ? 'text-action font-medium hover:bg-c3' : 'text-c6 hover:bg-c3'}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        )}

        {canCreate && (
          <CreateResourceAction
            configs={createableConfigs}
            onCreate={handleCreateResource}
          />
        )}
      </div>
      <div className='flex flex-col gap-8 justify-center'>
        <h1 className='text-6xl text-c6 font-medium flex flex-col items-center text-center'>Mes ressources</h1>
        <div className='grid grid-cols-4 w-full gap-6'>
          {loading
            ? Array.from({ length: 8 }).map((_, index) => <MySpaceResourceCardSkeleton key={index} />)
            : experimentationsStudents.map((item, index) => (
                <motion.div key={`${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                  <MySpaceResourceCard
                    id={String(item.id)}
                    title={item.title}
                    thumbnail={item.thumbnail ?? undefined}
                    url={item.url}
                    date={item.date}
                    actants={item.actants?.map((a: { id: number | string; title: string; picture: string | null }) => ({
                      id: String(a.id),
                      title: a.title,
                      picture: a.picture ?? undefined,
                    }))}
                    type={item.type === 'experimentation' ? 'experimentationStudents' : item.type}
                    showActions
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    onCardClick={item.type === 'bibliographie' ? handleEdit : undefined}
                  />
                </motion.div>
              ))}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <AlertModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title='Confirmer la suppression'
        type='danger'
        description={
          <div className='flex flex-col gap-4'>
            <p>
              Êtes-vous sûr de vouloir supprimer la ressource <span className='text-c6 font-medium'>"{itemToDelete?.title}"</span> ?
            </p>
            <p className='text-c4 text-sm'>Cette action est irréversible.</p>
          </div>
        }
        confirmLabel='Supprimer'
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </Layouts>
  );
};
