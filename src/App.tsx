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
import { toolConfig } from '@/pages/generic/config/toolConfigV2';
import { RecitsByGenre } from '@/pages/corpus/recitsByGenre';
import { RecitsByType } from '@/pages/corpus/recitsByType';
import { ConfigurableDetailPage } from '@/pages/generic/ConfigurableDetailPage';
import { conferenceConfigV2 as conferenceConfig } from '@/pages/generic/config/conferenceConfigV2';
import { experimentationConfig } from '@/pages/generic/config/experimentationConfig';
import { recitArtitstiqueConfig } from '@/pages/generic/config/recitArtitstiqueConfigV2';
import { elementEsthetiqueConfig } from '@/pages/generic/config/elementEsthetiqueConfig';
import { elementNarratifConfig } from '@/pages/generic/config/elementNarratifConfig';
import { feedbackConfig } from '@/pages/generic/config/feedbackConfig';
import { analyseCritiqueConfig } from '@/pages/generic/config/analyseCritiqueConfigV2';
import { recitTechnoConfig } from '@/pages/generic/config/recitTechnoConfigV2';
import { recitScientifiqueConfig } from '@/pages/generic/config/recitScientifiqueConfigV2';
import { recitMediatiqueConfig } from '@/pages/generic/config/recitmediatiqueConfigV2';
import { recitCitoyenConfig } from '@/pages/generic/config/recitcitoyenConfigV2';
import { NavigationTrailProvider } from './hooks/useNavigationTrail';
import { EspaceEtudiant } from './pages/espaceEtudiant';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { experimentationStudentConfig } from './pages/generic/config/experimentationStudentConfig';
import { toolStudentConfig } from './pages/generic/config/toolStudentConfig';
import { feedbackStudentConfig } from './pages/generic/config/feedbackStudentConfig';
import { bibliographyStudentConfig } from './pages/generic/config/bibliographyStudentConfig';
import { MonEspace } from './pages/monespace';

import { MonEspace3 } from './pages/monespace3';
import { CreerPage } from '@/pages/creer';
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
          <Routes>
            {/* Base routes */}
            <Route index path='/' Component={Home} />
            <Route path='/login' Component={LoginPage} />
            <Route path='/creer' Component={CreerPage} />
            <Route path='/intervenants' Component={Intervenants} />
            <Route path='/visualisation' Component={Visualisation} />
            <Route path='/recherche/' Component={CahierRecherche} />
            <Route path='/espace-etudiant' Component={EspaceEtudiant} />
            <Route path='/mon-espace' Component={MonEspace} />

            <Route path='/mon-espace-3' Component={MonEspace3} />
            <Route path='/test-omeka-edit' Component={TestOmekaEdit} />

            {/* Admin routes */}
            <Route path='/admin' Component={ProtectedAdminDashboard} />
            <Route path='/admin/etudiants' Component={ProtectedStudentManagement} />
            <Route path='/admin/cours' Component={ProtectedCourseManagement} />
            <Route path='/admin/actants' Component={ProtectedActantManagement} />
            <Route path='/admin/ressources' Component={ProtectedResourceManagement} />

            <Route path='/espace-etudiant/experimentation/:id' element={<ConfigurableDetailPage config={experimentationStudentConfig} />} />
            <Route path='/espace-etudiant/outil/:id' element={<ConfigurableDetailPage config={toolStudentConfig} />} />
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
            <Route path='/corpus/outil/:id' element={<ConfigurableDetailPage config={toolConfig} />} />
            <Route path='/corpus/recit-scientifique/:id' element={<ConfigurableDetailPage config={recitScientifiqueConfig} />} />
            <Route path='/corpus/recit-mediatique/:id' element={<ConfigurableDetailPage config={recitMediatiqueConfig} />} />
            <Route path='/corpus/recit-citoyen/:id' element={<ConfigurableDetailPage config={recitCitoyenConfig} />} />
            <Route path='/corpus/recit-artistique/:id' element={<ConfigurableDetailPage config={recitArtitstiqueConfig} />} />
            <Route path='/corpus/recit-techno-industriel/:id' element={<ConfigurableDetailPage config={recitTechnoConfig} />} />

            {/* Routes pour les personnes/intervenants (toujours utilisées directement) */}
            <Route path='/intervenant/:id' Component={Intervenant} />
            <Route path='/personne/:id' Component={Personne} />

            {/* Resource Creation Routes - Utilise ConfigurableDetailPage en mode create */}
            <Route path='/add-resource/experimentation' element={<ProtectedConfigurableDetailPage config={experimentationStudentConfig} initialMode='create' />} />
            <Route path='/add-resource/outil' element={<ProtectedConfigurableDetailPage config={toolStudentConfig} initialMode='create' />} />
            <Route path='/add-resource/retour-experience' element={<ProtectedConfigurableDetailPage config={feedbackStudentConfig} initialMode='create' />} />
            <Route path='/add-resource/experimentation-chercheur' element={<ProtectedConfigurableDetailPage config={experimentationConfig} initialMode='create' />} />
            <Route path='/add-resource/retour-experience-chercheur' element={<ProtectedConfigurableDetailPage config={feedbackConfig} initialMode='create' />} />
            <Route path='/add-resource/outil-chercheur' element={<ProtectedConfigurableDetailPage config={toolConfig} initialMode='create' />} />
            <Route path='/add-resource/conference' element={<ProtectedConfigurableDetailPage config={conferenceConfig} initialMode='create' />} />
            <Route path='/add-resource/analyse-critique' element={<ProtectedConfigurableDetailPage config={analyseCritiqueConfig} initialMode='create' />} />
            <Route path='/add-resource/element-esthetique' element={<ProtectedConfigurableDetailPage config={elementEsthetiqueConfig} initialMode='create' />} />
            <Route path='/add-resource/element-narratif' element={<ProtectedConfigurableDetailPage config={elementNarratifConfig} initialMode='create' />} />
            <Route path='/add-resource/bibliographie' element={<ProtectedConfigurableDetailPage config={bibliographyStudentConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-artistique' element={<ProtectedConfigurableDetailPage config={recitArtitstiqueConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-scientifique' element={<ProtectedConfigurableDetailPage config={recitScientifiqueConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-techno' element={<ProtectedConfigurableDetailPage config={recitTechnoConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-citoyen' element={<ProtectedConfigurableDetailPage config={recitCitoyenConfig} initialMode='create' />} />
            <Route path='/add-resource/recit-mediatique' element={<ProtectedConfigurableDetailPage config={recitMediatiqueConfig} initialMode='create' />} />
          </Routes>
        </NavigationTrailProvider>
      </NavbarReadyContext.Provider>
    </>
  );
}

export default App;
