export type FlexibleDateParts = {
  day: string;
  month: string;
  year: string;
};

/** Granularité inférée depuis la saisie : JJ/MM/AAAA, MM/AAAA ou AAAA seule */
export type DatePrecision = 'full' | 'month' | 'year';

export type DatePartErrors = Partial<Record<keyof FlexibleDateParts, string>>;

export type DateValidationOptions = {
  required?: boolean;
  label?: string;
};

const DIGITS_ONLY = /\D/g;

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/** Déduit le format visé d'après les segments remplis par l'utilisateur */
export function inferDatePrecision(parts: FlexibleDateParts): DatePrecision {
  if (parts.day) return 'full';
  if (parts.month) return 'month';
  return 'year';
}

function pad2(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return String(n).padStart(2, '0');
}

/** Filtre la saisie jour : 01–31, max 2 chiffres */
export function sanitizeDayPart(value: string): string {
  const digits = value.replace(DIGITS_ONLY, '').slice(0, 2);
  if (digits.length === 0) return '';
  if (digits.length === 1) {
    if (Number(digits) > 3) return '';
    return digits;
  }
  const num = Number(digits);
  if (num < 1 || num > 31) return digits.slice(0, 1);
  return digits;
}

/** Filtre la saisie mois : 01–12, max 2 chiffres */
export function sanitizeMonthPart(value: string): string {
  const digits = value.replace(DIGITS_ONLY, '').slice(0, 2);
  if (digits.length === 0) return '';
  if (digits.length === 1) {
    if (Number(digits) > 1) return '';
    return digits;
  }
  const num = Number(digits);
  if (num < 1 || num > 12) return digits.slice(0, 1);
  return digits;
}

/** Filtre la saisie année : 4 chiffres max, ≤ année en cours */
export function sanitizeYearPart(value: string): string {
  let digits = value.replace(DIGITS_ONLY, '').slice(0, 4);
  if (digits.length === 4) {
    const num = Number(digits);
    if (num > getCurrentYear()) {
      digits = digits.slice(0, 3);
    }
  }
  return digits;
}

export function sanitizeDatePart(key: keyof FlexibleDateParts, value: string): string {
  switch (key) {
    case 'day':
      return sanitizeDayPart(value);
    case 'month':
      return sanitizeMonthPart(value);
    case 'year':
      return sanitizeYearPart(value);
  }
}

function validateDatePartsForPrecision(
  parts: FlexibleDateParts,
  precision: DatePrecision,
  required: boolean,
): DatePartErrors {
  const errors: DatePartErrors = {};
  const maxYear = getCurrentYear();
  const currentMonth = new Date().getMonth() + 1;

  const validateYear = () => {
    if (!parts.year) {
      if (required) errors.year = "L'année est requise";
      return;
    }
    if (parts.year.length !== 4) {
      errors.year = "L'année doit comporter 4 chiffres";
      return;
    }
    if (Number(parts.year) > maxYear) {
      errors.year = `L'année ne peut pas dépasser ${maxYear}`;
    }
  };

  const validateMonth = () => {
    if (precision === 'year') return;

    if (!parts.month) {
      if (required) errors.month = 'Le mois est requis';
      return;
    }
    if (parts.month.length !== 2) {
      errors.month = 'Le mois doit comporter 2 chiffres (01–12)';
      return;
    }
    const m = Number(parts.month);
    if (m < 1 || m > 12) {
      errors.month = 'Le mois doit être entre 01 et 12';
    }
  };

  const validateDay = () => {
    if (precision !== 'full') return;

    if (!parts.day) {
      if (required) errors.day = 'Le jour est requis';
      return;
    }
    if (parts.day.length !== 2) {
      errors.day = 'Le jour doit comporter 2 chiffres (01–31)';
      return;
    }
    const d = Number(parts.day);
    if (d < 1 || d > 31) {
      errors.day = 'Le jour doit être entre 01 et 31';
    }
  };

  validateYear();
  validateMonth();
  validateDay();

  if (errors.year || errors.month || errors.day) return errors;

  const y = Number(parts.year);
  if (parts.year.length !== 4) return errors;

  if (precision === 'month' && parts.month.length === 2) {
    const m = Number(parts.month);
    if (y === maxYear && m > currentMonth) {
      errors.month = 'Le mois ne peut pas être postérieur au mois en cours';
    }
  }

  if (precision === 'full' && parts.month.length === 2 && parts.day.length === 2) {
    const date = new Date(y, Number(parts.month) - 1, Number(parts.day));
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      errors.day = "La date ne peut pas être postérieure à aujourd'hui";
    }
  }

  return errors;
}

