import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDate } from '@internationalized/date';
import { Calendar } from '@heroui/react';
import { Input } from '@/theme/components';

/** Convertit une valeur API Omeka (nombre, chaîne, HH:MM:SS, PT…) en secondes entières ≥ 0. */
export function parseSecondsFromValue(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    if (/^\d+$/.test(trimmed)) {
      return Math.max(0, parseInt(trimmed, 10));
    }
    // ISO 8601 duration : PT1H2M3S ou PT90S
    const iso = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
    if (iso) {
      const h = parseInt(iso[1] || '0', 10);
      const m = parseInt(iso[2] || '0', 10);
      const s = Math.floor(parseFloat(iso[3] || '0'));
      return Math.max(0, h * 3600 + m * 60 + s);
    }
    // HH:MM:SS ou H:MM:SS
    const hms = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
    if (hms) {
      const h = parseInt(hms[1], 10);
      const m = parseInt(hms[2], 10);
      const s = parseInt(hms[3], 10);
      if (m < 60 && s < 60) return Math.max(0, h * 3600 + m * 60 + s);
    }
    // MM:SS
    const ms = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
    if (ms) {
      const m = parseInt(ms[1], 10);
      const s = parseInt(ms[2], 10);
      if (s < 60) return Math.max(0, m * 60 + s);
    }
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum)) return Math.max(0, Math.floor(asNum));
  }
  return 0;
}

