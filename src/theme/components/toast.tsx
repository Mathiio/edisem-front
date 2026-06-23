import React from 'react';
import {
  ToastProvider,
  addToast as herouiAddToast,
  closeAll,
  closeToast,
  isToastClosing,
  type ToastProps,
} from '@heroui/toast';
import { cn } from '@heroui/react';
import { WarningIcon } from '@/components/ui/icons';
import { alertTypeConfigs, resolveAlertType, type AlertType, type AlertTypeConfig } from '@/config/alertTypeConfig';
import { modalCloseButtonClasses, ModalCloseIcon } from './modal';

/** Coque sombre des toasts — alignée sur les modales (`bg-c1`, bordure `c3`). */
export const toastShellClasses = 'bg-c1 border border-c3 shadow-md';

/** Largeur : auto selon le contenu, max ~28rem (vs 356px HeroUI), pleine largeur mobile. */
export const toastWidthClasses =
  'w-full max-w-[calc(100vw-2rem)] sm:!w-auto sm:!max-w-[28rem]';

/** Padding interne symétrique — surcharge le `p-3` / `my-1` HeroUI. */
export const toastPaddingClasses = '!p-4 !my-0';

/** Barre de timeout HeroUI — masquée pour ne pas réduire l’espace visuel en bas. */
export const toastProgressClasses = 'hidden';

/** Bouton fermer toast — mêmes classes que les modales HeroUI du site. */
export const toastCloseButtonClasses = [
  modalCloseButtonClasses,
  '!opacity-100',
  'group-hover:!opacity-100',
  'pointer-events-auto',
  '!relative',
  '!right-auto',
  '!top-auto',
  'self-center',
  'shrink-0',
  'w-8 h-8 min-w-8',
  'border-0',
  'ml-1',
].join(' ');

export const toastCloseIconClasses = 'w-4 h-4 border-0 bg-transparent p-0 rounded-none';

/** Conteneur icône toast — fond coloré, coins arrondis xl (surcharge les slots HeroUI). */
export const toastIconContainerClasses =
  'box-border flex !h-8 !w-8 !min-h-8 !min-w-8 shrink-0 items-center justify-center rounded-xl';

/** Slot HeroUI `icon` — ne pas écraser le conteneur custom, centré dans la hauteur du toast. */
export const toastIconSlotClasses =
  '!h-auto !w-auto !min-h-0 !min-w-0 shrink-0 self-center overflow-visible bg-transparent p-0 border-0 rounded-none fill-none stroke-none';

/** Durée d’affichage par défaut (HeroUI : 6 s). */
export const DEFAULT_TOAST_TIMEOUT_MS = 6000;

export const defaultToastCloseIcon = <ModalCloseIcon className='w-4 h-4 text-c6' />;

export const defaultToastProviderProps: Partial<ToastProps> = {
  variant: 'flat',
  color: 'default',
  radius: 'lg',
  shadow: 'none',
  timeout: DEFAULT_TOAST_TIMEOUT_MS,
  closeIcon: defaultToastCloseIcon,
  classNames: {
    base: [toastPaddingClasses, 'relative', toastShellClasses, toastWidthClasses, 'rounded-xl', 'gap-3', 'items-center'].join(' '),
    content: 'flex gap-3 items-center min-w-0 flex-1 self-stretch',
    wrapper: 'gap-0.5 min-w-0 flex flex-col justify-center',
    title: 'text-base font-medium text-c6 me-0 leading-snug whitespace-normal overflow-visible',
    description: 'text-sm font-normal text-c5 me-0 leading-snug whitespace-normal',
    icon: toastIconSlotClasses,
    closeButton: toastCloseButtonClasses,
    closeIcon: toastCloseIconClasses,
    progressTrack: toastProgressClasses,
    progressIndicator: toastProgressClasses,
  },
};

type AppToastProviderProps = React.ComponentProps<typeof ToastProvider>;

