import {
  Modal as OModal,
  ModalContent as OModalContent,
  ModalHeader as OModalHeader,
  ModalBody as OModalBody,
  ModalFooter as OModalFooter,
  extendVariants,
} from '@heroui/react';
import { CloseIcon } from '@heroui/shared-icons';
import { primaryButtonClass, cancelButtonClass } from './button';

/** Picto fermer des modales HeroUI (croix simple, pas le CrossIcon cercle du design system). */
export const ModalCloseIcon = CloseIcon;

/** Bouton fermer HeroUI : même picto qu’en admin, fond au survol légèrement arrondi (pas en pilule). */
export const modalCloseButtonClasses = [
  'cursor-pointer',
  '!rounded-lg',
  'text-c6',
  'bg-transparent',
  'hover:bg-c3',
  'active:bg-c3/90',
  'transition-colors',
  'duration-200',
].join(' ');

/** Footer modale — ResourcePicker, MediaDropzone, EditSaveBar, etc. */
export const modalFooterClass = 'flex flex-row gap-2 px-6 py-4 justify-end';
export const modalFooterCancelButtonClass = cancelButtonClass;
export const modalFooterConfirmButtonClass = primaryButtonClass;

/** Fondu haut (zone scrollable) — afficher seulement s’il reste du contenu au-dessus. */
export const modalTopFadeClass =
  'h-3 bg-gradient-to-b from-c1 to-transparent pointer-events-none';

/** Fondu bas (zone scrollable modale ou bandeau fixe). */
export const modalBottomFadeClass =
  'h-3 bg-gradient-to-t from-c1 to-transparent pointer-events-none';

export const Modal = extendVariants(OModal, {
  variants: {
    theme: {
      default: {
        base: 'bg-c1 border-2 border-c3',
        header: 'border-b border-c3',
        body: 'py-6',
        footer: 'border-t border-c3',
        closeButton: modalCloseButtonClasses,
      },
    },
  },
  defaultVariants: {
    theme: 'default',
  },
});

export const ModalContent = OModalContent;
export const ModalHeader = OModalHeader;
export const ModalBody = OModalBody;
export const ModalFooter = OModalFooter;
