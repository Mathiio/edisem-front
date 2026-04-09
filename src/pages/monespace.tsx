import { Layouts } from '@/components/layout/Layouts';
import { PageBanner } from '@/components/ui/PageBanner';
import { motion, Variants } from 'framer-motion';
import { StudentCard, StudentCardSkeleton } from '@/components/features/espaceEtudiant/StudentCard';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserResources, getStudentCourses, getCourses, type Course } from '@/services/StudentSpace';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, addToast } from '@heroui/react';
import { ExperimentationIcon, UniversityIcon, PlusIcon, WarningIcon, BookIcon } from '@/components/ui/icons';
import { useNavigate } from 'react-router-dom';
import { experimentationStudentConfigSimplified } from '@/pages/generic/config/experimentationStudentConfig';
import { feedbackStudentConfigSimplified } from '@/pages/generic/config/feedbackStudentConfig';
import { toolStudentConfigSimplified } from '@/pages/generic/config/toolStudentConfig';
import { bibliographyStudentConfigSimplified } from '@/pages/generic/config/bibliographyStudentConfig';
import { useAuth } from '@/hooks/useAuth';
import type { Key } from 'react';
import { AlertModal } from '@/components/ui/AlertModal';
import { Select, SelectItem } from '@/theme/components';

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=StudentSpace';

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
    config: feedbackStudentConfigSimplified,
    route: '/add-resource/retour-experience',
    icon: UniversityIcon,
  },
  {
    config: bibliographyStudentConfigSimplified,
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

export const MonEspace: React.FC = () => {
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

  // Style identique au ProfilDropdown
  const dropdownButtonClass =
    'hover:bg-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 flex flex-row rounded-lg border-2 border-c3 items-center justify-center px-4 py-2.5 text-base gap-2.5 text-c6 transition-all ease-in-out duration-200';

  const fetchExperimentations = useCallback(async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const resources = await getUserResources(parseInt(userId));
      resources.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
      setExperimentationsStudents(resources);
    } catch (error) {
      console.error('Error loading student resources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (type === 'bibliographie') {
        navigate(`/corpus/bibliographie/${id}?mode=edit`);
        return;
      }

      let baseRoute = 'experimentation';
      if (type) {
        if (type.includes('outil')) {
          baseRoute = 'outil';
        } else if (type.includes('retour') || type.includes('experience')) {
          baseRoute = 'retour-experience';
        }
      }
      navigate(`/espace-etudiant/${baseRoute}/${id}?mode=edit`);
    },
    [navigate],
  );

  // Handler pour ouvrir la modal de suppression
  const handleDeleteClick = useCallback(
    (id: string) => {
      const item = experimentationsStudents.find((exp) => exp.id === id);
      if (item) {
        setItemToDelete({ id, title: item.title || 'Sans titre' });
        setDeleteModalOpen(true);
      }
    },
    [experimentationsStudents],
  );

  // Handler pour confirmer la suppression (soft delete via API PHP)
  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}&action=deleteResource&id=${itemToDelete.id}&json=1`);

      let result;
      if (!response.ok && response.status !== 500) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        // Si le parsing JSON échoue mais que le code est 200 ou 500 (cas du crash Doctrine après suppression)
        if (response.ok || response.status === 500) {
          result = { success: true };
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      }

      const isDoctrineFalseError =
        result.error && result.error.includes('Doctrine\\ORM\\ORMInvalidArgumentException') && result.error.includes('Binding entities to query parameters');

      if (result.success || result.id || isDoctrineFalseError) {
        addToast({
          title: 'Succès',
          description: 'La ressource a été supprimée avec succès.',
          color: 'success',
        });
        await fetchExperimentations();
      } else {
        addToast({
          title: 'Erreur',
          description: result.error || result.message || 'Une erreur est survenue lors de la suppression.',
          color: 'danger',
        });
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      addToast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        color: 'danger',
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
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

        {/* Dropdown d'ajout de ressource */}
        {canCreate && (
          <Dropdown
            classNames={{
              content: 'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3 min-w-[200px]',
            }}>
            <DropdownTrigger>
              <div className={dropdownButtonClass}>
                Ajouter une ressource
                <PlusIcon className='text-c6 rotate-90' size={14} />
              </div>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Actions d'ajout"
              className='p-2'
              classNames={{
                base: 'bg-transparent shadow-none border-0',
                list: 'bg-transparent',
              }}
              onAction={(key: Key) => {
                const config = createableConfigs.find((c) => String(c.config.templateId) === String(key));
                if (config) handleCreateResource(config.route);
              }}>
              {createableConfigs.map(({ config, icon: Icon }) => (
                <DropdownItem
                  key={String(config.templateId)}
                  className='cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                  startContent={<Icon size={16} className='text-c5' />}>
                  {config.resourceType}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        )}
      </div>
      <div className='flex flex-col gap-8 justify-center'>
        <h1 className='text-6xl text-c6 font-medium flex flex-col items-center text-center'>Mes ressources</h1>
        <div className='grid grid-cols-4 w-full gap-6'>
          {loading
            ? Array.from({ length: 8 }).map((_, index) => <StudentCardSkeleton key={index} />)
            : experimentationsStudents.map((item, index) => (
                <motion.div key={`${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                  <StudentCard
                    id={String(item.id)}
                    title={item.title}
                    thumbnail={item.thumbnail ? (item.thumbnail.startsWith('http') ? item.thumbnail : `https://tests.arcanes.ca/omk${item.thumbnail}`) : undefined}
                    actants={item.actants?.map((a: { id: number | string; title: string; picture: string | null }) => ({
                      id: String(a.id),
                      title: a.title,
                      picture: a.picture ? (a.picture.startsWith('http') ? a.picture : `https://tests.arcanes.ca/omk${a.picture}`) : undefined,
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
