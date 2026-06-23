import { Select as OSelect, SelectItem as OSelectItem, extendVariants } from '@heroui/react';
import type { SelectProps } from '@heroui/react';

const defaultListboxProps = {
  itemClasses: {
    base: [
      'cursor-pointer',
      '!text-c4',
      'data-[hover=true]:!bg-c3',
      'data-[hover=true]:!text-c4',
      'data-[hover=true]:data-[selected=true]:!text-c6',
      'data-[selected=true]:!bg-c3',
      'data-[selected=true]:!text-c6',
      'data-[selectable=true]:focus:!bg-c3',
      'data-[selectable=true]:focus:!text-c4',
      'data-[selected=true]:data-[selectable=true]:focus:!text-c6',
    ].join(' '),
    title: '!text-inherit',
    selectedIcon: '!text-c6',
  },
};

const StyledSelect = extendVariants(OSelect, {
  variants: {
    variant: {
      bordered: {
        base: 'w-full',
        trigger: [
          'cursor-pointer',
          'data-[disabled=true]:cursor-not-allowed',
          '!bg-c2',
          '!border-2',
          '!border-c3',
          '!shadow-none',
          'data-[hover=true]:!border-c3',
          'data-[hover=true]:!bg-c3',
          'data-[focus=true]:!bg-c3',
          'data-[focus=true]:!border-c3',
          'min-h-[44px]',
          'rounded-xl',
          'transition-all',
          'duration-200',
        ].join(' '),
        label: 'text-c6 font-medium',
        value: 'text-c6',
        selectorIcon: '!text-c4 w-4 h-4 shrink-0',
        popoverContent: 'bg-c2 border-2 border-c3 rounded-xl',
      },
    },
  },
  defaultVariants: {
    size: 'md',
    labelPlacement: 'outside-top',
    variant: 'bordered',
  },
});

export const Select = (props: SelectProps) => (
  <StyledSelect listboxProps={defaultListboxProps} {...props} />
);

export const SelectItem = OSelectItem;
