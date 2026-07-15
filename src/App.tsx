import { useThemeMode } from '@/hooks/useThemeMode';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Intervenant } from '@/pages/people/IntervenantPage';
import { HomePage } from '@/pages/HomePage';
import { Edition } from '@/pages/corpus/ConfsByEdition';
import { LoginPage } from '@/pages/auth/LoginPage';
import { CahierRecherchePage } from '@/pages/research/CahierRecherchePage';
import { withAuth } from '@/hooks/withAuth';
import Visualisation from '@/pages/visualisation';
import { AppToastProvider } from '@/theme/components';
import { Intervenants } from '@/pages/people/IntervenantsPage';
import { Colloques } from '@/pages/corpus/Colloques';
import { PratiquesNarratives } from '@/pages/corpus/PratiquesNarratives';
import { JourneesEtudes } from '@/pages/corpus/JourneesEtudes';
import { Seminaires } from '@/pages/corpus/Seminaires';
import { Experimentations } from '@/pages/corpus/Experimentations';
import { MisesEnRecitsPage } from '@/pages/corpus/MisesEnRecitsPage';
import { toolConfig, toolStudentConfig } from '@/pages/generic/config/toolConfig';
import { ToolDetailPage } from '@/pages/generic/ToolDetailPage';
import { RecitsByGenre } from '@/pages/corpus/RecitsByGenrePage';
import { RecitsByType } from '@/pages/corpus/RecitsByTypePage';
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
import { EspaceEtudiantPage } from '@/pages/user-space/EspaceEtudiantPage';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { experimentationStudentConfig } from './pages/generic/config/experimentationStudentConfig';
import { feedbackStudentConfig } from './pages/generic/config/feedbackStudentConfig';
import { bibliographyConfig } from './pages/generic/config/bibliographyConfig';
import { mediagraphyConfig } from './pages/generic/config/mediagraphyConfig';
import { StudentMySpace } from '@/pages/user-space/StudentMySpace';
import { ActantMySpace } from '@/pages/user-space/ActantMySpace';
import { WatchlistPage } from '@/pages/user-space/WatchlistPage';
import { MotsClesPage } from '@/pages/admin/MotsClesPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import GlobalAdministration from '@/pages/admin/GlobalAdministration';
import { CreateResourcePage } from '@/pages/generic/CreateResourcePage';

// Create context for navbar ready callback
interface NavbarReadyContextType {
  onNavbarReady: () => void;
}

const NavbarReadyContext = createContext<NavbarReadyContextType | null>(null);

export const useNavbarReadyContext = () => {
  const context = useContext(NavbarReadyContext);
  return context;
};

const ProtectedUsersPage = withAuth(AdminDashboard, { requiredPermission: 'admin' });
const ProtectedAdministration = withAuth(GlobalAdministration, { requiredOmekaRole: 'global_admin' });
const ProtectedMotsCles = withAuth(MotsClesPage, { requiredPermission: 'admin' });
const ProtectedWatchlistPage = withAuth(WatchlistPage, { requiredRole: 'actant' });

