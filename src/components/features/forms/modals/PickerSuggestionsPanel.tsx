import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@heroui/react';
import { ArrowIcon, KeywordIcon, ThumbnailIcon } from '@/components/ui/icons';
import { carouselArrowButtonClass } from '@/components/ui/Carrousels';
import { getResourceIcon, getRessourceLabel } from '@/config/resourceConfig';
import { PICKER_CARD_CHECKBOX_CLASSNAMES } from './pickerConstants';

const MAX_SUGGESTIONS = 4;

export interface PickerSuggestionItem {
  id?: number;
  'o:id'?: number;
  title?: string;
  display_title?: string;
  thumbnail?: string;
  subtitle?: string;
}

interface PickerSuggestionsPanelProps {
  title: string;
  items: PickerSuggestionItem[];
  loading?: boolean;
  keywordCount?: number;
  getResourceId: (resource: PickerSuggestionItem) => string | number;
  getTitle: (resource: PickerSuggestionItem) => string;
  getThumbnailUrl: (resource: PickerSuggestionItem) => string | null;
  isSelected: (resource: PickerSuggestionItem) => boolean;
  onToggle: (resource: PickerSuggestionItem) => void;
}

const panelVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2 } },
};

const skeletonVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.3 },
  }),
};

function getTypeLabel(resource: PickerSuggestionItem): string {
  const type = resource.subtitle;
  if (!type) return 'Ressource';
  return getRessourceLabel(type) || type;
}

