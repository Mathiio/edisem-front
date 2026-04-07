import { Layouts } from '@/components/layout/Layouts';
import { motion, Variants } from 'framer-motion';
import { StudentCard, StudentCardSkeleton } from '@/components/features/espaceEtudiant/StudentCard';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserResources, getStudentCourses, getCourses, type StudentResourceCard, type Course } from '@/services/StudentSpace';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, addToast, Select, SelectItem } from '@heroui/react';
import {
  ExperimentationIcon,
  UniversityIcon,
  TrashIcon,
  PlusIcon,
  WarningIcon,
  BookIcon,
  PratiqueNarrativeIcon,
  SeminaireIcon,
  UserIcon,
  CollectionIcon,
  ArrowIcon,
  CalendarIcon,
} from '@/components/ui/icons';
import { useNavigate } from 'react-router-dom';
import { experimentationStudentConfigSimplified } from '@/pages/generic/config/experimentationStudentConfig';
import { feedbackStudentConfigSimplified } from '@/pages/generic/config/feedbackStudentConfig';
import { toolStudentConfigSimplified } from '@/pages/generic/config/toolStudentConfig';
import { conferenceConfigSimplified } from '@/pages/generic/config/conferenceConfig';
import { recitArtitstiqueConfigSimplified } from '@/pages/generic/config/recitArtitstiqueConfig';
import { recitScientifiqueConfigSimplified } from '@/pages/generic/config/recitScientifiqueConfig';
import { recitTechnoConfigSimplified } from '@/pages/generic/config/recitTechnoConfig';
import { recitCitoyenConfigSimplified } from '@/pages/generic/config/recitcitoyenConfig';
import { recitMediatiqueConfigSimplified } from '@/pages/generic/config/recitmediatiqueConfig';
import { experimentationConfigSimplified } from '@/pages/generic/config/experimentationConfig';
import { feedbackConfigSimplified } from '@/pages/generic/config/feedbackConfig';
import { toolConfigSimplified } from '@/pages/generic/config/toolConfig';
import { analyseCritiqueConfigSimplified } from '@/pages/generic/config/analyseCritiqueConfig';
import { elementEsthetiqueConfigSimplified } from '@/pages/generic/config/elementEsthetiqueConfig';
import { elementNarratifConfigSimplified } from '@/pages/generic/config/elementNarratifConfig';
import { bibliographyStudentConfigSimplified } from '@/pages/generic/config/bibliographyStudentConfig';
import { RESOURCE_TYPES } from '@/config/resourceConfig';
import { useAuth } from '@/hooks/useAuth';
import type { Key } from 'react';
import { Button } from '@/theme/components/button';

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=StudentSpace';

const createableConfigs = [
  { config: experimentationStudentConfigSimplified, route: '/add-resource/experimentation', icon: ExperimentationIcon, category: 'experimentation' },
  { config: experimentationConfigSimplified, route: '/add-resource/experimentation-chercheur', icon: ExperimentationIcon, category: 'experimentation' },
  { config: toolStudentConfigSimplified, route: '/add-resource/outil', icon: UniversityIcon, category: 'outil' },
  { config: toolConfigSimplified, route: '/add-resource/outil-chercheur', icon: UniversityIcon, category: 'outil' },
  { config: feedbackStudentConfigSimplified, route: '/add-resource/retour-experience', icon: BookIcon, category: 'feedback' },
  { config: feedbackConfigSimplified, route: '/add-resource/retour-experience-chercheur', icon: BookIcon, category: 'feedback' },
  { config: conferenceConfigSimplified, route: '/add-resource/conference', icon: SeminaireIcon, category: 'conference' },
  { config: recitScientifiqueConfigSimplified, route: '/add-resource/recit-scientifique', icon: PratiqueNarrativeIcon, category: 'recit' },
  { config: recitArtitstiqueConfigSimplified, route: '/add-resource/recit-artistique', icon: PratiqueNarrativeIcon, category: 'recit' },
  { config: recitTechnoConfigSimplified, route: '/add-resource/recit-techno', icon: PratiqueNarrativeIcon, category: 'recit' },
  { config: recitCitoyenConfigSimplified, route: '/add-resource/recit-citoyen', icon: PratiqueNarrativeIcon, category: 'recit' },
  { config: recitMediatiqueConfigSimplified, route: '/add-resource/recit-mediatique', icon: PratiqueNarrativeIcon, category: 'recit' },
  { config: analyseCritiqueConfigSimplified, route: '/add-resource/analyse-critique', icon: CollectionIcon, category: 'analyse' },
  { config: elementEsthetiqueConfigSimplified, route: '/add-resource/element-esthetique', icon: CollectionIcon, category: 'element' },
  { config: elementNarratifConfigSimplified, route: '/add-resource/element-narratif', icon: CollectionIcon, category: 'element' },
  { config: bibliographyStudentConfigSimplified, route: '/add-resource/bibliographie', icon: BookIcon, category: 'bibliographie' },
];

