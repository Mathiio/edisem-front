import React, { useEffect } from 'react';
import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom';
import { Breadcrumbs, BreadcrumbItem, Spinner } from '@heroui/react';
import { useNavigationTrail } from '@/hooks/useNavigationTrail';
import { HomeIcon } from '@/components/ui/icons';

interface LoadingBreadcrumbItemProps {
  label: string;
  isLoading?: boolean;
}

const LoadingBreadcrumbItem: React.FC<LoadingBreadcrumbItemProps> = ({ label, isLoading = false }) => (
  <span className='flex items-center'>
    {label}
    {isLoading && <Spinner size='sm' className='ml-2' classNames={{ circle1: 'w-3 h-3', circle2: 'w-3 h-3', wrapper: 'w-3 h-3' }} />}
  </span>
);

interface BreadcrumbConfig {
  label: string;
  href?: string;
  isLoading?: boolean;
  isHome?: boolean;
}

interface DynamicBreadcrumbsProps {
  /**
   * Titre optionnel de l'item actuel (ex: titre de la conférence)
   * Si non fourni, utilisera un label générique
   */
  itemTitle?: string;

  /**
   * Style de soulignement des breadcrumbs
   */
  underline?: 'none' | 'hover' | 'always' | 'active' | 'focus';

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

/**
 * Composant Breadcrumbs dynamique qui affiche le chemin de navigation parcouru
 *
 * Ce composant utilise le NavigationTrailContext pour afficher le chemin
 * de navigation de l'utilisateur. Le trail s'accumule quand l'utilisateur
 * navigue entre des pages de détail et se réinitialise quand il visite
 * une page de liste/grille ou la page d'accueil.
 *
 * @example
 * // Usage basique
 * <DynamicBreadcrumbs />
 *
 * @example
 * // Avec titre personnalisé
 * <DynamicBreadcrumbs itemTitle={conference?.titre} />
 */
export const DynamicBreadcrumbs: React.FC<DynamicBreadcrumbsProps> = ({ itemTitle, underline = 'hover', className = '' }) => {
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { trail, updateCurrentTitle } = useNavigationTrail();

  const isEditContext =
    searchParams.get('mode') === 'edit' || location.pathname.startsWith('/add-resource');

  // Mettre à jour le titre de la page courante quand il est chargé
  useEffect(() => {
    if (itemTitle) {
      updateCurrentTitle(itemTitle);
    }
  }, [itemTitle, updateCurrentTitle]);

  // Masqué en mode édition / création (PageBanner + onglets suffisent)
  if (isEditContext) {
    return null;
  }

  // Ne rien afficher si on est sur la page d'accueil
  if (location.pathname === '/') {
    return null;
  }

  // Construire les breadcrumbs à partir du trail
  const breadcrumbs: BreadcrumbConfig[] = [{ label: '', href: '/', isHome: true }];

  // Ajouter chaque élément du trail
  trail.forEach((item) => {
    const isCurrentPage = item.path === location.pathname;
    const displayLabel = item.title || item.label;
    // Ne pas afficher le spinner pour les pages de grille (elles ont déjà un label fixe)
    // Le spinner s'affiche seulement pour les pages de détail en attente de titre
    const isLoading = isCurrentPage && !itemTitle && !item.isGridPage;

    breadcrumbs.push({
      label: displayLabel,
      href: isCurrentPage ? undefined : item.path,
      isLoading: isLoading,
    });
  });

  // Si le trail est vide mais qu'on est sur une page de détail,
  // ajouter un breadcrumb basique (fallback)
  // Note: On vérifie si la page courante n'est pas déjà dans le trail
  const currentPageInTrail = trail.some((item) => item.path === location.pathname);
  if (!currentPageInTrail && params.id) {
    const isLoading = !itemTitle;
    breadcrumbs.push({
      label: itemTitle || 'Chargement...',
      isLoading: isLoading,
    });
  }

  return (
    <Breadcrumbs underline={underline} className={className}>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        // Rendu spécial pour l'icône maison
        if (crumb.isHome) {
          return (
            <BreadcrumbItem key='home' isCurrent={isLast}>
              <Link to='/' className='flex items-center hover:opacity-80 transition-opacity '>
                <HomeIcon size={18} />
              </Link>
            </BreadcrumbItem>
          );
        }

        return (
          <BreadcrumbItem key={`${crumb.href || crumb.label}-${index}`} isCurrent={isLast}>
            {crumb.href && !isLast ? (
              <Link to={crumb.href}>
                <LoadingBreadcrumbItem label={crumb.label} isLoading={crumb.isLoading} />
              </Link>
            ) : (
              <LoadingBreadcrumbItem label={crumb.label} isLoading={crumb.isLoading} />
            )}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumbs>
  );
};
