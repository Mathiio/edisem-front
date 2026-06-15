import type { ComponentType } from 'react';
import { TrashIcon, WarningIcon, InfoIcon, CheckIcon, LockIcon } from '@/components/ui/icons';

export type AlertType = 'danger' | 'warning' | 'info' | 'success' | 'forbidden';
export type AlertModalType = AlertType;

type IconComponent = ComponentType<{ size?: number; className?: string }>;

export type AlertTypeConfig = {
  icon: IconComponent;
  iconColor: string;
  iconBg: string;
  confirmButtonClass: string;
};

/** Couleurs et icônes des AlertModal — réutilisées par les toasts. */
export const alertTypeConfigs: Record<AlertType, AlertTypeConfig> = {
  danger: {
    icon: TrashIcon,
    iconColor: 'text-[#FF0000]',
    iconBg: 'bg-red-500/20',
    confirmButtonClass: 'bg-[#FF0000]/70 hover:bg-[#FF0000]/90',
  },
  warning: {
    icon: WarningIcon,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/20',
    confirmButtonClass: 'bg-orange-500/70 hover:bg-orange-500/90',
  },
  info: {
    icon: InfoIcon,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/20',
    confirmButtonClass: 'bg-blue-500/70 hover:bg-blue-500/90',
  },
  success: {
    icon: CheckIcon,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-500/20',
    confirmButtonClass: 'bg-green-500/70 hover:bg-green-500/90',
  },
  forbidden: {
    icon: LockIcon,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/20',
    confirmButtonClass: 'bg-red-500/70 hover:bg-red-500/90',
  },
};

/** Mappe color/severity HeroUI vers le type alerte Edisem. */
export function resolveAlertType(
  color?: string,
  severity?: string,
): AlertType {
  const key = color && color !== 'default' ? color : severity && severity !== 'default' ? severity : 'info';
  if (key === 'success' || key === 'warning' || key === 'danger' || key === 'forbidden') return key;
  if (key === 'primary' || key === 'secondary') return 'info';
  return 'info';
}
