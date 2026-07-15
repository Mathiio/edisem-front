import React, { useCallback, useEffect, useRef, useState } from 'react';
import { modalBottomFadeClass, modalTopFadeClass } from '@/theme/components';

interface ScrollFadeAreaProps {
  children: React.ReactNode;
  /** Classes du conteneur relatif (positionnement des dégradés). */
  className?: string;
  /** Classes de la zone scrollable. */
  contentClassName?: string;
  /** Occupe l’espace flex restant (modales). Désactiver pour une hauteur max fixe. */
  fill?: boolean;
}

/**
 * Zone scrollable avec dégradés haut/bas affichés uniquement quand du contenu
 * reste à scroller dans cette direction — évite de masquer le texte en début/fin de liste.
 */
export const ScrollFadeArea: React.FC<ScrollFadeAreaProps> = ({
  children,
  className = '',
  contentClassName = '',
  fill = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const threshold = 1;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowTopFade(scrollTop > threshold);
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - threshold);
  }, []);

  useEffect(() => {
    updateFades();

    const el = scrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(updateFades);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [updateFades, children]);

  const scrollClassName = fill
    ? `min-h-0 flex-1 overflow-y-auto ${contentClassName}`
    : `overflow-y-auto ${contentClassName}`;

  const wrapperClassName = fill
    ? `relative flex min-h-0 flex-1 flex-col overflow-hidden ${className}`
    : `relative overflow-hidden ${className}`;

  return (
    <div className={wrapperClassName}>
      <div ref={scrollRef} onScroll={updateFades} className={scrollClassName}>
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 z-10 w-full transition-opacity duration-200 ${modalTopFadeClass} ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute bottom-0 left-0 z-10 w-full transition-opacity duration-200 ${modalBottomFadeClass} ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
