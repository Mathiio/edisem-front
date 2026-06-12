import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '@heroui/react';
import { Button } from '@/theme/components/button';
import {
  modalBottomFadeClass,
  modalFooterCancelButtonClass,
  modalFooterConfirmButtonClass,
} from '@/theme/components/modal';
import { CheckIcon, WarningIcon } from '@/components/ui/icons';

interface ResourceTreeChild {
  title: string;
  isActive?: boolean;
}

interface ResourceTree {
  root: string;
  children: ResourceTreeChild[];
}

interface EditSaveBarProps {
  isVisible: boolean;
  onSave: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  mode?: 'edit' | 'create' | 'view';
  lastSaved?: Date | null;
  saveLabel?: string;
  resourceTree?: ResourceTree;
}

/**
 * Barre de sauvegarde fixe en bas de l'écran (style WordPress)
 * Affichée uniquement en mode édition/création
 */
export const EditSaveBar: React.FC<EditSaveBarProps> = ({
  isVisible,
  onSave,
  onCancel,
  isSubmitting = false,
  isDirty = false,
  mode = 'edit',
  lastSaved,
  saveLabel,
  resourceTree,
}) => {
  const isCreateMode = mode === 'create';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className='fixed bottom-0 left-0 right-0 z-50'>

          {/* Resource tree - floating above bar on the left */}
          {resourceTree && resourceTree.children.length > 0 && (
            <div className='absolute bottom-full left-6 mb-3 pointer-events-none'>
              <div className='bg-c2 border border-c3 rounded-xl px-4 py-3 shadow-lg flex flex-col gap-1.5'>
                {/* Root */}
                <span className='text-c6 text-xs font-medium'>{resourceTree.root}</span>
                {/* Children */}
                <div className='flex flex-col gap-0.5 ml-1'>
                  {resourceTree.children.map((child, i) => {
                    const isLast = i === resourceTree.children.length - 1;
                    return (
                      <div key={i} className='flex items-center gap-2'>
                        <span className='text-c4 text-xs font-mono select-none'>{isLast ? '└──' : '├──'}</span>
                        <span className={`text-xs ${child.isActive ? 'text-c6 font-semibold' : 'text-c4'}`}>
                          {child.title}
                        </span>
                        {child.isActive && 
                          <motion.span
                            className='w-1.5 h-1.5 shrink-0 rounded-full bg-c6'
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            aria-hidden
                          />
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Gradient fade effect */}
          <div className={modalBottomFadeClass} />

          {/* Main bar — aligné sur ModalFooter HeroUI (flex gap-2 px-6 py-4) */}
          <div className='bg-c1 border-t border-c3'>
            <div className='flex items-center justify-between gap-4 px-6 py-4'>
                {/* Left side - Status info */}
                <div className='flex items-center gap-2'>

                  {/* Dirty indicator */}
                  {isDirty && !isSubmitting && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='flex items-center gap-2 text-c4'>
                      <WarningIcon size={20} className='text-c5'/>
                      <span className='text-sm'>Modifications non sauvegardées</span>
                    </motion.div>
                  )}

                  {/* Submitting indicator */}
                  {isSubmitting && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='flex items-center gap-2 text-c5'>
                      <Spinner color="current" className="text-c6" size="sm"/>
                      <span className='text-sm'>Sauvegarde en cours...</span>
                    </motion.div>
                  )}

                  {/* Last saved */}
                  {lastSaved && !isDirty && !isSubmitting && (
                    <div className='flex items-center gap-6 text-green-500'>
                      <CheckIcon size={14} />
                      <span className='text-sm'>
                        Sauvegarde le{' '}
                        {lastSaved.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right side — mêmes boutons que ResourcePicker ModalFooter */}
                <div className='flex flex-row gap-2 shrink-0'>
                  <Button
                    variant='light'
                    className={modalFooterCancelButtonClass}
                    onPress={onCancel}
                    isDisabled={isSubmitting}>
                    Annuler
                  </Button>

                  <Button
                    className={modalFooterConfirmButtonClass}
                    onPress={onSave}
                    isLoading={isSubmitting}
                    isDisabled={isSubmitting || (!isDirty && !isCreateMode)}>
                    {saveLabel ?? (isCreateMode ? 'Créer la ressource' : 'Sauvegarder')}
                  </Button>
                </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