/** Fond animé — orbes */
const AnimatedPanelBackground: React.FC = () => (
  <div className='absolute inset-0 overflow-hidden pointer-events-none' aria-hidden>
    <div className='absolute inset-0' />

    <motion.div
      className='absolute -top-[35%] -right-[18%] w-[58%] aspect-square rounded-full bg-action/8 blur-2xl will-change-transform'
      animate={{
        x: [0, 72, -48, 36, 0],
        y: [0, -56, 40, -24, 0],
        scale: [1, 1.2, 0.88, 1.1, 1],
      }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className='absolute -bottom-[40%] -left-[12%] w-[52%] aspect-square rounded-full bg-action/8 blur-2xl will-change-transform'
      animate={{
        x: [0, -64, 52, -28, 0],
        y: [0, 48, -36, 20, 0],
        scale: [1, 0.85, 1.15, 0.92, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
    />
    <motion.div
      className='absolute top-[20%] left-[30%] w-[42%] aspect-square rounded-full bg-action/6 blur-3xl will-change-transform'
      animate={{
        x: [0, 55, -40, 25, 0],
        y: [0, -35, 45, -20, 0],
        opacity: [0.45, 0.95, 0.55, 0.85, 0.45],
        scale: [0.9, 1.25, 0.95, 1.12, 0.9],
      }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
    />
  </div>
);

function SuggestionSkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      custom={index}
      variants={skeletonVariants}
      initial='hidden'
      animate='visible'
      className='relative w-full min-w-0 rounded-xl border-2 border-c3 overflow-hidden bg-c2/40'>
      <div className='absolute inset-0 bg-gradient-to-r from-transparent via-c3/40 to-transparent animate-[shimmer_1.4s_ease-in-out_infinite]' />
      <div className='p-3 flex flex-col gap-2.5'>
        <div className='w-full h-[72px] rounded-lg bg-c3/60 animate-pulse' />
        <div className='h-3 w-4/5 rounded bg-c3/60 animate-pulse' />
        <div className='h-2.5 w-1/2 rounded bg-c3/50 animate-pulse' />
      </div>
    </motion.div>
  );
}

const SuggestionCard: React.FC<{
  resource: PickerSuggestionItem;
  selected: boolean;
  onToggle: () => void;
  getTitle: (r: PickerSuggestionItem) => string;
  getThumbnailUrl: (r: PickerSuggestionItem) => string | null;
}> = ({ resource, selected, onToggle, getTitle, getThumbnailUrl }) => {
  const thumbnailUrl = getThumbnailUrl(resource);
  const typeLabel = getTypeLabel(resource);
  const TypeIcon = resource.subtitle ? getResourceIcon(resource.subtitle) : undefined;

  return (
    <motion.button
      type='button'
      whileTap={{ scale: 0.97 }}
      onClick={onToggle}
      className={`
        relative block w-full min-w-0 text-left rounded-xl border-2 overflow-hidden cursor-pointer
        transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-action
        ${selected
          ? 'border-action bg-c2'
          : 'border-c3 bg-c2/40 hover:border-c5 hover:bg-c2/60'}
      `}>
      <div className='p-3 flex flex-col gap-2'>
        <div className='relative w-full h-[72px] rounded-lg overflow-hidden'>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt='' className='w-full h-full object-cover' />
          ) : (
            <div className='w-full h-full bg-gradient-to-br from-action/20 via-c3/40 to-c2/40 flex items-center justify-center'>
              {TypeIcon ? <TypeIcon size={28} className='text-action/60' /> : <ThumbnailIcon size={28} className='text-c4/40' />}
            </div>
          )}
          <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent' />
        </div>

        <div className='flex flex-col gap-1'>
          <p className='text-sm text-c6 font-medium line-clamp-2 leading-snug'>{getTitle(resource)}</p>
          <div className='flex items-center gap-1.5'>
            {TypeIcon && <TypeIcon size={12} className='text-c4 shrink-0' />}
            <span className='text-[10px] text-c4 truncate'>{typeLabel}</span>
          </div>
        </div>
      </div>

      <div className='absolute top-2 left-2 z-10 pointer-events-none'>
        <Checkbox
          isSelected={selected}
          classNames={PICKER_CARD_CHECKBOX_CLASSNAMES}
        />
      </div>
    </motion.button>
  );
};

export const PickerSuggestionsPanel: React.FC<PickerSuggestionsPanelProps> = ({
  title,
  items,
  loading = false,
  getResourceId,
  getTitle,
  getThumbnailUrl,
  isSelected,
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const visibleItems = items.slice(0, MAX_SUGGESTIONS);

  return (
    <AnimatePresence mode='wait'>
      {(loading || visibleItems.length > 0) && (
        <motion.div
          key='suggestions-panel'
          variants={panelVariants}
          initial='hidden'
          animate='visible'
          exit='exit'
          className='mb-5 rounded-2xl border-2 border-action/20 bg-c2/40 p-4 overflow-hidden relative isolate'>
          <AnimatedPanelBackground />

          <div className='relative z-[1]'>
            <div className={`flex w-full items-center justify-between gap-2 ${isExpanded ? 'mb-3' : ''}`}>
              <div className='flex min-w-0 flex-1 items-center gap-2'>
                <div className='shrink-0 rounded-lg p-2 bg-action/20'>
                  <KeywordIcon size={14} className='text-c6' />
                </div>
                <h3 className='text-c6 text-base font-semibold'>{title}</h3>
              </div>
              <button
                type='button'
                onClick={() => setIsExpanded((prev) => !prev)}
                className={carouselArrowButtonClass}
                aria-label={isExpanded ? 'Replier les suggestions' : 'Déplier les suggestions'}
                aria-expanded={isExpanded}>
                <ArrowIcon
                  size={16}
                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : '-rotate-90'}`}
                />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key='suggestions-grid'
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className='overflow-hidden'>
                  {loading ? (
                    <div className='grid grid-cols-4 gap-3 pb-1'>
                      {Array.from({ length: MAX_SUGGESTIONS }).map((_, i) => (
                        <SuggestionSkeletonCard key={i} index={i} />
                      ))}
                    </div>
                  ) : (
                    <div className='grid grid-cols-4 gap-3 pb-1'>
                      {visibleItems.map((resource) => (
                        <SuggestionCard
                          key={getResourceId(resource)}
                          resource={resource}
                          selected={isSelected(resource)}
                          onToggle={() => onToggle(resource)}
                          getTitle={getTitle}
                          getThumbnailUrl={getThumbnailUrl}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PickerSuggestionsPanel;
