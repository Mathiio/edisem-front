import { Layouts } from '@/components/layout/Layouts';
import { motion, Variants } from 'framer-motion';
import { MySpaceResourceCard, MySpaceResourceCardSkeleton } from '@/components/features/espaceEtudiant/MySpaceResourceCard';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserResources, getStudentCourses, getCourses, deleteUserResource, type StudentResourceCard, type Course } from '@/services/StudentSpace';
import { addToast } from '@heroui/react';
import { Select, SelectItem } from '@/theme/components';
import { CreateResourceAction } from '@/components/features/espaceEtudiant/CreateResourceAction';
import { AlertModal } from '@/components/ui/AlertModal';
import {
  ExperimentationIcon,
  UniversityIcon,
  WarningIcon,
  BookIcon,
  PratiqueNarrativeIcon,
  SeminaireIcon,
  UserIcon,
  CollectionIcon,
  ArrowIcon,
} from '@/components/ui/icons';
import { useNavigate } from 'react-router-dom';
import { toolConfigSimplified } from '@/pages/generic/config/toolConfig';
import { conferenceConfigSimplified } from '@/pages/generic/config/conferenceConfig';
import { recitArtitstiqueConfigSimplified } from '@/pages/generic/config/recitArtitstiqueConfig';
import { recitScientifiqueConfigSimplified } from '@/pages/generic/config/recitScientifiqueConfig';
import { recitTechnoConfigSimplified } from '@/pages/generic/config/recitTechnoConfig';
import { recitCitoyenConfigSimplified } from '@/pages/generic/config/recitcitoyenConfig';
import { recitMediatiqueConfigSimplified } from '@/pages/generic/config/recitmediatiqueConfig';
import { experimentationConfigSimplified } from '@/pages/generic/config/experimentationConfig';
import { bibliographyConfigSimplified } from '@/pages/generic/config/bibliographyConfig';
import { mediagraphyConfigSimplified } from '@/pages/generic/config/mediagraphyConfig';
import { intervenantConfigSimplified } from '@/pages/generic/config/intervenantConfig';
import { personneConfigSimplified } from '@/pages/generic/config/personneConfig';
import { organisationConfigSimplified } from '@/pages/generic/config/organisationConfig';
import { RESOURCE_TYPES, getResourceEditUrl } from '@/config/resourceConfig';
import { useAuth } from '@/hooks/useAuth';

// role: 'student' = étudiants uniquement, 'actant' = actants uniquement, 'any' = les deux
const createableConfigs = [
  { config: experimentationConfigSimplified, route: '/add-resource/experimentation-chercheur', icon: ExperimentationIcon, category: 'experimentation', role: 'actant' as const },
  { config: toolConfigSimplified, route: '/add-resource/outil-chercheur', icon: UniversityIcon, category: 'outil', role: 'actant' as const },
  { config: conferenceConfigSimplified, route: '/add-resource/conference', icon: SeminaireIcon, category: 'conference', role: 'actant' as const },
  { config: intervenantConfigSimplified, route: '/add-resource/intervenant', icon: UserIcon, category: 'intervenant', role: 'actant' as const },
  { config: personneConfigSimplified, route: '/add-resource/personne', icon: UserIcon, category: 'personne', role: 'actant' as const },
  { config: organisationConfigSimplified, route: '/add-resource/organisation', icon: CollectionIcon, category: 'organisation', role: 'actant' as const },
  { config: recitScientifiqueConfigSimplified, route: '/add-resource/recit-scientifique', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitArtitstiqueConfigSimplified, route: '/add-resource/recit-artistique', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitTechnoConfigSimplified, route: '/add-resource/recit-techno', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitCitoyenConfigSimplified, route: '/add-resource/recit-citoyen', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: recitMediatiqueConfigSimplified, route: '/add-resource/recit-mediatique', icon: PratiqueNarrativeIcon, category: 'recit', role: 'actant' as const },
  { config: bibliographyConfigSimplified, route: '/add-resource/bibliographie', icon: BookIcon, category: 'bibliographie', role: 'any' as const },
  { config: mediagraphyConfigSimplified, route: '/add-resource/mediagraphie', icon: BookIcon, category: 'mediagraphie', role: 'any' as const },
];

