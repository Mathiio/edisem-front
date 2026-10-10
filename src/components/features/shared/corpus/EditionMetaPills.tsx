import { Link } from 'react-router-dom';
import { UniversityIcon, UserIcon } from '@/components/ui/icons';
import {
  EditionOrganisationBlock,
  EditionOrganisationSkeleton,
} from '@/components/features/shared/corpus/editionOrganisationLayouts';
import { EditionHostInstitution, EditionOrganizer } from '@/types/ui';

/** Pastille corpus — même langage visuel que ResourceCard (bordure, fond, avatars rounded-lg). */
const PILL_CLASS =
  'inline-flex items-center gap-2 border-c3 border-2 rounded-2xl bg-c2 px-2.5 py-2 hover:bg-c3 transition-all ease-in-out duration-300 max-w-full';

/** Même cadre visuel pour logo univ. et photo organisateur (aligné ResourceCard). */
const MEDIA_BOX_CLASS =
  'shrink-0 w-7 h-7 rounded-lg overflow-hidden bg-c3 flex items-center justify-center';

const LABEL_CLASS = 'text-sm font-normal text-c4 line-clamp-1';

export function EditionInstitutionPill({ institution }: { institution: EditionHostInstitution }) {
  const label = institution.shortTitle || institution.title;

  return (
    <Link
      to={institution.href}
      className={PILL_CLASS}
      title={institution.title}
    >
      <div className={MEDIA_BOX_CLASS}>
        {institution.logo ? (
          <img
            src={institution.logo}
            alt=''
            className='max-h-full max-w-full object-contain p-0.5'
          />
        ) : (
          <UniversityIcon size={12} className='text-c4' />
        )}
      </div>
      <span className={LABEL_CLASS}>{label}</span>
    </Link>
  );
}

export function EditionOrganizerPill({ organizer }: { organizer: EditionOrganizer }) {
  const fullName = [organizer.firstname, organizer.lastname].filter(Boolean).join(' ');

  return (
    <Link to={organizer.href} className={PILL_CLASS} title={fullName}>
      <div className={MEDIA_BOX_CLASS}>
        {organizer.picture ? (
          <img src={organizer.picture} alt='' className='w-full h-full object-cover' />
        ) : (
          <UserIcon size={12} className='text-c4' />
        )}
      </div>
      <span className={`${LABEL_CLASS} whitespace-nowrap`}>
        <span>{organizer.firstname}</span>
        {organizer.lastname ? <span className='ml-1'>{organizer.lastname}</span> : null}
      </span>
    </Link>
  );
}

export function EditionPageHeaderSkeleton() {
  return (
    <div className='relative z-[12] flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10'>
      <div className='flex min-w-0 flex-1 flex-col gap-3'>
        <div className='h-4 w-56 max-w-[70%] animate-pulse rounded-md bg-c3' />
        <div className='h-11 w-full max-w-2xl animate-pulse rounded-xl bg-c3' />
        <div className='h-11 w-[88%] max-w-xl animate-pulse rounded-xl bg-c3' />
      </div>
      <aside className='w-full shrink-0 lg:w-[27rem] lg:max-w-[27rem] lg:pt-1'>
        <EditionOrganisationSkeleton />
      </aside>
    </div>
  );
}

export function EditionPageHeader({
  subtitle,
  title,
  institutions,
  organizers,
}: {
  subtitle?: string;
  title?: string;
  institutions: EditionHostInstitution[];
  organizers: EditionOrganizer[];
}) {
  const hasMeta = institutions.length + organizers.length > 0;

  return (
    <div className='relative z-[12] flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10'>
      <div className='flex min-w-0 flex-1 flex-col gap-2 text-left lg:max-w-[min(100%,52rem)]'>
        {subtitle ? <p className='text-sm text-c5 md:text-base'>{subtitle}</p> : null}
        {title ? (
          <h1 className='text-4xl font-medium leading-[1.08] text-c6 md:text-5xl lg:text-[3.25rem] lg:leading-[1.06]'>{title}</h1>
        ) : null}
      </div>

      {hasMeta ? (
        <aside className='w-full shrink-0 lg:w-[27rem] lg:max-w-[27rem] lg:pt-1'>
          <EditionOrganisationBlock institutions={institutions} organizers={organizers} />
        </aside>
      ) : null}
    </div>
  );
}

/** @deprecated Préférer EditionPageHeader sur la page édition. */
export function EditionMetaPills({
  institutions,
  organizers,
}: {
  institutions: EditionHostInstitution[];
  organizers: EditionOrganizer[];
}) {
  if (institutions.length === 0 && organizers.length === 0) return null;

  return (
    <div className='z-[12] flex w-full flex-col items-center gap-3'>
      {organizers.length > 0 && (
        <div className='flex flex-wrap items-center justify-center gap-2'>
          {organizers.map((person) => (
            <EditionOrganizerPill key={`org-${person.id}`} organizer={person} />
          ))}
        </div>
      )}
      {institutions.length > 0 && (
        <div className='flex flex-wrap items-center justify-center gap-2'>
          {institutions.map((inst) => (
            <EditionInstitutionPill key={`inst-${inst.id}`} institution={inst} />
          ))}
        </div>
      )}
    </div>
  );
}
