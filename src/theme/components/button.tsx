import { Button as OButton, extendVariants } from '@heroui/react';

/** Bouton contour — aligné mon-espace / dropdown triggers */
export const outlineButtonClass =
  'hover:bg-c3 cursor-pointer bg-c2 flex flex-row rounded-xl border-2 border-c3 items-center justify-center px-4 py-2.5 text-base gap-2.5 text-c6 transition-all ease-in-out duration-200';

export const outlineButtonCompactClass =
  'hover:bg-c3 cursor-pointer bg-c2 flex flex-row rounded-xl border-2 border-c3 items-center justify-center text-sm px-3 py-2 gap-2 text-c6 transition-all ease-in-out duration-200';

/** Bouton principal (confirmation modale, sauvegarde) */
export const primaryButtonClass = 'bg-action text-selected rounded-lg';

/** Bouton annuler / secondaire texte */
export const cancelButtonClass = 'text-c5 rounded-lg';

/** Bouton destructif contour — même gabarit que outlineButtonClass */
export const dangerOutlineButtonClass =
  'hover:bg-c3 cursor-pointer bg-c2 flex flex-row rounded-xl border-2 border-c3 items-center justify-center px-4 py-2.5 text-base gap-2.5 text-danger transition-all ease-in-out duration-200';

export const dangerOutlineButtonCompactClass = `${dangerOutlineButtonClass} text-sm px-3 py-2 min-h-[32px] h-[32px]`;

export const Button = extendVariants(OButton, {
  variants: {
    size: {
      sm: 'h-[32px] min-h-[32px] min-w-[32px] data-[icon-only=true]:w-[32px] data-[icon-only=false]:px-3 text-small',
      md: 'h-[40px] min-h-[40px] min-w-[40px] data-[icon-only=true]:w-[40px] data-[icon-only=false]:px-4 text-medium',
      lg: 'h-[48px] min-h-[48px] min-w-[48px] data-[icon-only=true]:w-[48px] data-[icon-only=false]:px-6 text-large',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'solid',
    color: 'default',
  },
});
