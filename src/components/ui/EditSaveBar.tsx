import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Spinner } from '@heroui/react';
import { SaveIcon, CrossIcon, CheckIcon, WarningIcon } from '@/components/ui/icons';

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
              <div className='bg-c2/90 border border-c3 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg flex flex-col gap-1.5'>
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
                        {child.isActive && <span className='w-1.5 h-1.5 rounded-full bg-action flex-shrink-0' />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Gradient fade effect */}
          <div className='h-5 bg-gradient-to-t from-c1 to-transparent pointer-events-none' />

          {/* Main bar */}
          <div className='bg-c2 border-t-2 border-c3 '>
            <div className='px-6 py-[10px]'>
              <div className='flex items-center justify-between gap-5'>
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

                {/* Right side - Action buttons */}
                <div className='flex items-center gap-4'>
                  {/* Cancel button */}
                  <Button
                    size='md'
                    variant='flat'
                    className='text-c6 hover:bg-c3/80 bg-c3 rounded-lg p-6 font-medium transition-all duration-200'
                    onPress={onCancel}
                    isDisabled={isSubmitting}
                    startContent={<CrossIcon size={16} />}>
                    Annuler
                  </Button>

                  {/* Save button */}
                  <Button
                    size='md'
                    className={`rounded-lg p-6 font-medium transition-all duration-200 ${
                      isDirty || isCreateMode ? 'bg-action text-selected hover:bg-action/90 shadow-[0_0_15px_rgba(var(--action-rgb),0.3)]' : 'bg-c3 text-c5 cursor-not-allowed'
                    }`}
                    onPress={onSave}
                    isLoading={isSubmitting}
                    isDisabled={isSubmitting || (!isDirty && !isCreateMode)}
                    startContent={!isSubmitting && <SaveIcon size={16} />}>
                    {saveLabel ?? (isCreateMode ? 'Créer la ressource' : 'Sauvegarder')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
