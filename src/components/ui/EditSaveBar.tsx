import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '@heroui/react';
import { Button } from '@/theme/components/button';
import {
  modalBottomFadeClass,
  modalFooterCancelButtonClass,
  modalFooterConfirmButtonClass,
} from '@/theme/components/modal';
import { CheckIcon, WarningIcon, ArrowIcon } from '@/components/ui/icons';

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
 * Affichée uniquement en mode édition
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
  /** Déplié par défaut pour voir le résumé des liens dès l'ouverture */
  const [treeExpanded, setTreeExpanded] = useState(true);

  const hasResourceTree = Boolean(resourceTree && resourceTree.children.length > 0);
  const linkedCount = resourceTree?.children.length ?? 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className='fixed bottom-0 left-0 right-0 z-50'>

          {/* Accordéon « Résumé des liens » — en-tête cliquable, replié par défaut */}
          {hasResourceTree && (
            <div className='absolute bottom-full left-6 mb-1'>
              <div
                className={`bg-c2 border border-c3 shadow-lg overflow-hidden w-fit max-w-xs ${
                  treeExpanded ? 'rounded-xl' : 'rounded-lg'
                }`}>
                <button
                  type='button'
                  onClick={() => setTreeExpanded((v) => !v)}
                  aria-expanded={treeExpanded}
                  className='flex items-center text-left hover:bg-c3 transition-colors cursor-pointer whitespace-nowrap gap-2.5 px-3 py-2'>
                  <ArrowIcon
                    size={12}
                    className={`shrink-0 text-c5 transition-transform duration-200 ${treeExpanded ? 'rotate-90' : ''}`}
                  />
                  <span className='font-normal text-c5 leading-tight text-xs'>
                    Résumé des liens
                    <span className='text-c4 font-normal'>
                      {' '}
                      · {linkedCount}
                    </span>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {treeExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className='overflow-hidden'>
                      <div className='px-3 pb-2.5 pt-1 border-t border-c3 flex flex-col gap-1.5 w-fit min-w-full'>
                        <span className='text-c6 text-xs font-medium leading-snug'>{resourceTree!.root}</span>
                        <div className='flex flex-col gap-0.5 ml-1'>
                          {resourceTree!.children.map((child, i) => {
                            const isLast = i === resourceTree!.children.length - 1;
                            return (
                              <div key={i} className='flex items-center gap-2'>
                                <span className='text-c4 text-xs font-mono select-none'>
                                  {isLast ? '└──' : '├──'}
                                </span>
                                <span
                                  className={`text-xs ${child.isActive ? 'text-c6 font-semibold' : 'text-c4'}`}>
                                  {child.title}
                                </span>
                                {child.isActive && (
                                  <motion.span
                                    className='w-1.5 h-1.5 shrink-0 rounded-full bg-c6'
                                    animate={{ opacity: [1, 0.4, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                    aria-hidden
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Gradient fade effect */}
          <div className={modalBottomFadeClass} />

          {/* Main bar */}
          <div className='bg-c1 border-t border-c3'>
            <div className='flex items-center justify-between gap-4 px-6 py-4'>
              <div className='flex items-center gap-2 min-w-0'>
                {isDirty && !isSubmitting && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className='flex items-center gap-2 text-c4'>
                    <WarningIcon size={20} className='text-c5 shrink-0' />
                    <span className='text-sm'>Modifications non sauvegardées</span>
                  </motion.div>
                )}

                {isSubmitting && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='flex items-center gap-2 text-c5'>
                    <Spinner color='current' className='text-c6' size='sm' />
                    <span className='text-sm'>Sauvegarde en cours...</span>
                  </motion.div>
                )}

                {lastSaved && !isDirty && !isSubmitting && (
                  <div className='flex items-center gap-2 text-green-500'>
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
                  {saveLabel ?? 'Sauvegarder'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