/** ToastProvider configuré pour le design Edisem (placement bas, props par défaut). */
export const AppToastProvider: React.FC<AppToastProviderProps> = ({
  placement = 'bottom-center',
  toastOffset = 16,
  toastProps,
  ...props
}) => (
  <ToastProvider
    placement={placement}
    toastOffset={toastOffset}
    toastProps={{
      ...defaultToastProviderProps,
      ...toastProps,
      classNames: {
        ...defaultToastProviderProps.classNames,
        ...toastProps?.classNames,
      },
    }}
    {...props}
  />
);

type AddToastInput = Parameters<typeof herouiAddToast>[0];

function inferAlertTypeFromLegacyClasses(classNames?: AddToastInput['classNames']): AlertType | undefined {
  const base = classNames?.base;
  if (typeof base !== 'string') return undefined;
  if (base.includes('bg-success') || base.includes('success')) return 'success';
  if (base.includes('bg-warning') || base.includes('warning')) return 'warning';
  if (base.includes('bg-danger') || base.includes('danger')) return 'danger';
  return undefined;
}

function resolveToastAlertType(props: AddToastInput): AlertType {
  const fromLegacy = inferAlertTypeFromLegacyClasses(props.classNames);
  if (fromLegacy) return fromLegacy;
  return resolveAlertType(props.color, props.severity);
}

/** Erreurs toast : WarningIcon rouge (TrashIcon réservé aux modales de suppression). */
function getToastVisual(alertType: AlertType): AlertTypeConfig {
  const config = alertTypeConfigs[alertType];
  if (alertType === 'danger') {
    return { ...config, icon: WarningIcon };
  }
  return config;
}

function stripLegacyColorClasses(className?: string): string {
  if (!className) return '';
  return className
    .replace(/\bbg-(success|danger|warning|primary|secondary|foreground|c1|c2)\b/g, '')
    .replace(/\bborder-(success|danger|warning|green|orange|red)[^\s]*/g, '')
    .replace(/\btext-white\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rendu fonction pour éviter que HeroUI écrase le conteneur via cloneElement (w-6 h-6). */
function buildThemedIcon(config: AlertTypeConfig): NonNullable<AddToastInput['icon']> {
  const { icon: Icon, iconColor, iconBg } = config;
  return () => (
    <div className={cn(toastIconContainerClasses, iconBg, 'self-center')} aria-hidden>
      <Icon size={20} className={iconColor} />
    </div>
  );
}

/** Affiche un toast thématisé Edisem (icône, couleurs, durée par défaut). */
export function addToast(props: AddToastInput): string | null {
  const alertType = resolveToastAlertType(props);
  const visual = getToastVisual(alertType);
  const defaults = defaultToastProviderProps.classNames ?? {};
  const legacyBase = stripLegacyColorClasses(
    typeof props.classNames?.base === 'string' ? props.classNames.base : undefined,
  );

  const severity =
    props.severity ??
    (alertType === 'info' ? 'default' : alertType === 'forbidden' ? 'danger' : alertType);

  return herouiAddToast({
    ...defaultToastProviderProps,
    ...props,
    color: 'default',
    severity,
    variant: 'flat',
    radius: 'lg',
    shadow: 'none',
    timeout: props.timeout ?? DEFAULT_TOAST_TIMEOUT_MS,
    closeIcon: props.closeIcon ?? defaultToastCloseIcon,
    icon: props.icon ?? buildThemedIcon(visual),
    classNames: {
      ...defaults,
      ...props.classNames,
      base: cn(toastPaddingClasses, defaults.base, toastShellClasses, toastWidthClasses, 'rounded-xl gap-3 items-center', legacyBase),
      content: cn(defaults.content, props.classNames?.content),
      wrapper: cn(defaults.wrapper, props.classNames?.wrapper),
      title: cn(defaults.title, props.classNames?.title),
      description: cn(defaults.description, props.classNames?.description),
      icon: cn(toastIconSlotClasses, defaults.icon, props.classNames?.icon),
      closeButton: cn(toastCloseButtonClasses, props.classNames?.closeButton),
      closeIcon: cn(toastCloseIconClasses, props.classNames?.closeIcon),
      progressTrack: cn(toastProgressClasses, props.classNames?.progressTrack),
      progressIndicator: cn(toastProgressClasses, props.classNames?.progressIndicator),
    },
  });
}

export { closeAll, closeToast, isToastClosing };
