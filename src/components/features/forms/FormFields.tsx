import React, { useEffect, useRef, useState } from 'react';
import { InputOtp } from '@heroui/input-otp';
import { Input, Textarea, formFieldLabelClass } from '@/theme/components';
import AutoResizingField, { getAutoResizeTextareaProps } from '@/components/features/database/AutoResizingTextarea';
import {
  buildFlexibleDate,
  getDatePartsErrorMessage,
  parseFlexibleDate,
  sanitizeDatePart,
  validateDateParts,
  type FlexibleDateParts,
} from '@/lib/flexibleDate';

export { formFieldLabelClass };

const otpSegmentClass = [
  'h-10 w-10',
  'bg-c2 border-2 border-c3 rounded-lg',
  'text-c6 text-base font-medium',
  'data-[active=true]:border-c4',
  'data-[has-value=true]:bg-c3',
].join(' ');

const otpClassNames = {
  base: 'w-auto',
  segmentWrapper: 'gap-1',
  segment: otpSegmentClass,
  helperWrapper: 'hidden',
};

type CommonFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
  errorMessage?: string;
  isInvalid?: boolean;
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

type DateSegmentProps = {
  label: string;
  length: number;
  value: string;
  onValueChange: (value: string) => void;
  isInvalid?: boolean;
  ariaLabel: string;
};

const DateSegmentOtp: React.FC<DateSegmentProps> = ({
  label,
  length,
  value,
  onValueChange,
  isInvalid,
  ariaLabel,
}) => (
  <div className='flex flex-col'>
    <span className='text-xs font-medium text-c4'>{label}</span>
    <InputOtp
      length={length}
      value={value}
      allowedKeys='^[0-9]*$'
      variant='bordered'
      size='sm'
      validationBehavior='aria'
      isInvalid={isInvalid}
      aria-label={ariaLabel}
      classNames={otpClassNames}
      onValueChange={onValueChange}
    />
  </div>
);

/**
 * Date OTP : l'utilisateur choisit le niveau de précision (AAAA, MM/AAAA ou JJ/MM/AAAA).
 * Valeurs stockées : YYYY, YYYY-MM ou YYYY-MM-DD.
 */
export const FormDateInput: React.FC<CommonFieldProps> = ({
  label,
  value,
  onChange,
  isRequired,
  errorMessage,
  isInvalid,
}) => {
  const [parts, setParts] = useState<FlexibleDateParts>(() => parseFlexibleDate(value));
  const [touched, setTouched] = useState(false);
  const skipExternalSyncRef = useRef(false);

  useEffect(() => {
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }
    setParts(parseFlexibleDate(value));
  }, [value]);

  useEffect(() => {
    if (errorMessage) setTouched(true);
  }, [errorMessage]);

  const updatePart = (key: keyof FlexibleDateParts, segmentValue: string) => {
    setTouched(true);
    const sanitized = sanitizeDatePart(key, segmentValue);
    setParts((prev) => {
      const next = { ...prev, [key]: sanitized };
      skipExternalSyncRef.current = true;
      onChange(buildFlexibleDate(next));
      return next;
    });
  };

  const fieldRequired = isRequired === true;
  const partErrors = touched ? validateDateParts(parts, { required: fieldRequired, label }) : {};
  const localError = getDatePartsErrorMessage(partErrors, parts);
  const displayError = errorMessage || localError;
  const showInvalid = isInvalid || !!displayError;

  return (
    <div className='w-full flex flex-col gap-2'>
      <label className={formFieldLabelClass}>
        {label}
        {fieldRequired ? <span className='text-danger ml-0.5'>*</span> : null}
      </label>
      <div className='flex flex-wrap items-end gap-3'>
        <DateSegmentOtp
          label='Jour'
          length={2}
          value={parts.day}
          isInvalid={showInvalid || !!partErrors.day}
          ariaLabel={`${label} — jour`}
          onValueChange={(v) => updatePart('day', v)}
        />
        <span className='text-c4 pb-4 select-none'>/</span>
        <DateSegmentOtp
          label='Mois'
          length={2}
          value={parts.month}
          isInvalid={showInvalid || !!partErrors.month}
          ariaLabel={`${label} — mois`}
          onValueChange={(v) => updatePart('month', v)}
        />
        <span className='text-c4 pb-4 select-none'>/</span>
        <DateSegmentOtp
          label='Année'
          length={4}
          value={parts.year}
          isInvalid={showInvalid || !!partErrors.year}
          ariaLabel={`${label} — année`}
          onValueChange={(v) => updatePart('year', v)}
        />
      </div>
      {displayError ? (
        <p className='text-xs font-medium text-[#ef4444]' role='alert'>
          {displayError}
        </p>
      ) : null}
    </div>
  );
};

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
