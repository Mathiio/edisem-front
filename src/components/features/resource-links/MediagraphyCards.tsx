import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { getFormOnlyExternalUrl, isHttpUrl } from '@/lib/resourceUtils';
import { Mediagraphy } from '@/types/ui';
import { LinkedResourceCard, LINKED_RESOURCE_LIST_CLASS } from '@/components/features/resource-links/LinkedResourceCard';

const formatAuthors = (creators: { first_name: string; last_name: string }[] = []) => {
  if (!Array.isArray(creators)) {
    console.error("creators n'est pas un tableau");
    return '';
  }

  return creators
    .filter((creator) => creator.last_name) // Filtrer les créateurs avec un nom de famille non vide
    .map((creator) => {
      const lastName = creator.last_name;
      const firstInitial = creator.first_name ? `${creator.first_name[0]}.` : ''; // Prend la première lettre s'il y a un prénom
      return `${lastName}, ${firstInitial}`;
    })
    .join(', ');
};

const formatDirector = (director: { first_name: string; last_name: string }[] = []) => {
  if (!Array.isArray(director)) {
    console.error("creators n'est pas un tableau");
    return '';
  }

  return director
    .filter((director) => director.last_name) // Filtrer les créateurs avec un nom de famille non vide
    .map((director) => {
      const lastName = director.last_name;
      const firstInitial = director.first_name ? `${director.first_name[0]}.` : ''; // Prend la première lettre s'il y a un prénom
      return `${lastName}, ${firstInitial}`;
    })
    .join(', ');
};

const mediagraphyTemplates: { [key: string]: (item: Mediagraphy) => React.ReactNode } = {
  '58': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <i>{item.title}. </i>}
      {item.medium && <span> [{item.medium}] </span>}
      {item.format && <span> [{item.format}] </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '85': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title}. </span>}
      {item.medium && <span> [{item.medium}] </span>}
      {item.publisher && <i>{item.publisher}</i>}
    </>
  ),
  '29': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title} </span>}
      {item.isPartOf && <span>({item.isPartOf}) </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '38': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title}. </span>}
      {item.medium && <span> [{item.medium}] </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '977': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title}. </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '56': (item) => (
    <>
      {item.creator && item.creator.length > 0 ? (
        <span>{formatAuthors(item.creator)} </span>
      ) : (
        item.director && item.director.length > 0 && <span>{formatDirector(item.director)} </span>
      )}

      {item.date && <span>({item.date}). </span>}
      {item.title && <i>{item.title}. </i>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),

  '37': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <i>{item.title} </i>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '45': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title} </span>}
      {item.isPartOf && <span> (part of: {item.isPartOf}) </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '46': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title} </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '59': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title} </span>}
      {item.isPartOf && <span> (part of: {item.isPartOf}) </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '32': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title}. </span>}
      {item.medium && <span> [{item.medium}] </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '90': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <i>{item.title}. </i>}
      {item.medium && <span> [{item.medium}] </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '91': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title}. </span>}
      {item.medium && <span> [{item.medium}] </span>}
      {item.publisher && <span>{item.publisher}</span>}
    </>
  ),
  '434': (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <i>{item.title}. </i>}
      {item.medium && <span> [{item.medium}]. </span>}
      {item.location && <span> {item.location}, </span>}
      {item.place && <span> {item.place}</span>}
    </>
  ),
  default: (item) => (
    <>
      {item.creator && item.creator.length > 0 && <span>{formatAuthors(item.creator)} </span>}
      {item.director && item.creator.length > 0 && <span>{formatDirector(item.director)} </span>}
      {item.date && <span>({item.date}). </span>}
      {item.title && <span>{item.title}. </span>}
      {item.medium && <span> [{item.medium}] </span>}
      {item.publisher && <span>{item.publisher} </span>}
      {item.isPartOf && <span> (part of: {item.isPartOf})</span>}
    </>
  ),
};

const ensureEndsWithPeriod = (content: React.ReactNode): React.ReactNode => {
  if (React.isValidElement(content)) {
    // Convertir l'élément React en chaîne HTML
    const htmlString = ReactDOMServer.renderToStaticMarkup(content);

    // Utiliser une expression régulière pour extraire uniquement le texte
    const textContent = htmlString.replace(/<[^>]*>/g, '').trim(); // Enlever toutes les balises HTML

    // Vérifier si le texte se termine par un point
    if (textContent.endsWith('.')) {
      return content; // Si c'est le cas, on retourne l'élément inchangé
    } else {
      // Si ce n'est pas le cas, on ajoute un point
      const updatedHtml = htmlString.trim() + '.';
      return <span dangerouslySetInnerHTML={{ __html: updatedHtml }} />;
    }
  }

  // Si ce n'est pas un élément React, on retourne le contenu tel quel
  return content;
};