/** Valide les segments selon le format inféré depuis la saisie */
export function validateDateParts(parts: FlexibleDateParts, options?: DateValidationOptions): DatePartErrors {
  const required = options?.required ?? false;
  const isEmpty = !parts.day && !parts.month && !parts.year;

  if (isEmpty) {
    if (required) return { year: `${options?.label ?? 'Date'} est requis` };
    return {};
  }

  const precision = inferDatePrecision(parts);
  return validateDatePartsForPrecision(parts, precision, true);
}

/** Message d'erreur principal pour affichage sous le champ date */
export function getDatePartsErrorMessage(errors: DatePartErrors, parts?: FlexibleDateParts): string | undefined {
  const precision = parts ? inferDatePrecision(parts) : 'full';
  if (precision === 'full') return errors.day || errors.month || errors.year;
  if (precision === 'month') return errors.month || errors.year;
  return errors.year;
}

/** Validation pour le formulaire */
export function validateFlexibleDateValue(
  value: string | null | undefined,
  options?: DateValidationOptions,
): string | null {
  const { required = false, label = 'Date' } = options ?? {};
  const parts = value?.trim() ? parseFlexibleDate(value) : { day: '', month: '', year: '' };
  const isEmpty = !parts.day && !parts.month && !parts.year;

  if (isEmpty) {
    return required ? `${label} est requis` : null;
  }

  const precision = inferDatePrecision(parts);
  const segmentErrors = validateDatePartsForPrecision(parts, precision, true);
  return getDatePartsErrorMessage(segmentErrors, parts) ?? null;
}

/** Parse une valeur Omeka / ISO : YYYY, YYYY-MM ou YYYY-MM-DD */
export function parseFlexibleDate(value: string | null | undefined): FlexibleDateParts {
  const empty = { day: '', month: '', year: '' };
  if (!value?.trim()) return empty;

  const trimmed = value.trim();

  const full = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const yearMonth = /^(\d{4})-(\d{1,2})$/;
  const yearOnly = /^(\d{4})$/;

  let match = trimmed.match(full);
  if (match) {
    return {
      year: match[1],
      month: pad2(match[2]),
      day: pad2(match[3]),
    };
  }

  match = trimmed.match(yearMonth);
  if (match) {
    return { year: match[1], month: pad2(match[2]), day: '' };
  }

  match = trimmed.match(yearOnly);
  if (match) {
    return { year: match[1], month: '', day: '' };
  }

  if (!trimmed.includes('-')) {
    try {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return {
          year: String(d.getFullYear()),
          month: pad2(String(d.getMonth() + 1)),
          day: pad2(String(d.getDate())),
        };
      }
    } catch {
      // ignore
    }
  }

  return empty;
}

/** Reconstruit YYYY, YYYY-MM ou YYYY-MM-DD selon ce que l'utilisateur a saisi */
export function buildFlexibleDate(parts: FlexibleDateParts): string {
  const precision = inferDatePrecision(parts);
  const year = parts.year.replace(DIGITS_ONLY, '');
  const month = parts.month.replace(DIGITS_ONLY, '');
  const day = parts.day.replace(DIGITS_ONLY, '');

  if (year.length !== 4 || Number(year) > getCurrentYear()) return '';

  if (precision === 'year') return year;

  if (month.length !== 2 || Number(month) < 1 || Number(month) > 12) {
    return precision === 'month' ? '' : year;
  }

  if (precision === 'month') return `${year}-${month}`;

  if (day.length !== 2 || Number(day) < 1 || Number(day) > 31) {
    return `${year}-${month}`;
  }

  return `${year}-${month}-${day}`;
}

/** Affichage lisible d'une date partielle ou complète */
export function formatFlexibleDateDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';

  const { year, month, day } = parseFlexibleDate(raw);
  if (!year) return raw;

  if (!month) return year;

  const monthNum = Number(month);
  const monthLabel =
    monthNum >= 1 && monthNum <= 12
      ? new Date(Number(year), monthNum - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })
      : month;

  if (!day) {
    return `${monthLabel} ${year}`;
  }

  const dayNum = Number(day);
  if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
    const d = new Date(Number(year), monthNum - 1, dayNum);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  return `${day}/${month}/${year}`;
}
