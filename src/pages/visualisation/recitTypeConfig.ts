import type { RecitType } from './hooks/useRecitsData';

export const TYPE_CONFIG: Record<RecitType, { color: string; label: string; short: string }> = {
  recit_citoyen:          { color: '#C8E6C9', label: 'Récit citoyen',           short: 'Citoyen'     },
  recit_mediatique:       { color: '#FFF1B8', label: 'Récit médiatique',         short: 'Médiatique'  },
  recit_scientifique:     { color: '#AFC8FF', label: 'Récit scientifique',       short: 'Scientifique'},
  recit_artistique:       { color: '#FFB6C1', label: 'Récit artistique',         short: 'Artistique'  },
  recit_techno_industriel:{ color: '#A9E2DA', label: 'Récit techno-industriel',  short: 'Techno'      },
};

export const ALL_TYPES = Object.keys(TYPE_CONFIG) as RecitType[];
