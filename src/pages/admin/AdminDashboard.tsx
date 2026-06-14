import React, { useState, useCallback } from 'react';
import { Tabs, Tab } from '@heroui/react';
import { Layouts } from '@/components/layout/Layouts';
import { UserIcon, SchoolIcon, EditIcon, ExperimentationIcon } from '@/components/ui/icons';
import { StudentManagement } from './StudentManagement';
import { CourseManagement } from './CourseManagement';
import { ActantManagement } from './ActantManagement';
import ResourceManagement from './ResourceManagement';

type TabKey = 'etudiants' | 'cours' | 'actants' | 'ressources';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('etudiants');
  const [highlightCourseId, setHighlightCourseId] = useState<number | null>(null);

  // Fonction pour naviguer vers un cours avec highlight
  const navigateToCourse = useCallback((courseId: number) => {
    // Reset puis set pour déclencher le useEffect même si c'est le même cours
    setHighlightCourseId(null);
    setActiveTab('cours');
    setTimeout(() => {
      setHighlightCourseId(courseId);
      // Reset après 3.5 secondes (après la fin de l'animation)
      setTimeout(() => {
        setHighlightCourseId(null);
      }, 3500);
    }, 50);
  }, []);

  return (
    <Layouts className='flex flex-col col-span-10 gap-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-medium text-c6'>Administration</h1>
      </div>

      {/* Tabs de navigation */}
      <Tabs
        aria-label='Navigation admin'
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as TabKey)}
        classNames={{
          tabList: 'bg-c2 rounded-xl border-2 border-c3 p-2',
          cursor: 'w-full shadow-lg rounded-lg bg-c3',
          tab: 'p-4 text-c4 data-[selected=true]:text-selected font-medium transition-all',
          tabContent: 'group-data-[selected=true]:font-medium flex items-center justify-center gap-2',
        }}>
        <Tab
          key='etudiants'
          className='py-0'
          title={
            <div className='flex items-center gap-2'>
              <UserIcon size={18} />
              <span>Étudiants</span>
            </div>
          }
        />
        <Tab
          key='cours'
          className='py-0'
          title={
            <div className='flex items-center gap-2'>
              <SchoolIcon size={18} />
              <span>Cours</span>
            </div>
          }
        />
        <Tab
          key='actants'
          className='py-0'
          title={
            <div className='flex items-center gap-2'>
              <EditIcon size={18} />
              <span>Actants</span>
            </div>
          }
        />
        <Tab
          key='ressources'
          className='py-0'
          title={
            <div className='flex items-center gap-2'>
              <ExperimentationIcon size={18} />
              <span>Ressources</span>
            </div>
          }
        />
      </Tabs>

      {/* Contenu */}
      <div>
        {activeTab === 'etudiants' && <StudentManagement embedded onNavigateToCourse={navigateToCourse} />}
        {activeTab === 'cours' && <CourseManagement embedded highlightCourseId={highlightCourseId} />}
        {activeTab === 'actants' && <ActantManagement embedded />}
        {activeTab === 'ressources' && <ResourceManagement embedded onNavigateToCourse={navigateToCourse} />}
      </div>
    </Layouts>
  );
};

export default AdminDashboard;