// Bento sections definition
const bentoSections = [
  {
    key: 'conference',
    title: 'Mes conférences',
    icon: SeminaireIcon,
    color: '#FFB6C1',
    description: "Séminaires, colloques et journées d'études",
    filter: (r: StudentResourceCard) => {
      const type = r.type || '';
      return type.includes('seminaire') || type.includes('conference') || type.includes('colloque');
    },
  },
  {
    key: 'recit',
    title: 'Mes récits',
    icon: PratiqueNarrativeIcon,
    color: '#AFC8FF',
    description: '5 domaines : Scientifique, Artistique, Techno, Citoyen, Médiatique',
    filter: (r: StudentResourceCard) => (r.type || '').includes('recit'),
  },
  {
    key: 'experimentation',
    title: 'Mes expérimentations',
    icon: ExperimentationIcon,
    color: '#A9E2DA',
    description: 'Expérimentations et hypothèses de recherche',
    filter: (r: StudentResourceCard) => r.type === 'experimentation',
  },
  {
    key: 'outil',
    title: 'Mes outils',
    icon: UniversityIcon,
    color: '#FFF1B8',
    description: 'Outils et méthodes utilisés',
    filter: (r: StudentResourceCard) => r.type === 'outil',
  },
  {
    key: 'bibliographie',
    title: 'Mes bibliographies',
    icon: BookIcon,
    color: '#B8D4FF',
    description: 'Références bibliographiques',
    filter: (r: StudentResourceCard) => (r.type || '') === 'bibliographie',
  },
  {
    key: 'mediagraphie',
    title: 'Mes médiagraphies',
    icon: BookIcon,
    color: '#FFB8E6',
    description: 'Références médiagraphiques',
    filter: (r: StudentResourceCard) => (r.type || '') === 'mediagraphie',
  },
];

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: index * 0.08 },
  }),
};

