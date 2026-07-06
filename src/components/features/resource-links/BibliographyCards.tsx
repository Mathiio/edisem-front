import React from 'react';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Bibliography } from '@/types/ui';
import { getFormOnlyExternalUrl, isHttpUrl } from '@/lib/resourceUtils';
import { LinkedResourceCard, LINKED_RESOURCE_LIST_CLASS } from '@/components/features/resource-links/LinkedResourceCard';

const hasContent = (value: string | string[] | { first_name: string; last_name: string }[] | undefined | null): boolean => {
  // Si value est un tableau d'objets créateurs (avec first_name et last_name)
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'first_name' in value[0] && 'last_name' in value[0]) {
    return value.some(
      (creator) => typeof creator === 'object' && (creator.first_name.trim() !== '' || creator.last_name.trim() !== ''), // Vérifie que l'un des deux est non vide
    );
  }

  // Si value est un tableau de chaînes de caractères
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'string' && item.trim() !== '');
  }

  // Si value est une chaîne de caractères
  return typeof value === 'string' && value.trim() !== '';
};

const formatAuthors = (creators: { first_name: string; last_name: string }[]) => {
  const formattedAuthors = creators
    .filter((creator) => creator.last_name) // Filtrer les créateurs avec un nom de famille non vide
    .map((creator) => {
      const lastName = creator.last_name;
      const firstInitial = creator.first_name ? `${creator.first_name[0]}.` : ''; // Utilise l'initiale s'il y a un prénom
      return firstInitial ? `${lastName}, ${firstInitial}` : lastName; // Si pas de prénom, affiche seulement le nom
    });

  return formattedAuthors.join(', ');
};

// Modèles de formatage
const bibliographyTemplates: { [key: number]: (item: Bibliography) => React.ReactNode } = {
  40: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <i>{item.title}. </i>}
      {hasContent(item.publisher) && <span>{item.publisher}. </span>}
    </>
  ),
  41: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <span>{item.title}. </span>}

      {hasContent(item.editor) && (
        <span>
          Dans {item.editor} <i>(dir.)</i>,
        </span>
      )}

      {hasContent(item.ispartof) && <span> {item.ispartof}</span>}
      {hasContent(item.pages) && <span>, ({item.pages})</span>}

      {hasContent(item.publisher) && <span>. {item.publisher}</span>}
    </>
  ),
  81: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <span>{item.title}. </span>}
      {hasContent(item.editor) && <span>Dans {item.editor} (dir.), </span>}
      {hasContent(item.source) && <i>{item.source} </i>}
      {hasContent(item.pages) && <span>({item.pages}). </span>}
      {hasContent(item.publisher) && <span>{item.publisher}. </span>}
    </>
  ),

  88: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <i>{item.title}</i>}
      {(hasContent(item.publisher) || hasContent(item.type)) && (
        <span>
          &nbsp;[{item.type && `${item.type}`}
          {item.type && item.publisher && ', '}
          {item.publisher && `${item.publisher}`}].
        </span>
      )}
    </>
  ),

  90: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <i>{item.title}</i>}
      {(hasContent(item.publisher) || hasContent(item.type)) && (
        <span>
          &nbsp;[{item.type && `${item.type}`}
          {item.type && item.publisher && ', '}
          {item.publisher && `${item.publisher}`}].
        </span>
      )}
    </>
  ),

  49: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <i>{item.title}</i>}
      {hasContent(item.publisher) && <span>. {item.publisher}</span>}
    </>
  ),
  36: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <i>{item.title}</i>}
      {hasContent(item.publisher) && <span>{item.publisher}. </span>}
    </>
  ),
  35: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <span>{item.title}.</span>}
      {hasContent(item.publisher) && <i>&nbsp; {item.publisher} &nbsp;</i>}
      {hasContent(item.volume) && (
        <span>
          {' '}
          <i>{item.volume}</i>{' '}
        </span>
      )}
      {hasContent(item.issue) && <i>({item.issue}),</i>}
      {hasContent(item.pages) && <span>{item.pages}.</span>}
    </>
  ),
  82: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <i>{item.title}</i>}
      {hasContent(item.number) && <span>{item.number}. </span>}
      {hasContent(item.issue) && <span>({item.issue}). </span>}
      {hasContent(item.publisher) && <span>{item.publisher}. </span>}
    </>
  ),
  47: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <i>{item.title}</i>}
      {hasContent(item.publisher) && <span>{item.publisher}. </span>}
    </>
  ),
  83: (item) => <>{hasContent(item.title) && <span>{item.title}. </span>}</>,
  66: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <span>{item.title}. </span>}
      {hasContent(item.type) && <span> {item.type} </span>}
      {hasContent(item.source) && <i>{item.source}, </i>}
    </>
  ),
  54: (item) => (
    <>
      {hasContent(item.creator) && <span>{formatAuthors(item.creator)} </span>}
      {hasContent(item.date) && <span>({item.date}). </span>}
      {hasContent(item.title) && <span>{item.title}. </span>}
      {hasContent(item.editor) && <span>Dans {item.editor} (dir.), </span>}
      {hasContent(item.source) && <i>{item.source}, </i>}
    </>
  ),
};

