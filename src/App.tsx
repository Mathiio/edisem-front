import { useThemeMode } from '@/hooks/useThemeMode';
import { Route, Routes } from 'react-router-dom';
import { Intervenant } from '@/pages/intervenant';
import { Home } from '@/pages/home';
import { Edition } from '@/pages/corpus/confsByEdition';
import { LoginPage } from '@/pages/login';
import { CahierRecherche } from '@/pages/cahierRecherche';
import { withAuth } from '@/pages/withAuth';
import Visualisation from '@/pages/visualisation';
import { ToastProvider } from '@heroui/react';
import { Intervenants } from '@/pages/intervenants';
import { Colloques } from '@/pages/corpus/Colloques';
import { PratiquesNarratives } from '@/pages/corpus/pratiquesNarratives';
import { JourneesEtudes } from '@/pages/corpus/JourneesEtudes';
import { Seminaires } from '@/pages/corpus/Seminaires';
import { Experimentations } from '@/pages/corpus/Experimentations';
import { MisesEnRecits } from '@/pages/corpus/recits';
import { Personne } from '@/pages/personne';
import { toolConfig, toolStudentConfig } from '@/pages/generic/config/toolConfig';
import { ToolDetailPage } from '@/pages/generic/ToolDetailPage';
import { RecitsByGenre } from '@/pages/corpus/recitsByGenre';
import { RecitsByType } from '@/pages/corpus/recitsByType';
import { ConfigurableDetailPage } from '@/pages/generic/ConfigurableDetailPage';
import { conferenceConfig } from '@/pages/generic/config/conferenceConfig';
import { experimentationConfig } from '@/pages/generic/config/experimentationConfig';
import { recitArtitstiqueConfig } from '@/pages/generic/config/recitArtitstiqueConfig';
import { elementEsthetiqueConfig } from '@/pages/generic/config/elementEsthetiqueConfig';
import { elementNarratifConfig } from '@/pages/generic/config/elementNarratifConfig';
import { feedbackConfig } from '@/pages/generic/config/feedbackConfig';
import { analyseCritiqueConfig } from '@/pages/generic/config/analyseCritiqueConfig';
import { recitTechnoConfig } from '@/pages/generic/config/recitTechnoConfig';
import { recitScientifiqueConfig } from '@/pages/generic/config/recitScientifiqueConfig';
import { recitMediatiqueConfig } from '@/pages/generic/config/recitmediatiqueConfig';
import { recitCitoyenConfig } from '@/pages/generic/config/recitcitoyenConfig';
import { intervenantConfig } from '@/pages/generic/config/intervenantConfig';
import { personneConfig } from '@/pages/generic/config/personneConfig';
import { organisationConfig } from '@/pages/generic/config/organisationConfig';
import { motCleConfig } from '@/pages/generic/config/motCleConfig';
import { universiteConfig } from '@/pages/generic/config/universiteConfig';
import { ecoleDoctoraleConfig } from '@/pages/generic/config/ecoleDoctoraleConfig';
import { laboratoireConfig } from '@/pages/generic/config/laboratoireConfig';
import { NavigationTrailProvider } from './hooks/useNavigationTrail';
import { WatchlistProvider } from './hooks/useWatchlist';
import { EspaceEtudiant } from './pages/espaceEtudiant';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { experimentationStudentConfig } from './pages/generic/config/experimentationStudentConfig';
import { feedbackStudentConfig } from './pages/generic/config/feedbackStudentConfig';
import { bibliographyConfig } from './pages/generic/config/bibliographyConfig';
import { mediagraphyConfig } from './pages/generic/config/mediagraphyConfig';
import { MonEspace } from './pages/monespace';

