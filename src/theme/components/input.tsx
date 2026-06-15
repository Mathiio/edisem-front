import { Input as OInput, extendVariants } from '@heroui/react';

/** Libellé des champs — aligné sur CreateModal */
export const formFieldLabelClass = 'text-semibold text-c6 text-xl';

/** Bouton afficher / masquer mot de passe (endContent des champs password). */
export const passwordToggleButtonClass = 'cursor-pointer shrink-0 focus:outline-none';

const baseInputWrapper = [
  '!bg-c2',
  '!border-2',
  '!border-c3',
  '!shadow-none',
  'data-[hover=true]:!border-c3',
  'data-[hover=true]:!bg-c3',
  'group-data-[focus=true]:!bg-c3',
  'group-data-[focus=true]:!border-c3',
  'group-data-[invalid=true]:!border-[#ef4444]',
  'rounded-xl',
  'transition-all',
  'duration-200',
  '!mt-0',
].join(' ');

export const Input = extendVariants(OInput, {
  variants: {
    variant: {
      bordered: {
        base: 'w-full flex flex-col gap-0',
        mainWrapper: 'w-full',
        inputWrapper: `${baseInputWrapper} min-h-[50px] [&_button]:cursor-pointer`,
        input: 'text-c6 placeholder:text-c4/60 !mt-0',
        label: 'text-c6 font-medium',
        errorMessage: '!text-[#ef4444] text-xs font-medium mt-1',
      },
    },
    size: {
      sm: {
        inputWrapper: '!min-h-8',
        input: 'text-sm',
      },
    },
  },
  defaultVariants: {
    size: 'md',
    labelPlacement: 'outside-top',
    variant: 'bordered',
  },
});
