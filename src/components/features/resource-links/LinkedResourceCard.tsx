import React from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon } from '@/components/ui/icons';

/** Espacement vertical entre cartes dans une liste « Autres choix » */
export const LINKED_RESOURCE_LIST_CLASS = 'flex flex-col gap-2';

export interface LinkedResourceCardProps {
  thumbnail?: string | null;
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  /** Aucun hover bordure/fond, pas de clic */
  isLocked?: boolean;
  isNavigating?: boolean;
  className?: string;
}

/**
 * Shell visuel partagé pour les ressources liées (outils, biblio, médiagraphies…).
 * Bordure border-c3 ; hover:border-c6 uniquement si interaction autorisée.
 */
export const LinkedResourceCard: React.FC<LinkedResourceCardProps> = ({
  thumbnail,
  children,
  href,
  external = false,
  onClick,
  isLocked = false,
  isNavigating = false,
  className = '',
}) => {
  const hasHref = Boolean(href && href !== '#');
  const isInteractive = !isLocked && (hasHref || onClick);

  const body = (
    <div className='flex flex-row gap-4 items-center min-w-0 w-full p-4'>
      <div className='flex-shrink-0 w-12 h-12 rounded-md overflow-hidden flex items-center justify-center bg-gradient-to-br from-c2 to-c3'>
        {thumbnail ? (
          <img src={thumbnail} alt='' className='w-12 h-12 object-cover' />
        ) : (
          <ImageIcon size={22} className='text-c4/40' />
        )}
      </div>
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  );

  const shellClassName = [
    'w-full border-2 border-c3 rounded-xl transition-colors',
    isInteractive ? 'hover:border-c5 cursor-pointer hover:bg-c2/40' : 'cursor-default',
    isNavigating ? 'opacity-50 pointer-events-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (isLocked) {
    return <div className={shellClassName}>{body}</div>;
  }

  if (onClick && !hasHref) {
    return (
      <div className={shellClassName}>
        <button type='button' className='w-full text-left' onClick={onClick}>
          {body}
        </button>
      </div>
    );
  }

  if (hasHref && external) {
    return (
      <div className={shellClassName}>
        <a className='block w-full' href={href} target='_blank' rel='noopener noreferrer' onClick={onClick}>
          {body}
        </a>
      </div>
    );
  }

  if (hasHref) {
    return (
      <div className={shellClassName}>
        <Link className='block w-full' to={href!} onClick={onClick}>
          {body}
        </Link>
      </div>
    );
  }

  return <div className={shellClassName}>{body}</div>;
};