// Wrapper pour protéger ConfigurableDetailPage en mode création (actants et étudiants)
const ProtectedAdminConfigurableDetailPage = withAuth(ConfigurableDetailPage, { requiredPermission: 'admin' });
const ProtectedCreateResourcePage = withAuth(CreateResourcePage, { requiredRole: 'any' });
const ProtectedAdminCreateResourcePage = withAuth(CreateResourcePage, { requiredPermission: 'admin' });
//const ProtectedCahierRecherche = withAuth(CahierRecherchePage, { requiredRole: 'actant' });

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
      <AppToastProvider />
      <LoadingScreen isLoading={isLoading} />
      <NavbarReadyContext.Provider value={{ onNavbarReady: handleNavbarReady }}>
        <NavigationTrailProvider>
          <WatchlistProvider>
          <Routes>
            {/* Base routes */}
            <Route index path='/' Component={HomePage} />
            <Route path='/login' Component={LoginPage} />
            <Route path='/intervenants' Component={Intervenants} />
            <Route path='/visualisation' Component={Visualisation} />
            <Route path='/recherche/' Component={CahierRecherchePage} />
            <Route path='/espace-etudiant' Component={EspaceEtudiantPage} />
            <Route path='/mon-espace' Component={StudentMySpace} />

            <Route path='/mon-espace-4' Component={ActantMySpace} />
            <Route path='/liste-de-lecture' Component={ProtectedWatchlistPage} />

            {/* Utilisateurs (actants, étudiants, cours) */}
            <Route path='/users' Component={ProtectedUsersPage} />
            <Route path='/admin' element={<Navigate to='/users' replace />} />
            <Route path='/admin/*' element={<Navigate to='/users' replace />} />
            <Route path='/administration' Component={ProtectedAdministration} />

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
            <Route path='/corpus/mises-en-recits' Component={MisesEnRecitsPage} />

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

            {/* Routes pour les personnes/intervenants */}
            <Route path='/intervenant/:id' Component={Intervenant} />
            <Route path='/personne/:id' element={<ConfigurableDetailPage config={personneConfig} />} />

            {/* Routes entités / structures (édition depuis Mon espace) */}
            <Route path='/organisation/:id' element={<ConfigurableDetailPage config={organisationConfig} />} />
            <Route path='/universite/:id' element={<ConfigurableDetailPage config={universiteConfig} />} />
            <Route path='/ecole-doctorale/:id' element={<ConfigurableDetailPage config={ecoleDoctoraleConfig} />} />
            <Route path='/laboratoire/:id' element={<ConfigurableDetailPage config={laboratoireConfig} />} />

            {/* Resource Creation Routes — draft-first : la ressource est créée immédiatement dans Omeka S,
                puis redirigée vers le mode édition avec ?draft=1. "Annuler" = supprimer le brouillon. */}
            <Route path='/add-resource/experimentation' element={<ProtectedCreateResourcePage config={experimentationStudentConfig} />} />
            <Route path='/add-resource/outil' element={<ProtectedCreateResourcePage config={toolStudentConfig} />} />
            <Route path='/add-resource/retour-experience' element={<ProtectedCreateResourcePage config={feedbackStudentConfig} />} />
            <Route path='/add-resource/experimentation-chercheur' element={<ProtectedCreateResourcePage config={experimentationConfig} />} />
            <Route path='/add-resource/retour-experience-chercheur' element={<ProtectedCreateResourcePage config={feedbackConfig} />} />
            <Route path='/add-resource/outil-chercheur' element={<ProtectedCreateResourcePage config={toolConfig} />} />
            <Route path='/add-resource/conference' element={<ProtectedCreateResourcePage config={conferenceConfig} />} />
            <Route path='/add-resource/bibliographie' element={<ProtectedCreateResourcePage config={bibliographyConfig} />} />
            <Route path='/add-resource/mediagraphie' element={<ProtectedCreateResourcePage config={mediagraphyConfig} />} />
            <Route path='/add-resource/recit-artistique' element={<ProtectedCreateResourcePage config={recitArtitstiqueConfig} />} />
            <Route path='/add-resource/recit-scientifique' element={<ProtectedCreateResourcePage config={recitScientifiqueConfig} />} />
            <Route path='/add-resource/recit-techno' element={<ProtectedCreateResourcePage config={recitTechnoConfig} />} />
            <Route path='/add-resource/recit-citoyen' element={<ProtectedCreateResourcePage config={recitCitoyenConfig} />} />
            <Route path='/add-resource/recit-mediatique' element={<ProtectedCreateResourcePage config={recitMediatiqueConfig} />} />
            <Route path='/add-resource/intervenant' element={<ProtectedCreateResourcePage config={intervenantConfig} />} />
            <Route path='/add-resource/personne' element={<ProtectedCreateResourcePage config={personneConfig} />} />
            <Route path='/add-resource/organisation' element={<ProtectedCreateResourcePage config={organisationConfig} />} />
            <Route path='/add-resource/mot-cle' element={<ProtectedAdminCreateResourcePage config={motCleConfig} />} />
            <Route path='/add-resource/mot-cle/:id' element={<ProtectedAdminConfigurableDetailPage config={motCleConfig} />} />
            <Route path='/add-resource/universite' element={<ProtectedCreateResourcePage config={universiteConfig} />} />
            <Route path='/add-resource/ecole-doctorale' element={<ProtectedCreateResourcePage config={ecoleDoctoraleConfig} />} />
            <Route path='/add-resource/laboratoire' element={<ProtectedCreateResourcePage config={laboratoireConfig} />} />
          </Routes>
          </WatchlistProvider>
        </NavigationTrailProvider>
      </NavbarReadyContext.Provider>
    </>
  );
}

export default App;