// Bento section component
const BentoSection: React.FC<{
  section: (typeof bentoSections)[0];
  resources: StudentResourceCard[];
  loading: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (id: string, type?: string) => void;
  onDelete: (id: string) => void;
  canCreate: boolean;
  createConfigs: typeof createableConfigs;
  onCreateResource: (route: string) => void;
  onCardClick?: (id: string, type?: string) => void;
}> = ({ section, resources, loading, expanded, onToggle, onEdit, onDelete, canCreate, createConfigs, onCreateResource, onCardClick }) => {
  const Icon = section.icon;
  const displayResources = expanded ? resources : resources.slice(0, 4);
  const categoryConfigs = createConfigs.filter((c) => c.category === section.key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col p-5 rounded-2xl border-2 border-c3 transition-all duration-300'>
      {/* Section header */}
      <div className='flex flex-row items-center justify-between gap-5'>
        <div className='flex items-center gap-5'>
          <div className='p-2 rounded-lg flex items-center justify-center border-2 border-c3' style={{ backgroundColor: `${section.color}15` }}>
            <Icon size={20} style={{ color: section.color }} />
          </div>
          <div className='flex flex-col'>
            <h3 className='text-2xl text-c6 font-semibold'>{section.title}</h3>
            <p className='text-c4 text-xs'>{section.description}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {canCreate && (
            <CreateResourceAction
              configs={categoryConfigs}
              onCreate={onCreateResource}
              compact
            />
          )}
        </div>
      </div>

      {/* Resources */}
      {loading ? (
        <div className='grid grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <MySpaceResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <></>
      ) : (
        <>
          <div className='grid grid-cols-4 gap-4 mt-5'>
            {displayResources.map((item, index) => (
              <motion.div key={`${section.key}-${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
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
                  type={item.type}
                  showActions
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCardClick={onCardClick}
                />
              </motion.div>
            ))}
          </div>
          {resources.length > 4 && (
            <button onClick={onToggle} className='flex items-center gap-1.5 self-center text-c5 hover:text-c6 text-sm transition-colors pt-1.5 cursor-pointer'>
              {expanded ? 'Voir moins' : `Voir tout (${resources.length})`}
              <ArrowIcon size={12} className={`transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
            </button>
          )}
        </>
      )}
    </motion.div>
  );
};

export const MonEspace3: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allResources, setAllResources] = useState<StudentResourceCard[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const TEACHER_RESOURCES_OPTION = 'teacher-resources';
  const isActant = userData?.type === 'actant';

  useEffect(() => {
    if (isActant) setSelectedCourseId(TEACHER_RESOURCES_OPTION);
  }, [isActant]);

  const canCreate = useMemo(() => isActant || courses.length > 0, [isActant, courses.length]);

  // Filtrer les configs créables selon le rôle (étudiant ou actant)
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

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const omekaUserId = userData?.omekaUserId ?? (localStorage.getItem('omekaUserId') ? parseInt(localStorage.getItem('omekaUserId')!, 10) : null);
      if (!userId && !omekaUserId) return;
      const resources = await getUserResources(userId ? parseInt(userId, 10) : 0, omekaUserId);
      resources.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
      setAllResources(resources);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }, [userData?.omekaUserId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const userId = localStorage.getItem('userId');
        if (isActant) {
          const allCourses = await getCourses();
          setCourses(Array.isArray(allCourses) ? allCourses : []);
        } else if (userId) {
          const studentCourses = await getStudentCourses(parseInt(userId));
          setCourses(Array.isArray(studentCourses) ? studentCourses : []);
          if (studentCourses.length === 1) setSelectedCourseId(studentCourses[0].id);
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

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleCreateResource = useCallback(
    (route: string) => {
      if (isActant && !selectedCourseId) {
        addToast({ title: 'Sélection requise', description: 'Veuillez sélectionner une destination.', color: 'warning' });
        return;
      }
      const courseId = selectedCourseId === TEACHER_RESOURCES_OPTION ? null : selectedCourseId || (courses.length === 1 ? courses[0].id : null);
      navigate(`${route}${courseId ? `?courseId=${courseId}` : ''}`);
    },
    [selectedCourseId, courses, isActant, navigate, TEACHER_RESOURCES_OPTION],
  );

  const handleEdit = useCallback(
    (id: string, type?: string) => {
      if (type && RESOURCE_TYPES[type as keyof typeof RESOURCE_TYPES]) {
        navigate(getResourceEditUrl(type, id));
        return;
      }
      navigate(getResourceEditUrl('experimentation_etudiant', id));
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

  // Stats
  const totalResources = allResources.length;

  return (
    <Layouts className='col-span-10 flex flex-col gap-10 z-0 overflow-visible'>
      {/* ===== HERO / PROFILE ===== */}
      <div className='flex flex-col gap-6 pt-16'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-5'>
            <div className='size-20 rounded-xl bg-gradient-to-br from-c3 to-c2 flex items-center justify-center border-2 border-c3 overflow-hidden'>
              {userData?.picture ? <img src={userData.picture} alt={fullName} className='w-full h-full object-cover' /> : <UserIcon size={32} className='text-c5' />}
            </div>
            <div className='flex flex-col'>
              <h1 className='text-3xl text-c6 font-semibold'>{fullName}</h1>
              <div className='flex items-center gap-2.5'>
                <span className='text-c4 text-sm'>{userTypeLabel}</span>
                <span className='text-c3'>|</span>
                <span className='text-c4 text-sm'>
                  {totalResources} ressource{totalResources !== 1 ? 's' : ''}
                </span>
                {courses.length > 0 && (
                  <>
                    <span className='text-c3'>|</span>
                    <span className='text-c4 text-sm'>{courses.length} cours</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Course selector + Global create */}
          <div className='flex items-end justify-end gap-2.5'>
            {canCreate && (isActant || courses.length > 1) && (
              <Select
                label='Destination'
                placeholder='Sélectionnez'
                size='sm'
                selectedKeys={selectedCourseId ? [String(selectedCourseId)] : []}
                onSelectionChange={(keys) => {
                  const id = Array.from(keys)[0];
                  if (id === TEACHER_RESOURCES_OPTION) setSelectedCourseId(TEACHER_RESOURCES_OPTION);
                  else setSelectedCourseId(id ? parseInt(String(id)) : null);
                }}
                isLoading={loadingCourses}
                className='max-w-xs'>
                {[
                  ...(isActant ? [{ id: TEACHER_RESOURCES_OPTION, label: 'Ress. enseignantes', isTeacher: true }] : []),
                  ...courses.map((c) => ({ id: String(c.id), label: `${c.title}${c.code ? ` (${c.code})` : ''}`, isTeacher: false })),
                ].map((option) => (
                  <SelectItem key={option.id} className={option.isTeacher ? 'text-action font-semibold hover:bg-c3' : 'text-c6 hover:bg-c3'}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            )}

            {canCreate && (
              <CreateResourceAction
                configs={filteredCreateableConfigs}
                onCreate={handleCreateResource}
              />
            )}
          </div>
        </div>

        {/* Warning */}
        {!isActant && !loadingCourses && courses.length === 0 && (
          <div className='flex items-center gap-2.5 bg-warning/10 border-2 border-warning/30 rounded-xl px-4 py-2.5 self-start'>
            <WarningIcon size={18} className='text-warning' />
            <span className='text-c5 text-sm'>Inscription à un cours requise pour créer des ressources.</span>
          </div>
        )}

        {/* Quick stats bar */}
        <div className='flex gap-2 flex-wrap'>
          {bentoSections.map((section) => {
            const Icon = section.icon;
            const count = allResources.filter(section.filter).length;
            return (
              <div key={section.key} className='flex items-center gap-3 px-4 py-2 rounded-lg border-2 border-c3 bg-c1'>
                <Icon size={16} style={{ color: section.color }} />
                <span className='text-sm text-c5'>{section.title.replace('Mes ', '')}</span>
                <span className='text-sm font-semibold text-c6'>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== RECENT ACTIVITY ===== */}
      {!loading && allResources.length > 0 && (
        <div className='flex flex-col gap-4'>
          <h2 className='text-2xl text-c6 font-semibold flex items-center gap-2.5'>
            Dernières modifications
          </h2>
          <div className='grid grid-cols-4 gap-4'>
            {allResources.slice(0, 4).map((item, index) => (
              <motion.div key={`recent-${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
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
                  type={item.type}
                  showActions
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ===== BENTO SECTIONS ===== */}
      <div className='flex flex-col gap-5'>
        <h2 className='text-2xl text-c6 font-semibold flex items-center gap-2.5'>
          Mes ressources
        </h2>
        {bentoSections.map((section) => (
          <BentoSection
            key={section.key}
            section={section}
            resources={allResources.filter(section.filter)}
            loading={loading}
            expanded={expandedSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            canCreate={canCreate}
            createConfigs={filteredCreateableConfigs}
            onCreateResource={handleCreateResource}
            onCardClick={section.key === 'bibliographie' || section.key === 'mediagraphie' ? handleEdit : undefined}
          />
        ))}
      </div>

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