// Bento sections definition
const bentoSections = [
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
    filter: (r: StudentResourceCard) => (r.type || '').includes('experimentation'),
  },
  {
    key: 'outil',
    title: 'Mes outils',
    icon: UniversityIcon,
    color: '#FFF1B8',
    description: 'Outils et méthodes utilisés',
    filter: (r: StudentResourceCard) => (r.type || '').includes('outil'),
  },
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
    key: 'feedback',
    title: "Mes retours d'expérience",
    icon: BookIcon,
    color: '#C8E6C9',
    description: 'Bilans et retours sur les expérimentations',
    filter: (r: StudentResourceCard) => {
      const type = r.type || '';
      return type.includes('retour') || type.includes('feedback');
    },
  },
  {
    key: 'analyse',
    title: 'Mes analyses critiques',
    icon: CollectionIcon,
    color: '#D4A5FF',
    description: 'Annotations et analyses critiques',
    filter: (r: StudentResourceCard) => (r.type || '') === 'annotation',
  },
  {
    key: 'element',
    title: 'Mes éléments',
    icon: CollectionIcon,
    color: '#FFD6A5',
    description: 'Éléments esthétiques et narratifs',
    filter: (r: StudentResourceCard) => (r.type || '').includes('element_'),
  },
  {
    key: 'bibliographie',
    title: 'Mes bibliographies',
    icon: BookIcon,
    color: '#B8D4E3',
    description: 'Références bibliographiques',
    filter: (r: StudentResourceCard) => (r.type || '') === 'bibliographie',
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
}> = ({ section, resources, loading, expanded, onToggle, onEdit, onDelete, canCreate, createConfigs, onCreateResource }) => {
  const Icon = section.icon;
  const displayResources = expanded ? resources : resources.slice(0, 4);
  const categoryConfigs = createConfigs.filter((c) => c.category === section.key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col  p-[20px] rounded-[16px] border-2 border-c3 hover:border-c4/30 transition-all duration-300'>
      {/* Section header */}
      <div className='flex flex-row items-center justify-between gap-[20px]'>
        <div className='flex items-center gap-5'>
          <div className='p-[8px] rounded-[10px] flex items-center justify-center border-2 border-c3 ' style={{ backgroundColor: `${section.color}15` }}>
            <Icon size={20} style={{ color: section.color }} />
          </div>
          <div className='flex flex-col'>
            <h3 className='text-[24px] text-c6 font-semibold'>{section.title}</h3>
            <p className='text-c4 text-[12px]'>{section.description}</p>
          </div>
        </div>
        <div className='flex items-center gap-[8px]'>
          <span className='text-[24px] font-semibold text-c6'>{resources.length}</span>
          {canCreate && categoryConfigs.length > 0 && (
            <Dropdown>
              <DropdownTrigger>
                <button className='p-[6px] rounded-[8px] bg-c2 border-2 border-c3 hover:bg-c3 transition-all duration-200'>
                  <PlusIcon size={14} className='text-c5 rotate-90' />
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label='Créer'
                className='bg-c2 rounded-[16px] border-2 border-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] p-[4px] min-w-[200px]'
                onAction={(key: Key) => {
                  const config = categoryConfigs.find((c) => String(c.config.templateId) === String(key));
                  if (config) onCreateResource(config.route);
                }}>
                {categoryConfigs.map(({ config, icon: CIcon }) => (
                  <DropdownItem key={String(config.templateId)} className='hover:bg-c3 text-c6 px-3 py-2 rounded-[8px]' startContent={<CIcon size={14} className='text-c5' />}>
                    {config.resourceType}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Resources */}
      {loading ? (
        <div className='grid grid-cols-4 gap-[15px]'>
          {Array.from({ length: 4 }).map((_, i) => (
            <StudentCardSkeleton key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <></>
      ) : (
        <>
          <div className='grid grid-cols-4 gap-[15px] mt-[20px]'>
            {displayResources.map((item, index) => (
              <motion.div key={`${section.key}-${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                <StudentCard
                  id={String(item.id)}
                  title={item.title}
                  thumbnail={item.thumbnail ? (item.thumbnail.startsWith('http') ? item.thumbnail : `https://tests.arcanes.ca/omk${item.thumbnail}`) : undefined}
                  actants={item.actants?.map((a: { id: number | string; title: string; picture: string | null }) => ({
                    id: String(a.id),
                    title: a.title,
                    picture: a.picture ? (a.picture.startsWith('http') ? a.picture : `https://tests.arcanes.ca/omk${a.picture}`) : undefined,
                  }))}
                  type={(item.type as string) === 'experimentation' ? 'experimentationStudents' : item.type}
                  showActions
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
          </div>
          {resources.length > 4 && (
            <button onClick={onToggle} className='flex items-center gap-[6px] self-center text-c5 hover:text-c6 text-[14px] transition-colors pt-[6px]'>
              {expanded ? 'Voir moins' : `Voir tout (${resources.length})`}
              <ArrowIcon size={12} className={`transition-transform ${expanded ? 'rotate-[-90deg]' : 'rotate-90'}`} />
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
      if (!userId) return;
      const resources = await getUserResources(parseInt(userId));
      resources.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
      setAllResources(resources);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
        const url = RESOURCE_TYPES[type as keyof typeof RESOURCE_TYPES].getUrl(id);
        navigate(`${url}?mode=edit`);
      } else {
        navigate(`/espace-etudiant/experimentation/${id}?mode=edit`);
      }
    },
    [navigate],
  );

  const handleDeleteClick = useCallback(
    (id: string) => {
      const item = allResources.find((r) => r.id === id);
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
      const response = await fetch(`${API_BASE}&action=deleteResource&id=${itemToDelete.id}&json=1`);
      const result = await response.json();
      if (result.success) {
        addToast({ title: 'Succès', description: 'Ressource supprimée.', color: 'success' });
        await fetchResources();
      } else {
        addToast({ title: 'Erreur', description: result.message || 'Erreur.', color: 'danger' });
      }
    } catch (error) {
      console.error('Error deleting:', error);
      addToast({ title: 'Erreur', description: 'Erreur lors de la suppression.', color: 'danger' });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, fetchResources]);

  // Stats
  const totalResources = allResources.length;

  return (
    <Layouts className='col-span-10 flex flex-col gap-[40px] z-0 overflow-visible'>
      {/* ===== HERO / PROFILE ===== */}
      <div className='flex flex-col gap-[25px] pt-[60px]'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-[20px]'>
            <div className='w-[75px] h-[75px] rounded-xl bg-gradient-to-br from-c3 to-c2 flex items-center justify-center border-2 border-c3 overflow-hidden'>
              {userData?.picture ? <img src={userData.picture} alt={fullName} className='w-full h-full object-cover' /> : <UserIcon size={32} className='text-c5' />}
            </div>
            <div className='flex flex-col gap-[4px]'>
              <h1 className='text-[32px] text-c6 font-semibold'>{fullName}</h1>
              <div className='flex items-center gap-[10px]'>
                <span className='text-c4 text-[14px]'>{userTypeLabel}</span>
                <span className='text-c3'>|</span>
                <span className='text-c4 text-[14px]'>
                  {totalResources} ressource{totalResources !== 1 ? 's' : ''}
                </span>
                {courses.length > 0 && (
                  <>
                    <span className='text-c3'>|</span>
                    <span className='text-c4 text-[14px]'>{courses.length} cours</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Course selector + Global create */}
          <div className='flex items-end justify-end gap-[10px]'>
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
                className='w-[200px]'
                classNames={{
                  trigger: 'bg-c2 border-2 border-c3 hover:bg-c3',
                  label: 'text-c5',
                  value: 'text-c6',
                  popoverContent: 'bg-c2 border-2 border-c3',
                }}>
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
              <Dropdown>
                <DropdownTrigger>
                  <div className='h-[48px] hover:bg-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 flex flex-row rounded-[8px] border-2 border-c3 items-center  px-[15px] py-2 text-[14px] gap-[8px] text-c6 transition-all duration-200'>
                    <PlusIcon className='text-c6 rotate-90' size={14} />
                    Créer une ressource
                  </div>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label='Créer'
                  className='bg-c2 rounded-[12px] border-2 border-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] p-[8px] min-w-[220px]'
                  onAction={(key: Key) => {
                    const config = createableConfigs.find((c) => String(c.config.templateId) === String(key));
                    if (config) handleCreateResource(config.route);
                  }}>
                  {createableConfigs.map(({ config, icon: Icon }) => (
                    <DropdownItem
                      key={String(config.templateId)}
                      className='hover:bg-c3 text-c6 px-3 py-2 rounded-[8px] transition-all duration-200'
                      startContent={<Icon size={16} className='text-c5' />}>
                      {config.resourceType}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        </div>

        {/* Warning */}
        {!isActant && !loadingCourses && courses.length === 0 && (
          <div className='flex items-center gap-[10px] bg-warning/10 border-2 border-warning/30 rounded-[10px] px-[15px] py-[10px] self-start'>
            <WarningIcon size={18} className='text-warning' />
            <span className='text-c5 text-[14px]'>Inscription à un cours requise pour créer des ressources.</span>
          </div>
        )}

        {/* Quick stats bar */}
        <div className='flex gap-[8px] flex-wrap'>
          {bentoSections.map((section) => {
            const Icon = section.icon;
            const count = allResources.filter(section.filter).length;
            return (
              <div key={section.key} className='flex items-center gap-3 px-[15px] py-[8px] rounded-[10px] border-2 border-c3 bg-c1'>
                <Icon size={16} style={{ color: section.color }} />
                <span className='text-[14px] text-c5'>{section.title.replace('Mes ', '')}</span>
                <span className='text-[14px] font-semibold text-c6'>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== RECENT ACTIVITY ===== */}
      {!loading && allResources.length > 0 && (
        <div className='flex flex-col gap-[15px]'>
          <h2 className='text-[24px] text-c6 font-semibold flex items-center gap-[10px]'>
            <CalendarIcon size={18} className='text-c4' />
            Dernières modifications
          </h2>
          <div className='grid grid-cols-4 gap-[15px]'>
            {allResources.slice(0, 4).map((item, index) => (
              <motion.div key={`recent-${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                <StudentCard
                  id={String(item.id)}
                  title={item.title}
                  thumbnail={item.thumbnail ? (item.thumbnail.startsWith('http') ? item.thumbnail : `https://tests.arcanes.ca/omk${item.thumbnail}`) : undefined}
                  actants={item.actants?.map((a: { id: number | string; title: string; picture: string | null }) => ({
                    id: String(a.id),
                    title: a.title,
                    picture: a.picture ? (a.picture.startsWith('http') ? a.picture : `https://tests.arcanes.ca/omk${a.picture}`) : undefined,
                  }))}
                  type={(item.type as string) === 'experimentation' ? 'experimentationStudents' : item.type}
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
      <div className='flex flex-col gap-[20px]'>
        <h2 className='text-[24px] text-c6 font-semibold flex items-center gap-[10px]'>
          <CalendarIcon size={18} className='text-c4' />
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
            createConfigs={createableConfigs}
            onCreateResource={handleCreateResource}
          />
        ))}
      </div>

      {/* Delete modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        classNames={{ base: 'bg-c1 border-2 border-c3', header: 'border-b border-c3', body: 'py-6', footer: 'border-t border-c3' }}>
        <ModalContent>
          <ModalHeader className='flex flex-col gap-1'>
            <div className='flex items-center gap-2'>
              <div className='p-1 rounded-[10px] bg-[#FF0000]/20'>
                <TrashIcon size={20} className='text-[#FF0000]' />
              </div>
              <span className='text-c6'>Confirmer la suppression</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className='text-c5'>
              Supprimer <span className='text-c6 font-semibold'>"{itemToDelete?.title}"</span> ?
            </p>
            <p className='text-c4 text-[14px]'>Cette action est irréversible.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant='light' onPress={() => setDeleteModalOpen(false)} className='text-c5 hover:text-c6 min-h'>
              Annuler
            </Button>
            <Button onPress={handleConfirmDelete} isLoading={isDeleting} className='bg-[#FF0000]/70 hover:bg-[#FF0000]/90'>
              Supprimer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layouts>
  );
};