import { MonEspace4 } from './pages/monespace4';
import { ListeLecture } from './pages/listeLecture';
import { MotsClesPage } from '@/pages/mots-cles';
import TestOmekaEdit from './pages/test-omeka-edit';
import { StudentManagement } from './pages/admin/StudentManagement';
import { CourseManagement } from './pages/admin/CourseManagement';
import { ActantManagement } from './pages/admin/ActantManagement';
import ResourceManagement from './pages/admin/ResourceManagement';
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Create context for navbar ready callback
interface NavbarReadyContextType {
  onNavbarReady: () => void;
}

const NavbarReadyContext = createContext<NavbarReadyContextType | null>(null);

export const useNavbarReadyContext = () => {
  const context = useContext(NavbarReadyContext);
  return context;
};

const ProtectedStudentManagement = withAuth(StudentManagement, { requiredRole: 'actant' });
const ProtectedCourseManagement = withAuth(CourseManagement, { requiredRole: 'actant' });
const ProtectedActantManagement = withAuth(ActantManagement, { requiredRole: 'actant' });
const ProtectedResourceManagement = withAuth(ResourceManagement, { requiredRole: 'actant' });
const ProtectedAdminDashboard = withAuth(AdminDashboard, { requiredRole: 'actant' });
const ProtectedMotsCles = withAuth(MotsClesPage, { requiredRole: 'actant' });
const ProtectedListeLecture = withAuth(ListeLecture, { requiredRole: 'actant' });

// Wrapper pour protéger ConfigurableDetailPage en mode création (actants et étudiants)
const ProtectedConfigurableDetailPage = withAuth(ConfigurableDetailPage, { requiredRole: 'any' });
//const ProtectedCahierRecherche = withAuth(CahierRecherche, { requiredRole: 'actant' });

