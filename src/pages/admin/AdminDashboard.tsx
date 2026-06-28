import React, { useState, useCallback, useRef } from 'react';
import { Layouts } from '@/components/layout/Layouts';
import { PageBanner } from '@/components/ui/PageBanner';
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
    <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
      <PageBanner
        icon={<UserIcon />}
        title='Utilisateurs'
        description='Gestion des actants, étudiants et cours.'
        backgroundScale={0.60}
      />

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
