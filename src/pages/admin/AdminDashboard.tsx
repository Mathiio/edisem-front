import React, { useState, useCallback, useRef } from 'react';
import { Layouts } from '@/components/layout/Layouts';
import { UserIcon } from '@/components/ui/icons';
import { StudentManagement } from './StudentManagement';
import { CourseManagement } from './CourseManagement';
import { ActantManagement } from './ActantManagement';

export const AdminDashboard: React.FC = () => {
  const [highlightCourseId, setHighlightCourseId] = useState<number | null>(null);
  const coursesSectionRef = useRef<HTMLElement>(null);

  const scrollToCoursesSection = useCallback(() => {
    coursesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const navigateToCourse = useCallback(
    (courseId: number) => {
      scrollToCoursesSection();
      setHighlightCourseId(null);
      setTimeout(() => {
        setHighlightCourseId(courseId);
        setTimeout(() => setHighlightCourseId(null), 3500);
      }, 400);
    },
    [scrollToCoursesSection],
  );

  return (
    <Layouts className='flex flex-col col-span-10 gap-12 z-0 overflow-visible pt-16'>
      <div className='flex items-center gap-3'>
        <UserIcon size={28} className='text-c5 shrink-0' />
        <div className='flex flex-col'>
          <h1 className='text-3xl text-c6 font-semibold'>Utilisateurs</h1>
          <p className='text-c4 text-sm'>Gestion des actants, étudiants et cours.</p>
        </div>
      </div>

      <section className='flex flex-col gap-4'>
        <ActantManagement embedded />
      </section>

      <section className='flex flex-col gap-4'>
        <StudentManagement
          embedded
          onNavigateToCourse={navigateToCourse}
          onNavigateToCoursesSection={scrollToCoursesSection}
        />
      </section>

      <section ref={coursesSectionRef} id='section-cours' className='flex flex-col gap-4 scroll-mt-24'>
        <CourseManagement embedded highlightCourseId={highlightCourseId} />
      </section>
    </Layouts>
  );
};

export default AdminDashboard;