function App() {
  useThemeMode();
  const [navbarReady, setNavbarReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Ensure minimum loading time of 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleNavbarReady = useCallback(() => {
    setNavbarReady(true);
  }, []);

  const isLoading = !navbarReady || !minTimeElapsed;

  return (
    <>
      <ToastProvider
        placement='bottom-center'
        toastProps={{
          classNames: {
            closeButton: 'opacity-100 absolute right-4 top-1/2 -translate-y-1/2',
            base: 'relative',
          },
        }}
      />
      <LoadingScreen isLoading={isLoading} />
      <NavbarReadyContext.Provider value={{ onNavbarReady: handleNavbarReady }}>
        <NavigationTrailProvider>
          <WatchlistProvider>
          <Routes>
            {/* Base routes */}
            <Route index path='/' Component={Home} />
            <Route path='/login' Component={LoginPage} />
            <Route path='/intervenants' Component={Intervenants} />
            <Route path='/visualisation' Component={Visualisation} />
            <Route path='/recherche/' Component={CahierRecherche} />
            <Route path='/espace-etudiant' Component={EspaceEtudiant} />
            <Route path='/mon-espace' Component={MonEspace} />

            <Route path='/mon-espace-4' Component={MonEspace4} />
            <Route path='/liste-de-lecture' Component={ProtectedListeLecture} />
            <Route path='/test-omeka-edit' Component={TestOmekaEdit} />

            {/* Admin routes */}
            <Route path='/admin' Component={ProtectedAdminDashboard} />
            <Route path='/admin/etudiants' Component={ProtectedStudentManagement} />
            <Route path='/admin/cours' Component={ProtectedCourseManagement} />
            <Route path='/admin/actants' Component={ProtectedActantManagement} />
            <Route path='/admin/ressources' Component={ProtectedResourceManagement} />

            {/* Temporaire — gestion mots-clés */}
            <Route path='/mots-cles' Component={ProtectedMotsCles} />

            <Route path='/espace-etudiant/experimentation/:id' element={<ConfigurableDetailPage config={experimentationStudentConfig} />} />
            <Route path='/espace-etudiant/outil/:id' Component={ToolDetailPage} />
            <Route path='/espace-etudiant/retour-experience/:id' element={<ConfigurableDetailPage config={feedbackStudentConfig} />} />

            {/* Main corpus routes */}
            <Route path='/corpus/seminaires' Component={Seminaires} />
            <Route path='/corpus/colloques' Component={Colloques} />
            <Route path='/corpus/journees-etudes' Component={JourneesEtudes} />
            <Route path='/corpus/pratiques-narratives' Component={PratiquesNarratives} />
            <Route path='/corpus/experimentations' Component={Experimentations} />
            <Route path='/corpus/mises-en-recits' Component={MisesEnRecits} />

            {/* Recits by Genre Routes */}
            <Route path='/corpus/recits-scientifiques' Component={RecitsByType} />
            <Route path='/corpus/recits-techno-industriels' Component={RecitsByType} />
            <Route path='/corpus/recits-citoyens' Component={RecitsByType} />
            <Route path='/corpus/recits-mediatiques' Component={RecitsByType} />
            <Route path='/corpus/recits-artistiques' Component={RecitsByType} />

            {/* ============================================ */}
            {/* 🆕 NOUVELLE ARCHITECTURE GÉNÉRIQUE - ROUTES PRINCIPALES */}
            {/* ============================================ */}
            {/*
          Toutes les pages de détails utilisent maintenant ConfigurableDetailPage
          avec une configuration spécifique. Cela permet de :
          - Centraliser la logique métier dans les configs
          - Réduire la duplication de code
          - Faciliter la maintenance et l'ajout de nouveaux types

          Pour ajouter un nouveau type :
          1. Créez un fichier config dans @/pages/generic/config/
          2. Importez la config ici
          3. Ajoutez la route avec ConfigurableDetailPage
        */}

            {/* Routes contextuelles pour les conférences (séminaires, colloques, journées d'études) */}
            <Route path='/corpus/seminaires/edition/:id/:title?' Component={Edition} />
            <Route path='/corpus/colloques/edition/:id/:title?' Component={Edition} />
            <Route path='/corpus/journees-etudes/edition/:id/:title?' Component={Edition} />
            <Route path='/corpus/seminaires/conference/:id' element={<ConfigurableDetailPage config={conferenceConfig} />} />
            <Route path='/corpus/colloques/conference/:id' element={<ConfigurableDetailPage config={conferenceConfig} />} />
            <Route path='/corpus/journees-etudes/conference/:id' element={<ConfigurableDetailPage config={conferenceConfig} />} />

            {/* Routes pour les items individuels */}
            <Route path='/corpus/genre/:slug' Component={RecitsByGenre} />
            <Route path='/corpus/experimentation/:id' element={<ConfigurableDetailPage config={experimentationConfig} />} />
            <Route path='/corpus/retour-experience/:id' element={<ConfigurableDetailPage config={feedbackConfig} />} />
            <Route path='/corpus/element-esthetique/:id' element={<ConfigurableDetailPage config={elementEsthetiqueConfig} />} />
            <Route path='/corpus/element-narratif/:id' element={<ConfigurableDetailPage config={elementNarratifConfig} />} />
            <Route path='/corpus/analyse-critique/:id' element={<ConfigurableDetailPage config={analyseCritiqueConfig} />} />
            <Route path='/corpus/outil/:id' Component={ToolDetailPage} />
            <Route path='/corpus/bibliographie/:id' element={<ConfigurableDetailPage config={bibliographyConfig} />} />
            <Route path='/corpus/mediagraphie/:id' element={<ConfigurableDetailPage config={mediagraphyConfig} />} />
            <Route path='/corpus/recit-scientifique/:id' element={<ConfigurableDetailPage config={recitScientifiqueConfig} />} />
            <Route path='/corpus/recit-mediatique/:id' element={<ConfigurableDetailPage config={recitMediatiqueConfig} />} />
            <Route path='/corpus/recit-citoyen/:id' element={<ConfigurableDetailPage config={recitCitoyenConfig} />} />
            <Route path='/corpus/recit-artistique/:id' element={<ConfigurableDetailPage config={recitArtitstiqueConfig} />} />
            <Route path='/corpus/recit-techno-industriel/:id' element={<ConfigurableDetailPage config={recitTechnoConfig} />} />

            {/* Routes pour les personnes/intervenants (toujours utilisées directement) */}
            <Route path='/intervenant/:id' Component={Intervenant} />
            <Route path='/personne/:id' Component={Personne} />

            {/* Routes entités / structures (édition depuis Mon espace) */}
            <Route path='/organisation/:id' element={<ConfigurableDetailPage config={organisationConfig} />} />
            <Route path='/universite/:id' element={<ConfigurableDetailPage config={universiteConfig} />} />
            <Route path='/ecole-doctorale/:id' element={<ConfigurableDetailPage config={ecoleDoctoraleConfig} />} />
            <Route path='/laboratoire/:id' element={<ConfigurableDetailPage config={laboratoireConfig} />} />

            {/* Resource Creation Routes - Utilise ConfigurableDetailPage en mode create */}
            <Route path='/add-resource/experimentation' element={<ProtectedConfigurableDetailPage config={experimentationStudentConfig} initialMode='create' />} />
            <Route path='/add-resource/outil' element={<ProtectedConfigurableDetailPage config={toolStudentConfig} initialMode='create' />} />
            <Route path='/add-resource/retour-experience' element={<ProtectedConfigurableDetailPage config={feedbackStudentConfig} initialMode='create' />} />
            <Route path='/add-resource/experimentation-chercheur' element={<ProtectedConfigurableDetailPage config={experimentationConfig} initialMode='create' />} />
            <Route path='/add-resource/retour-experience-chercheur' element={<ProtectedConfigurableDetailPage config={feedbackConfig} initialMode='create' />} />
            <Route path='/add-resource/outil-chercheur' element={<ProtectedConfigurableDetailPage config={toolConfig} initialMode='create' />} />
            <Route path='/add-resource/conference' element={<ProtectedConfigurableDetailPage config={conferenceConfig} initialMode='create' />} />
            <Route path='/add-resource/bibliographie' element={<ProtectedConfigurableDetailPage config={bibliographyConfig} initialMode='create' />} />
            <Route path='/add-resource/mediagraphie' element={<ProtectedConfigurableDetailPage config={mediagraphyConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-artistique' element={<ProtectedConfigurableDetailPage config={recitArtitstiqueConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-scientifique' element={<ProtectedConfigurableDetailPage config={recitScientifiqueConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-techno' element={<ProtectedConfigurableDetailPage config={recitTechnoConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-citoyen' element={<ProtectedConfigurableDetailPage config={recitCitoyenConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-mediatique' element={<ProtectedConfigurableDetailPage config={recitMediatiqueConfig} initialMode='create' />} />
            <Route path='/add-resource/intervenant' element={<ProtectedConfigurableDetailPage config={intervenantConfig} initialMode='create' />} />
            <Route path='/add-resource/personne' element={<ProtectedConfigurableDetailPage config={personneConfig} initialMode='create' />} />
            <Route path='/add-resource/organisation' element={<ProtectedConfigurableDetailPage config={organisationConfig} initialMode='create' />} />
            <Route path='/add-resource/mot-cle' element={<ProtectedConfigurableDetailPage config={motCleConfig} initialMode='create' />} />
            <Route path='/add-resource/mot-cle/:id' element={<ProtectedConfigurableDetailPage config={motCleConfig} />} />
            <Route path='/add-resource/universite' element={<ProtectedConfigurableDetailPage config={universiteConfig} initialMode='create' />} />
            <Route path='/add-resource/ecole-doctorale' element={<ProtectedConfigurableDetailPage config={ecoleDoctoraleConfig} initialMode='create' />} />
            <Route path='/add-resource/laboratoire' element={<ProtectedConfigurableDetailPage config={laboratoireConfig} initialMode='create' />} />
          </Routes>
          </WatchlistProvider>
        </NavigationTrailProvider>
      </NavbarReadyContext.Provider>
    </>
  );
}

export default App;
