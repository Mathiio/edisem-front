import React from 'react';
import { DateInput } from '@heroui/react';
import { parseDate, type DateValue } from '@internationalized/date';
import { Input, Textarea, formFieldLabelClass } from '@/theme/components';
import AutoResizingField, { getAutoResizeTextareaProps } from '@/components/features/database/AutoResizingTextarea';

export { formFieldLabelClass };

const dateInputWrapperClass = [
  '!bg-c2',
  '!border-2',
  '!border-c3',
  '!shadow-none',
  'data-[hover=true]:!border-c3',
  'data-[hover=true]:!bg-c3',
  'group-data-[focus=true]:!bg-c3',
  'group-data-[focus=true]:!border-c3',
  'rounded-xl',
  'min-h-[50px]',
  'transition-all',
  'duration-200',
].join(' ');

const parseDateFieldValue = (value: string): DateValue | null => {
  if (!value?.trim()) return null;
  try {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return parseDate(d.toISOString().split('T')[0]);
    }
    return parseDate(value);
  } catch {
    return null;
  }
};

type CommonFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
};

export const FormTextInput: React.FC<
  CommonFieldProps & {
    type?: React.HTMLInputTypeAttribute;
    autoFocus?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  }
> = ({ label, value, onChange, placeholder, type = 'text', isRequired, autoFocus, onKeyDown }) => (
  <div className='w-full'>
    <Input
      size='md'
      type={type}
      label={label}
      labelPlacement='outside-top'
      classNames={{ label: `${formFieldLabelClass} !text-c6` }}
      placeholder={placeholder ?? `Entrez ${label}`}
      isRequired={isRequired}
      value={value}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

/** Champ date segmenté HeroUI (DateInput — équivalent DateField en v2, sans calendrier popup). */
export const FormDateInput: React.FC<CommonFieldProps> = ({ label, value, onChange, isRequired }) => (
  <div className='w-full'>
    <DateInput
      size='md'
      variant='bordered'
      label={label}
      labelPlacement='outside-top'
      granularity='day'
      classNames={{
        label: formFieldLabelClass,
        base: 'w-full',
        inputWrapper: dateInputWrapperClass,
        innerWrapper: 'px-1',
        input: 'text-c6',
        segment: 'text-c6 data-[placeholder=true]:text-c4/60',
      }}
      value={parseDateFieldValue(value)}
      onChange={(date) => onChange(date ? date.toString() : '')}
      isRequired={isRequired}
    />
  </div>
);

export const FormAutoResizeTextareaInput: React.FC<CommonFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  isRequired,
}) => (
  <div className='w-full flex flex-col gap-2'>
    <label className={formFieldLabelClass}>{label}</label>
    <AutoResizingField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? `Entrez ${label}`}
      isReadOnly={false}
      textareaProps={{
        ...getAutoResizeTextareaProps(),
        'aria-label': label,
        isRequired,
      }}
    />
  </div>
);

export const FormTextareaInput: React.FC<CommonFieldProps & { minRows?: number; resizable?: boolean }> = ({
  label,
  value,
  onChange,
  placeholder,
  minRows = 3,
  isRequired,
  resizable = false,
}) => (
  <div className='w-full'>
    <Textarea
      size='md'
      label={label}
      labelPlacement='outside-top'
      classNames={{
        label: formFieldLabelClass,
        inputWrapper: resizable ? '!items-start' : undefined,
        input: resizable ? 'resize-y min-h-[6rem]' : undefined,
      }}
      placeholder={placeholder ?? `Entrez ${label}`}
      isRequired={isRequired}
      minRows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
