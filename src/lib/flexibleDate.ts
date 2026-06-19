export type FlexibleDateParts = {
  day: string;
  month: string;
  year: string;
};

const DIGITS_ONLY = /\D/g;

/** Parse une valeur Omeka / ISO partielle : YYYY, YYYY-MM ou YYYY-MM-DD */
export function parseFlexibleDate(value: string | null | undefined): FlexibleDateParts {
  const empty = { day: '', month: '', year: '' };
  if (!value?.trim()) return empty;

  const trimmed = value.trim();

  const full = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const yearMonth = /^(\d{4})-(\d{1,2})$/;
  const yearOnly = /^(\d{4})$/;
  const yearPartial = /^(\d{1,3})$/;

  let match = trimmed.match(full);
  if (match) {
    return {
      year: match[1],
      month: match[2],
      day: match[3],
    };
  }

  match = trimmed.match(yearMonth);
  if (match) {
    return { year: match[1], month: match[2], day: '' };
  }

  match = trimmed.match(yearOnly);
  if (match) {
    return { year: match[1], month: '', day: '' };
  }

  match = trimmed.match(yearPartial);
  if (match) {
    return { year: match[1], month: '', day: '' };
  }

  try {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      return {
        year: String(d.getFullYear()),
        month: String(d.getMonth() + 1),
        day: String(d.getDate()),
      };
    }
  } catch {
    // ignore
  }

  return empty;
}

/** Reconstruit YYYY, YYYY-MM ou YYYY-MM-DD selon les segments renseignés */
export function buildFlexibleDate(parts: FlexibleDateParts): string {
  const year = parts.year.replace(DIGITS_ONLY, '');
  const month = parts.month.replace(DIGITS_ONLY, '');
  const day = parts.day.replace(DIGITS_ONLY, '');

  if (!year) return '';

  if (!month && !day) return year;

  if (month && !day) return `${year}-${month}`;

  if (month && day) return `${year}-${month}-${day}`;

  return year;
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