// Composant BibliographyCard optimisé
export const BibliographyCard: React.FC<Bibliography & { uniqueKey?: number; onEdit?: (id: number) => void }> = (props) => {
  const { thumbnail, url, onEdit } = props;
  const resolvedId = props.id || (props as any)['o:id'] || (props as any)['value_resource_id'];
  const externalUrl = getFormOnlyExternalUrl(props) || (isHttpUrl(url) ? url : null);

  const formatBibliography = (item: Bibliography) => {
    const template = bibliographyTemplates[item.class];
    return template ? template(item) : item.title || 'Référence non formatée';
  };

  const isLocked = !onEdit && !externalUrl;

  return (
    <LinkedResourceCard
      thumbnail={thumbnail}
      isLocked={isLocked}
      href={!onEdit && externalUrl ? externalUrl : undefined}
      external={Boolean(externalUrl)}
      onClick={
        onEdit
          ? () => {
              if (resolvedId) onEdit(resolvedId);
            }
          : undefined
      }>
      <p className='text-c6 text-base font-normal'>{formatBibliography(props)}</p>
    </LinkedResourceCard>
  );
};

interface BibliographySection {
  title: string;
  bibliographies: Bibliography[];
}

interface BibliographiesProps {
  // Nouveau système : sections avec titres
  sections?: BibliographySection[];
  // Système legacy : un seul tableau avec filtrage par resource_template_id
  bibliographies?: Bibliography[];
  type?: 'scientific' | 'cultural';
  notitle?: boolean;
  onEdit?: (id: number) => void;
  // Configuration pour le système legacy
  legacyConfig?: {
    normalTitle: string;
    complementaryTitle: string;
    complementaryTemplateId: string;
  };
}

export const Bibliographies: React.FC<BibliographiesProps> = ({ sections = [], bibliographies = [], legacyConfig, notitle = false, onEdit }) => {
  // Déterminer quelle méthode utiliser
  const useLegacyMode = bibliographies.length > 0 && !sections.length;

  let finalSections: BibliographySection[] = [];
  let totalBibliographies = 0;

  if (useLegacyMode && legacyConfig) {
    // Mode legacy : filtrer par resource_template_id
    const normalBibliographies = bibliographies.filter((biblio) => biblio.resource_template_id !== legacyConfig.complementaryTemplateId);
    const complementaryBibliographies = bibliographies.filter((biblio) => biblio.resource_template_id === legacyConfig.complementaryTemplateId);

    finalSections = [
      { title: legacyConfig.normalTitle, bibliographies: normalBibliographies },
      { title: legacyConfig.complementaryTitle, bibliographies: complementaryBibliographies },
    ].filter((section) => section.bibliographies.length > 0);

    totalBibliographies = bibliographies.length;
  } else {
    // Mode nouveau : utiliser les sections fournies
    finalSections = sections;
    totalBibliographies = sections.reduce((total, section) => total + section.bibliographies.length, 0);
  }

  return (
    <div className='w-full flex flex-col gap-5'>
      <div className='flex flex-col gap-5'>
        {finalSections.map(
          (section, sectionIndex) =>
            section.bibliographies.length > 0 && (
              <div key={sectionIndex}>
                {!notitle && <h2 className='text-base text-c5 font-medium'>{section.title}</h2>}
                <div className={LINKED_RESOURCE_LIST_CLASS}>
                  {section.bibliographies.map((bibliography, index) => (
                    <BibliographyCard key={`${sectionIndex}-${index}`} {...bibliography} uniqueKey={index} onEdit={onEdit} />
                  ))}
                </div>
              </div>
            ),
        )}

        {totalBibliographies === 0 && (
          <EmptyStateCard message="Aucune bibliographie n'est liée à cette conférence." />
        )}
      </div>
    </div>
  );
};

