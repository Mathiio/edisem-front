import { Input, Textarea } from '@/theme/components';
import { useEffect, useRef } from 'react';
import type { TextAreaProps, InputProps } from '@heroui/react';

/** Props textarea alignées sur le thème Input — padding px-3 py-2, text-small (md) / text-sm (sm). */
export function getAutoResizeTextareaProps(options?: {
  size?: 'md' | 'sm';
}): Pick<TextAreaProps, 'size' | 'minRows' | 'classNames'> {
  const size = options?.size ?? 'md';
  return { size, minRows: 1, classNames: getAutoResizeTextareaClassNames({ size }) };
}

export function getAutoResizeTextareaClassNames(options?: {
  size?: 'md' | 'sm';
}): NonNullable<TextAreaProps['classNames']> {
  const size = options?.size ?? 'md';
  const minH = 'min-h-[50px]';
  const textSize = size === 'sm' ? 'text-sm' : 'text-small';

  return {
    base: 'w-full',
    inputWrapper: [
      '!bg-c2',
      '!border-2',
      '!border-c3',
      '!shadow-none',
      'data-[hover=true]:!border-c3',
      'data-[hover=true]:!bg-c3',
      'group-data-[focus=true]:!bg-c3',
      'group-data-[focus=true]:!border-c3',
      'rounded-xl',
      'transition-all',
      'duration-200',
      '!mt-0',
      '!items-start',
      'px-3',
      'py-2',
      minH,
    ].join(' '),
    input: `text-c6 ${textSize} placeholder:text-c4/60 !resize-none !outline-none overflow-hidden !mt-0`,
  };
}

interface AutoResizingFieldProps {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  textareaProps?: Omit<TextAreaProps, 'value' | 'onChange' | 'placeholder'>;
  inputProps?: Omit<InputProps, 'value' | 'isReadOnly' | 'onChange' | 'placeholder'>;
  isReadOnly?: boolean;
}

export default function AutoResizingField({
  value,
  onChange,
  placeholder,
  textareaProps = {},
  inputProps = {},
  isReadOnly = true,
}: AutoResizingFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const safeValue = typeof value === 'string' ? value : String(value || '');

  const shouldUseTextarea = !isReadOnly || safeValue.split('\n').length > 1 || safeValue.length > 50;

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (shouldUseTextarea) adjustHeight();
  }, [safeValue, shouldUseTextarea]);

  if (shouldUseTextarea) {
    const { style: textareaStyle, classNames: textareaClassNames, ...restTextareaProps } = textareaProps;

    return (
      <Textarea
        ref={textareaRef}
        minRows={1}
        value={safeValue}
        isReadOnly={isReadOnly}
        placeholder={placeholder}
        {...restTextareaProps}
        classNames={{
          ...textareaClassNames,
          input: [textareaClassNames?.input, '!resize-none overflow-hidden'].filter(Boolean).join(' '),
        }}
        onChange={(e) => {
          onChange?.(e);
          requestAnimationFrame(adjustHeight);
        }}
        style={{ resize: 'none', overflow: 'hidden', ...textareaStyle }}
      />
    );
  }

  return (
    <Input
      value={safeValue}
      isReadOnly={isReadOnly}
      onChange={onChange}
      placeholder={placeholder}
      type='text'
      {...inputProps}
      className={`min-h-[50px] ${inputProps.className || ''}`}
    />
  );
}
