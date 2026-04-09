import { Layouts } from '@/components/layout/Layouts';
import { PageBanner } from '@/components/ui/PageBanner';
import { UniversityIcon, ExperimentationIcon, SettingsIcon, CitationIcon, SchoolIcon } from '@/components/ui/icons';
import { motion, Variants } from 'framer-motion';
import { StudentCard, StudentCardSkeleton } from '@/components/features/espaceEtudiant/StudentCard';
import { useEffect, useState } from 'react';
import { getCourses, getResourcesByCourse, getTeacherResources, type AllStudentResources, type StudentResourceCard, type Course } from '@/services/StudentSpace';
import { CorpusSection } from '@/components/features/home/CorpusSection';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.15 },
  }),
};

// Mapping des types vers les configurations d'affichage
const resourceTypeConfig = {
  experimentation: {
    label: 'Expérimentation',
    icon: ExperimentationIcon,
  },
  outil: {
    label: 'Outil',
    icon: SettingsIcon,
  },
  retour_experience: {
    label: "Retour d'expérience",
    icon: CitationIcon,
  },
};

interface CourseWithResources extends Course {
  resources: AllStudentResources | null;
  loading: boolean;
}

export const EspaceEtudiant: React.FC = () => {
  const [coursesWithResources, setCoursesWithResources] = useState<CourseWithResources[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [filters, setFilters] = useState<Record<number, 'all' | 'experimentation' | 'outil' | 'retour_experience'>>({});

  // État pour les ressources enseignantes
  const [teacherResources, setTeacherResources] = useState<AllStudentResources | null>(null);
  const [loadingTeacher, setLoadingTeacher] = useState(true);
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'experimentation' | 'outil' | 'retour_experience'>('experimentation');

  // Charger les cours et leurs ressources
  useEffect(() => {
    const fetchCoursesAndResources = async () => {
      setLoadingCourses(true);
      try {
        const coursesData = await getCourses();
        const courses = Array.isArray(coursesData) ? coursesData : [];

        // Initialiser avec loading state
        const initialState: CourseWithResources[] = courses.map((course) => ({
          ...course,
          resources: null,
          loading: true,
        }));
        setCoursesWithResources(initialState);
        setLoadingCourses(false);

        // Charger les ressources pour chaque cours en parallèle
        const resourcePromises = courses.map(async (course) => {
          try {
            const resources = await getResourcesByCourse(course.id);
            return { courseId: course.id, resources };
          } catch (error) {
            console.error(`Error loading resources for course ${course.id}:`, error);
            return { courseId: course.id, resources: null };
          }
        });

        const results = await Promise.all(resourcePromises);

        setCoursesWithResources((prev) =>
          prev.map((course) => {
            const result = results.find((r) => r.courseId === course.id);
            return {
              ...course,
              resources: result?.resources || null,
              loading: false,
            };
          }),
        );
      } catch (error) {
        console.error('Error loading courses:', error);
        setLoadingCourses(false);
      }
    };

    fetchCoursesAndResources();
  }, []);

  // Charger les ressources enseignantes
  useEffect(() => {
    const fetchTeacherResources = async () => {
      setLoadingTeacher(true);
      try {
        const resources = await getTeacherResources();
        setTeacherResources(resources);
      } catch (error) {
        console.error('Error loading teacher resources:', error);
        setTeacherResources(null);
      } finally {
        setLoadingTeacher(false);
      }
    };

    fetchTeacherResources();
  }, []);

  // Obtenir les ressources filtrées d'un cours
  const getFilteredResourcesForCourse = (courseId: number, resources: AllStudentResources | null): StudentResourceCard[] => {
    if (!resources) return [];
    const filter = filters[courseId] || 'experimentation';

    if (filter === 'all') {
      return [...resources.experimentations, ...resources.tools, ...resources.feedbacks].sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
    }

    switch (filter) {
      case 'experimentation':
        return resources.experimentations;
      case 'outil':
        return resources.tools;
      case 'retour_experience':
        return resources.feedbacks;
      default:
        return [];
    }
  };

  // Mettre à jour le filtre d'un cours
  const setFilterForCourse = (courseId: number, filter: 'all' | 'experimentation' | 'outil' | 'retour_experience') => {
    setFilters((prev) => ({ ...prev, [courseId]: filter }));
  };

  // Obtenir les ressources enseignantes filtrées
  const getFilteredTeacherResources = (): StudentResourceCard[] => {
    if (!teacherResources) return [];

    if (teacherFilter === 'all') {
      return [...teacherResources.experimentations, ...teacherResources.tools, ...teacherResources.feedbacks].sort(
        (a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime(),
      );
    }

    switch (teacherFilter) {
      case 'experimentation':
        return teacherResources.experimentations;
      case 'outil':
        return teacherResources.tools;
      case 'retour_experience':
        return teacherResources.feedbacks;
      default:
        return [];
    }
  };

  return (
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        title={
          <>
            <span>Espace étudiant</span>
          </>
        }
        icon={<UniversityIcon />}
        description="Un espace collaboratif dédié au partage d'expérimentations, de retours d'expérience et d'outils, afin de nourrir une dynamique collective d'apprentissage et d'innovation."
      />

      {/* Section Ressources Enseignantes */}
      {!loadingTeacher && teacherResources && teacherResources.total > 0 && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className='flex flex-col gap-12'>
          {/* En-tête de la section enseignants */}
          <div className='flex justify-between items-start gap-4 h-full'>
            <div className='flex items-start gap-4 bg-action/10 px-6 py-4 rounded-3xl border-2 border-action/30 h-full'>
              <div className='pt-2'>
                <UniversityIcon size={20} className='text-action' />
              </div>
              <div className='flex flex-col gap-2.5'>
                <h2 className='text-xl font-medium text-c6'>Ressources enseignantes</h2>
                <span className='text-c4 text-sm'>Ressources partagées par les enseignants et chercheurs</span>
              </div>
            </div>

            {/* Filtres par type */}
            <div className='flex gap-4'>
              {(['experimentation', 'outil', 'retour_experience', 'all'] as const).map((type) => {
                const isActive = teacherFilter === type;
                const Icon = type !== 'all' ? resourceTypeConfig[type].icon : null;
                const count = (() => {
                  if (!teacherResources) return 0;
                  if (type === 'all') return teacherResources.total;
                  if (type === 'experimentation') return teacherResources.experimentations.length;
                  if (type === 'outil') return teacherResources.tools.length;
                  if (type === 'retour_experience') return teacherResources.feedbacks.length;
                  return 0;
                })();

                return (
                  <motion.button
                    key={type}
                    onClick={() => setTeacherFilter(type)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-4 py-2.5 rounded-lg border-2 transition-all ease-in-out duration-200 flex items-center gap-2.5
                      ${isActive ? 'shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-action/50 bg-action/10 text-c6' : 'border-c3 text-c5 hover:bg-c2 hover:border-c4'}`}>
                    {Icon && <Icon className='w-[14px] h-[14px]' />}
                    <span className='text-base font-medium'>{type === 'all' ? 'Tout' : resourceTypeConfig[type].label}</span>
                    <span className='text-sm text-c4 font-normal'>{count}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Grille des ressources enseignantes */}
          <div className='grid grid-cols-4 w-full gap-6'>
            {getFilteredTeacherResources().map((item, index) => (
              <motion.div key={`teacher-${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                <StudentCard
                  id={String(item.id)}
                  title={item.title}
                  thumbnail={item.thumbnail || undefined}
                  actants={item.actants?.sort((a, b) => a.title.localeCompare(b.title)).map((a) => ({
                    id: String(a.id),
                    title: a.title,
                    picture: a.picture || undefined,
                  }))}
                  type={item.type}
                />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Sections par cours */}
      {loadingCourses ? (
        <div className='flex flex-col gap-12'>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className='flex flex-col gap-6'>
              <div className='h-[60px] w-[300px] bg-c3 rounded-3xl animate-pulse' />
              <div className='grid grid-cols-4 w-full gap-6'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <StudentCardSkeleton key={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : coursesWithResources.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-12 text-c4'>
          <SchoolIcon size={48} />
          <p className='mt-5 text-lg'>Aucun cours disponible</p>
        </div>
      ) : (
        <div className='flex flex-col gap-12'>
          {coursesWithResources.map((course) => {
            const currentFilter = filters[course.id] || 'experimentation';
            const filteredResources = getFilteredResourcesForCourse(course.id, course.resources);
            const hasResources = filteredResources.length > 0;

            return (
              <motion.section key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className='flex flex-col gap-12'>
                {/* En-tête de la section cours */}
                <div className='flex justify-between items-start gap-4 h-full'>
                  <div className='flex  items-start gap-4 bg-c2 px-6 py-4 rounded-3xl border-2 border-c3 h-full'>
                    <div className='pt-2'>
                      <SchoolIcon size={20} className='text-c5 ' />
                    </div>
                    <div className='flex flex-col gap-2.5 '>
                      <h2 className='text-xl font-medium text-c6 max-w-[500px] line-clamp-3 break-words'>{course.title}</h2>
                      <span className='text-c4 text-sm'>{[course.code, course.session, course.year].filter(Boolean).join(' • ')}</span>
                    </div>
                  </div>

                  {/* Filtres par type pour ce cours */}
                  <div className='flex gap-4 '>
                    {(['experimentation', 'outil', 'retour_experience', 'all'] as const).map((type) => {
                      const isActive = currentFilter === type;
                      const Icon = type !== 'all' ? resourceTypeConfig[type].icon : null;
                      const count = (() => {
                        if (!course.resources) return 0;
                        if (type === 'all') return course.resources.total;
                        if (type === 'experimentation') return course.resources.experimentations.length;
                        if (type === 'outil') return course.resources.tools.length;
                        if (type === 'retour_experience') return course.resources.feedbacks.length;
                        return 0;
                      })();

                      return (
                        <motion.button
                          key={type}
                          onClick={() => setFilterForCourse(course.id, type)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`px-4 py-2.5 rounded-lg border-2 transition-all ease-in-out duration-200 flex items-center gap-2.5
                            ${isActive ? 'shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c4 bg-c2 text-c6' : 'border-c3 text-c5 hover:bg-c2 hover:border-c4'}`}>
                          {Icon && <Icon className='w-[14px] h-[14px]' />}
                          <span className='text-base font-medium'>{type === 'all' ? 'Tout' : resourceTypeConfig[type].label}</span>
                          <span className='text-sm text-c4 font-normal'>{count}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Grille des ressources */}
                <div className='grid grid-cols-4 w-full gap-6'>
                  {course.loading ? (
                    Array.from({ length: 4 }).map((_, index) => <StudentCardSkeleton key={index} />)
                  ) : !hasResources ? (
                    <div className='col-span-4 flex items-center justify-center py-10 text-c4 rounded-3xl border-2 border-c3'>
                      <p className='text-base'>Aucune ressource pour ce cours</p>
                    </div>
                  ) : (
                    filteredResources.map((item, index) => (
                      <motion.div key={`${item.type}-${item.id}`} initial='hidden' animate='visible' variants={fadeIn} custom={index}>
                        <StudentCard
                          id={String(item.id)}
                          title={item.title}
                          thumbnail={item.thumbnail || undefined}
                          actants={item.actants?.sort((a, b) => a.title.localeCompare(b.title)).map((a) => ({
                            id: String(a.id),
                            title: a.title,
                            picture: a.picture || undefined,
                          }))}
                          type={item.type}
                        />
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}

      <div className='flex flex-col gap-16 justify-center'>
        <div className='flex flex-col gap-8'>
          <h1 className='text-6xl text-c6 font-medium flex flex-col items-center text-center'>Ressources pédagogiques</h1>
          <p className='text-c5 text-base z-[12] flex flex-col items-center text-center'>Découvrez les contenus d'Edisem produits par les chercheurs.</p>
        </div>
        <CorpusSection />
      </div>
    </Layouts>
  );
};
