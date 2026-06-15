import React from 'react';
import { Button } from '@heroui/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/theme/components';
import { ModalTitle } from '@/components/ui/ModalTitle';
import { alertTypeConfigs, type AlertModalType } from '@/config/alertTypeConfig';

export type { AlertModalType } from '@/config/alertTypeConfig';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  type?: AlertModalType;
  icon?: React.FC<any>;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

const typeConfigs = alertTypeConfigs;

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  icon,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  isLoading = false,
}) => {
  const config = typeConfigs[type];
  const Icon = icon || config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader className='flex flex-col gap-px'>
          <ModalTitle title={title} icon={Icon} iconColor={config.iconColor} iconBg={config.iconBg} />
        </ModalHeader>
        <ModalBody>
          <div className='flex flex-col justify-center gap-4'>
            <div className='text-c5'>
              {typeof description === 'string' ? (
                <p>{description}</p>
              ) : (
                description
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant='light' onPress={onClose} className='text-c5 hover:text-c6'>
            {cancelLabel}
          </Button>
          <Button onPress={onConfirm} isLoading={isLoading} className={`${config.confirmButtonClass} text-white font-medium`}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
