import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { UniversityIcon, UserIcon } from '@/components/ui/icons';
import { outlineButtonLayoutClass } from '@/theme/components/button';
import { EditionHostInstitution, EditionOrganizer } from '@/types/ui';

/** Pastilles organisation — même padding/gap que le trigger profil (px-3 py-2 gap-2), sans hauteur figée. */
const ORG_PILL_CLASS = [
  'inline-flex w-max max-w-full shrink-0 items-center rounded-xl border-2 border-c3 bg-c2',
  outlineButtonLayoutClass,
  'min-h-10 justify-start text-sm text-c6',
  'transition-all duration-200 hover:bg-c3',
].join(' ');

const ORG_PILL_MEDIA =
  'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-c3';

const ORG_PILL_LABEL = 'whitespace-nowrap text-sm font-normal leading-snug text-c6';

function institutionLabel(inst: EditionHostInstitution): string {
  return inst.shortTitle || inst.title;
}

/** Affichage header : « Prénom N. » (comme le trigger profil navbar). */
function organizerDisplayName(person: EditionOrganizer): string {
  const first = person.firstname?.trim();
  const last = person.lastname?.trim();
  if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`;
  return first || last || 'Organisateur';
}

function organizerFullName(person: EditionOrganizer): string {
  return [person.firstname, person.lastname].filter(Boolean).join(' ');
}

function InstitutionMedia({ institution }: { institution: EditionHostInstitution }) {
  if (institution.logo) {
    return (
      <img src={institution.logo} alt='' className='max-h-full max-w-full object-contain p-0.5' />
    );
  }
  return <UniversityIcon size={12} className='text-c4' />;
}

function OrganizerMedia({ organizer }: { organizer: EditionOrganizer }) {
  if (organizer.picture) {
    return <img src={organizer.picture} alt='' className='h-full w-full object-cover' />;
  }
  return <UserIcon size={12} className='text-c4' />;
}

function InstitutionPillLink({ institution }: { institution: EditionHostInstitution }) {
  const label = institutionLabel(institution);
  const tooltip = institution.shortTitle ? institution.title : label;

  return (
    <Link to={institution.href} className={ORG_PILL_CLASS} title={tooltip}>
      <div className={ORG_PILL_MEDIA}>
        <InstitutionMedia institution={institution} />
      </div>
      <span className={ORG_PILL_LABEL}>{label}</span>
    </Link>
  );
}

function OrganizerPillLink({ person }: { person: EditionOrganizer }) {
  const display = organizerDisplayName(person);
  const tooltip = [organizerFullName(person), person.affiliations?.join(' · ')].filter(Boolean).join(' · ');

  return (
    <Link to={person.href} className={ORG_PILL_CLASS} title={tooltip}>
      <div className={ORG_PILL_MEDIA}>
        <OrganizerMedia organizer={person} />
      </div>
      <span className={ORG_PILL_LABEL}>{display}</span>
    </Link>
  );
}

const ORG_PILL_ROW_CLASS = 'flex w-full max-w-[27rem] flex-wrap justify-end gap-2';

function organisationPillRowGroups(pills: ReactNode[]): ReactNode[][] {
  if (pills.length === 2) {
    return [pills.slice(0, 1), pills.slice(1, 2)];
  }
  if (pills.length === 3) {
    return [pills.slice(0, 2), pills.slice(2, 3)];
  }
  return [pills];
}

function OrganisationPillRows({ pills }: { pills: ReactNode[] }) {
  const rowGroups = organisationPillRowGroups(pills);

  if (rowGroups.length === 1) {
    return <div className={ORG_PILL_ROW_CLASS}>{rowGroups[0]}</div>;
  }

  return (
    <div className='flex w-full max-w-[27rem] flex-col items-end gap-2'>
      {rowGroups.map((row, index) => (
        <div key={`org-pill-row-${index}`} className={ORG_PILL_ROW_CLASS}>
          {row}
        </div>
      ))}
    </div>
  );
}

const SKELETON_PULSE = 'animate-pulse bg-c3';

/** Largeurs en px — imite des pastilles de libellés différents (univ. / prénoms). */
const ORG_SKELETON_PILL_WIDTHS_PX = [118, 94, 128, 86, 104] as const;

export function EditionOrganisationSkeleton() {
  return (
    <div className='flex w-full max-w-[27rem] flex-col items-end gap-2'>
      <div className={`h-3 w-24 rounded-md ${SKELETON_PULSE}`} />
      <div className='flex w-full flex-col items-end gap-2'>
        <div className='flex flex-wrap justify-end gap-2'>
          {ORG_SKELETON_PILL_WIDTHS_PX.slice(0, 2).map((widthPx, index) => (
            <div
              key={`org-sk-row1-${index}`}
              className={`h-10 shrink-0 rounded-xl ${SKELETON_PULSE}`}
              style={{ width: widthPx }}
            />
          ))}
        </div>
        <div className='flex flex-wrap justify-end gap-2'>
          {ORG_SKELETON_PILL_WIDTHS_PX.slice(2).map((widthPx, index) => (
            <div
              key={`org-sk-row2-${index}`}
              className={`h-10 shrink-0 rounded-xl ${SKELETON_PULSE}`}
              style={{ width: widthPx }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EditionOrganisationBlock({
  institutions,
  organizers,
}: {
  institutions: EditionHostInstitution[];
  organizers: EditionOrganizer[];
}) {
  const pills = [
    ...institutions.map((inst) => <InstitutionPillLink key={`inst-${inst.id}`} institution={inst} />),
    ...organizers.map((person) => <OrganizerPillLink key={`org-${person.id}`} person={person} />),
  ];

  return (
    <div className='flex w-full flex-col gap-2 lg:max-w-[27rem] lg:items-end'>
      <p className='text-xs font-medium uppercase tracking-wider text-c5 lg:text-right'>Organisation</p>
      <OrganisationPillRows pills={pills} />
    </div>
  );
}