/** Affichage vidéo standard hh:mm:ss (toujours deux chiffres pour m et s). Les heures ne sont pas limitées à 2 digits. */
export function secondsToTimecodeString(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

interface TimecodeInputProps {
  /** Secondes, ou chaîne / valeur telle que renvoyée par Omeka (`@value`). */
  value?: unknown;
  /** @deprecated utilisez `value` — conservé pour compatibilité */
  seconds?: number;
  handleInputChange: (value: number) => void;
  label: string;
  isReadOnly?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
}

export const TimecodeInput: React.FC<TimecodeInputProps> = ({
  value,
  seconds: secondsProp,
  label,
  handleInputChange,
  isReadOnly = false,
  isDisabled = false,
  isRequired = false,
}) => {
  const syncedSeconds = parseSecondsFromValue(value !== undefined ? value : secondsProp ?? 0);

  const [draft, setDraft] = useState(() => secondsToTimecodeString(syncedSeconds));

  useEffect(() => {
    setDraft(secondsToTimecodeString(parseSecondsFromValue(value !== undefined ? value : secondsProp ?? 0)));
  }, [value, secondsProp]);

  const commit = useCallback(() => {
    const sec = parseSecondsFromValue(draft);
    setDraft(secondsToTimecodeString(sec));
    handleInputChange(sec);
  }, [draft, handleInputChange]);

  return (
    <Input
      label={label}
      labelPlacement='outside-top'
      size='md'
      value={draft}
      onValueChange={setDraft}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder='0:00:00'
      isReadOnly={isReadOnly}
      isDisabled={isDisabled}
      isRequired={isRequired}
      autoComplete='off'
      classNames={{
        label: 'text-semibold text-c6 text-2xl',
        input: 'tabular-nums',
      }}
    />
  );
};

function intlParseDate(dateString: string): CalendarDate {
  const [year, month, day] = dateString.split('-').map(Number);
  return new CalendarDate(year, month, day);
}

interface DateTimeIntervalPickerProps {
  label: string;
  interval: string;
  handleInputChange: (value: string) => void;
}

const parseInterval = (interval: string) => {
  if (!interval) {
    throw new Error('Interval is required');
  }

  const [start, end] = interval.split('/');
  if (!start || !end) {
    throw new Error('Invalid interval format');
  }

  const [startDate, startTime] = start.split('T');
  const [endDate, endTime] = end.split('T');

  if (!startDate || !startTime || !endDate || !endTime) {
    throw new Error('Invalid start or end datetime format');
  }

  if (startDate !== endDate) {
    throw new Error('Start and end dates must be the same.');
  }

  const date = intlParseDate(startDate);
  const parseTime = (time: string): number => {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + (seconds || 0);
  };

  return {
    date,
    start: parseTime(startTime),
    end: parseTime(endTime),
  };
};

export const DateTimeIntervalPicker: React.FC<DateTimeIntervalPickerProps> = ({
  label,
  interval = '2023-01-01T00:00:00/2023-01-01T00:00:00',
  handleInputChange,
}) => {
  const [parsedInterval, setParsedInterval] = useState<{ date: CalendarDate; start: number; end: number }>(() => {
    try {
      return parseInterval(interval);
    } catch (error) {
      console.error(error);
      const now = new Date();
      const defaultDate = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
      return { date: defaultDate, start: 0, end: 0 };
    }
  });

  useEffect(() => {
    try {
      setParsedInterval(parseInterval(interval));
    } catch (error) {
      console.error(error);
    }
  }, [interval]);

  const formatDateTime = (date: CalendarDate, seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${date.toString()}T${timeString}`;
  };

  const handleStartChange = (sec: number) => {
    const newInterval = { ...parsedInterval, start: sec };
    setParsedInterval(newInterval);
    handleInputChange(`${formatDateTime(newInterval.date, newInterval.start)}/${formatDateTime(newInterval.date, newInterval.end)}`);
  };

  const handleEndChange = (sec: number) => {
    const newInterval = { ...parsedInterval, end: sec };
    setParsedInterval(newInterval);
    handleInputChange(`${formatDateTime(newInterval.date, newInterval.start)}/${formatDateTime(newInterval.date, newInterval.end)}`);
  };

  const handleDateChange = (newDate: CalendarDate | null) => {
    if (newDate instanceof CalendarDate) {
      const newInterval = { ...parsedInterval, date: newDate };
      setParsedInterval(newInterval);
      handleInputChange(`${formatDateTime(newInterval.date, newInterval.start)}/${formatDateTime(newInterval.date, newInterval.end)}`);
    }
  };

  return (
    <div className='flex flex-col w-full gap-2.5'>
      <span className='text-semibold text-c6 text-2xl'>{label}</span>
      <div className='flex flex-col gap-5'>
        <div className='w-full'>
          <Calendar
            classNames={calendarClassNames}
            aria-label='Date'
            value={parsedInterval.date}
            onChange={handleDateChange}
            showMonthAndYearPickers
            visibleMonths={2}
            color='secondary'
            showShadow={false}
          />
        </div>
        <div className='flex flex-col w-full gap-3'>
          <TimecodeInput label='Heure de début' seconds={parsedInterval.start} handleInputChange={handleStartChange} />
          <TimecodeInput label='Heure de fin' seconds={parsedInterval.end} handleInputChange={handleEndChange} />
        </div>
      </div>
    </div>
  );
};

interface DateInputProps {
  date?: string;
  handleInputChange: (value: string) => void;
  label: string;
}

const calendarClassNames = {
  cellButton: 'rounded-xl !text-c6 !cursor-pointer data-[hover=true]:!bg-c4/10 transition-colors data-[disabled=true]:opacity-40',
  base: 'w-full calendarbase !shadow-none !bg-c2 border-2 !border-c3 rounded-xl p-2',
  content: 'w-full',
  headerWrapper: 'w-full !bg-c4/10 rounded-t-lg',
  gridHeader: 'w-full !bg-c4/10 rounded-b-lg',
  prevButton: 'rounded-lg w-[50px]',
  nextButton: 'rounded-lg w-[50px]',
} as const;

export const DatePicker: React.FC<DateInputProps> = ({ label, date, handleInputChange }) => {
  const isValidDate = (d: Date): boolean => {
    return d instanceof Date && !isNaN(d.getTime());
  };

  const getInitialDateValue = useCallback((): CalendarDate | null => {
    if (date) {
      const parsedDate = new Date(date);
      if (isValidDate(parsedDate)) {
        return new CalendarDate(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());
      }
    }
    return null;
  }, [date]);

  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(() => {
    if (!date) return null;
    const parsedDate = new Date(date);
    if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) return null;
    return new CalendarDate(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());
  });

  useEffect(() => {
    setSelectedDate(getInitialDateValue());
  }, [getInitialDateValue]);

  const handleDateChange = (newDate: CalendarDate | null) => {
    if (newDate instanceof CalendarDate) {
      setSelectedDate(newDate);
      handleInputChange(newDate.toString().split('T')[0]);
    } else {
      setSelectedDate(null);
      handleInputChange('');
    }
  };

  return (
    <div className='flex flex-col gap-2.5 w-full'>
      <span className='text-semibold text-c6 text-2xl'>{label}</span>
      <Calendar
        classNames={calendarClassNames}
        aria-label={label}
        value={selectedDate}
        onChange={handleDateChange}
        showMonthAndYearPickers
        visibleMonths={2}
        color='secondary'
        showShadow={false}
      />
    </div>
  );
};