export const MediagraphyCard: React.FC<Mediagraphy> = ({
  id,
  title,
  creator,
  director,
  date,
  publisher,
  uri,
  class: mediaType,
  medium,
  format,
  isPartOf,
  thumbnail,
  location,
  place,
  resource_template_id,
}) => {
  const externalUrl =
    getFormOnlyExternalUrl({ type: 'mediagraphie', uri, url: uri }) || (isHttpUrl(uri) ? uri : null);

  const template = mediagraphyTemplates[mediaType] || mediagraphyTemplates['default'];

  return (
    <LinkedResourceCard
      thumbnail={thumbnail}
      isLocked={!externalUrl}
      href={externalUrl ?? undefined}
      external={Boolean(externalUrl)}>
      <p className='text-c6 text-base font-normal'>
        {ensureEndsWithPeriod(
          template({
            id,
            title,
            creator,
            format,
            director,
            date,
            publisher,
            uri,
            class: mediaType,
            medium,
            isPartOf,
            resource_template_id,
            location,
            place,
          }),
        )}
      </p>
    </LinkedResourceCard>
  );
};

export const Mediagraphies: React.FC<{ items: Mediagraphy[]; notitle?: boolean }> = ({ items, notitle }) => {
  // Fonction de tri pour comparer les noms de famille des créateurs ou réalisateurs
  const sortByLastName = (a: Mediagraphy, b: Mediagraphy) => {
    const getLastName = (item: Mediagraphy) => {
      // Vérifier si 'creator' ou 'director' existent et retourner le nom de famille
      const creatorLastName = item.creator?.[0]?.last_name || ''; // Si 'creator' est défini et contient un nom de famille
      const directorLastName = item.director?.[0]?.last_name || ''; // Si 'director' est défini et contient un nom de famille

      // Si creator est défini, utiliser son nom de famille
      if (creatorLastName) return creatorLastName;
      // Sinon, si director est défini, utiliser son nom de famille
      if (directorLastName) return directorLastName;
      return ''; // Aucun nom de famille, pas de tri
    };

    const lastNameA = getLastName(a);
    const lastNameB = getLastName(b);

    // Tri alphabétique en comparant les noms de famille
    if (lastNameA < lastNameB) return -1;
    if (lastNameA > lastNameB) return 1;
    return 0;
  };

  // Séparer les items en deux groupes selon l'ID
  const conferenceMediagraphies = items.filter((item) => item.resource_template_id === '83');
  const complementaryMediagraphies = items.filter((item) => item.resource_template_id !== '83');

  // Trier les éléments par nom de famille si possible
  const sortedConferenceMediagraphies = conferenceMediagraphies.sort(sortByLastName);
  const sortedComplementaryMediagraphies = complementaryMediagraphies.sort(sortByLastName);

  return (
    <div className='w-full flex flex-col gap-5'>
      <div className='flex flex-col gap-5'>
        {sortedConferenceMediagraphies.length > 0 && (
          <>
            {!notitle && <h2 className='text-base text-c5 font-medium'>Médiagraphies de Conférence</h2>}
            <div className={LINKED_RESOURCE_LIST_CLASS}>
              {sortedConferenceMediagraphies.map((item, index) => (
                <MediagraphyCard key={index} {...item} />
              ))}
            </div>
          </>
        )}

        {sortedComplementaryMediagraphies.length > 0 && (
          <>
            {!notitle && <h2 className='text-base text-c5 font-medium'>Médiagraphies Complémentaires</h2>}
            <div className={LINKED_RESOURCE_LIST_CLASS}>
              {sortedComplementaryMediagraphies.map((item, index) => (
                <MediagraphyCard key={index} {...item} />
              ))}
            </div>
          </>
        )}

        {items.length === 0 && (
          <EmptyStateCard
            message="Aucune médiagraphie n'est liée au contenu de cette conférence."
            iconSize={42}
            iconClassName='text-c6'
          />
        )}
      </div>
    </div>
  );
};
