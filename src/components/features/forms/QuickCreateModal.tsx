import React, { useState } from 'react';
import { Button, Input, Spinner } from '@heroui/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/theme/components/modal';
import { addToast } from '@/theme/components';

import { OMEKA_API_BASE as API_BASE, omekaApiUrl, omekaAuthErrorMessage } from '@/utils/omekaApi';

// Property IDs Omeka S (stables — identiques pour toutes les instances)
const PROPERTY_IDS: Record<string, number> = {
  'dcterms:title': 1,
  'dcterms:alternative': 17,
  'schema:url': 1517,
};

export interface QuickCreateField {
  property: 'dcterms:title' | 'dcterms:alternative' | 'schema:url';
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface QuickCreatedItem {
  id: number;
  title: string;
}

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: QuickCreatedItem) => void;
  templateId: number;
  title: string;
  fields: QuickCreateField[];
}

/**
 * Mini-modal de création rapide pour les ressources Omeka S simples.
 * Utilisé pour créer une université, école doctorale ou laboratoire
 * directement depuis le sélecteur de ressources.
 */
export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  templateId,
  title,
  fields,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setValues({});
    onClose();
  };

  const handleSubmit = async () => {
    const titleField = fields.find((f) => f.property === 'dcterms:title');
    if (titleField && !values['dcterms:title']?.trim()) return;

    setSaving(true);
    try {
      const omekaUserId = localStorage.getItem('omekaUserId');

      const itemData: Record<string, any> = {
        'o:resource_template': { 'o:id': templateId },
        ...(omekaUserId ? { 'o:owner': { 'o:id': parseInt(omekaUserId, 10) } } : {}),
      };

      for (const field of fields) {
        const val = values[field.property]?.trim();
        if (!val) continue;
        const propId = PROPERTY_IDS[field.property];
        if (!propId) continue;
        itemData[field.property] = [
          { type: 'literal', property_id: propId, '@value': val, is_public: true },
        ];
      }

      const createUrl = omekaApiUrl(`${API_BASE}items`);
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          omekaAuthErrorMessage(response.status) ||
            errorData.errors?.[0]?.message ||
            'Erreur lors de la création',
        );
      }

      const result = await response.json();
      const createdTitle = values['dcterms:title'] || result['o:title'] || `Item ${result['o:id']}`;

      addToast({
        title: 'Créé avec succès',
        description: createdTitle,
        classNames: { base: 'bg-success', title: 'text-c6', description: 'text-c6' },
      });

      onCreated({ id: result['o:id'], title: createdTitle });
      setValues({});
    } catch (err: any) {
      addToast({
        title: 'Erreur',
        description: err.message || 'Impossible de créer la ressource.',
        classNames: { base: 'bg-danger', title: 'text-c6', description: 'text-c6' },
      });
    } finally {
      setSaving(false);
    }
  };

  const inputWrapperClass =
    'bg-c2 border-2 border-c3 hover:border-c4 focus-within:!border-c5 rounded-lg shadow-none';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} backdrop='blur' size='sm'>
      <ModalContent>
        <ModalHeader className='text-c6 text-base font-medium'>{title}</ModalHeader>
        <ModalBody>
          <div className='flex flex-col gap-4'>
            {fields.map((field) => (
              <div key={field.property} className='flex flex-col gap-1.5'>
                <label className='text-sm text-c5 font-medium'>
                  {field.label}
                  {field.required && <span className='text-red-400 ml-1'>*</span>}
                </label>
                <Input
                  value={values[field.property] || ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.property]: e.target.value }))}
                  placeholder={field.placeholder}
                  classNames={{ inputWrapper: inputWrapperClass, input: 'text-c6' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                />
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            size='sm'
            variant='light'
            className='text-c5 hover:bg-c3 rounded-lg'
            onPress={handleClose}
            isDisabled={saving}>
            Annuler
          </Button>
          <Button
            size='sm'
            className='bg-action text-selected rounded-lg'
            onPress={handleSubmit}
            isDisabled={saving || !values['dcterms:title']?.trim()}>
            {saving ? <Spinner size='sm' color='current' /> : 'Créer'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// ========================================
// Configs prédéfinies pour les ressources liées à l'intervenant
// ========================================

/** Réservé aux templates sans page /add-resource dédiée. Univ / école / labo passent par createUrl. */
export const QUICK_CREATE_CONFIGS: Record<number, { title: string; fields: QuickCreateField[] }> = {};
