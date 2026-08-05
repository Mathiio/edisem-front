import { Button as OButton, extendVariants } from '@heroui/react';

/** Padding / gap standard des boutons contour et triggers dropdown */
export const outlineButtonLayoutClass = 'px-3 py-2 gap-2';

/** Hauteur cible des boutons contour (py-2 + text-base + border-2 ≈ 44px) */
export const outlineButtonMinHeightClass = 'min-h-11';

/** Boutons icône carrés — même hauteur que les boutons contour */
export const outlineIconButtonSizeClass = 'h-11 w-11 min-h-11 min-w-11 shrink-0';

/** Bouton icône seul (recherche navbar, etc.) */
export const outlineIconButtonClass =
  `hover:bg-c3 cursor-pointer bg-c2 flex flex-row rounded-xl border-2 border-c3 items-center justify-center ${outlineIconButtonSizeClass} !p-0 text-c6 transition-all ease-in-out duration-200 focus:outline-none focus-visible:outline-none`;

/** Bouton contour — aligné mon-espace / dropdown triggers */
export const outlineButtonClass =
  `hover:bg-c3 cursor-pointer bg-c2 flex flex-row rounded-xl border-2 border-c3 items-center justify-center ${outlineButtonLayoutClass} ${outlineButtonMinHeightClass} text-base text-c6 transition-all ease-in-out duration-200`;

export const outlineButtonCompactClass =
  'hover:bg-c3 cursor-pointer bg-c2 flex flex-row rounded-xl border-2 border-c3 items-center justify-center text-sm px-3 py-2 gap-2 min-h-[32px] h-[32px] text-c6 transition-all ease-in-out duration-200';

/** Bouton principal (confirmation modale, sauvegarde) */
export const primaryButtonClass = 'bg-action text-selected rounded-xl';

/** Bouton annuler / secondaire texte */
export const cancelButtonClass = 'text-c5 rounded-xl';

/** Bouton destructif contour — même gabarit que outlineButtonClass */
export const dangerOutlineButtonClass =
  `hover:bg-c3 cursor-pointer bg-c2 flex flex-row rounded-xl border-2 border-c3 items-center justify-center ${outlineButtonLayoutClass} ${outlineButtonMinHeightClass} text-base text-danger transition-all ease-in-out duration-200`;

export const dangerOutlineButtonCompactClass = `${dangerOutlineButtonClass} text-sm px-3 py-2 min-h-[32px] h-[32px]`;

export const Button = extendVariants(OButton, {
  variants: {
    size: {
      sm: 'h-[32px] min-h-[32px] min-w-[32px] data-[icon-only=true]:w-[32px] data-[icon-only=false]:px-3 text-small',
      md: 'h-11 min-h-11 min-w-11 data-[icon-only=true]:w-11 data-[icon-only=false]:px-3 text-medium',
      lg: 'h-[48px] min-h-[48px] min-w-[48px] data-[icon-only=true]:w-[48px] data-[icon-only=false]:px-6 text-large',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'solid',
    color: 'default',
  },
});
