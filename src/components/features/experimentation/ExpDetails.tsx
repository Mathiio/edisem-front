import React, { useState } from 'react';
import { Textarea, Slider, Button } from '@heroui/react';
import { DatePicker } from '@heroui/react';
import { motion, Variants } from 'framer-motion';
import { parseDate } from '@internationalized/date';
import { AddIcon } from '@/components/ui/icons';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 10 } },
};

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};

type ExpDetailsProps = {
  description: string;
  date: string;
  actants: any;
  // Props pour le mode édition
  isEditing?: boolean;
  percentage?: number;
  status?: string;
  onDescriptionChange?: (value: string) => void;
  onDateChange?: (value: string) => void;
  onPercentageChange?: (value: number) => void;
  onStatusChange?: (value: string) => void;
  onAddActant?: () => void;
};

export const ExpDetailsCard: React.FC<ExpDetailsProps> = ({
  description = '',
  date = '',
  actants = [],
  isEditing = false,
  percentage = 0,
  status: _status = '',
  onDescriptionChange,
  onDateChange,
  onPercentageChange,
  onStatusChange: _onStatusChange,
  onAddActant,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const toggleExpansion = () => {
    if (!isEditing) {
      setExpanded(!expanded);
    }
  };

  // Parse date for DatePicker
  const parsedDate = date
    ? (() => {
        try {
          // Try to parse ISO format date
          const d = new Date(date);
          if (!isNaN(d.getTime())) {
            return parseDate(d.toISOString().split('T')[0]);
          }
          return null;
        } catch {
          return null;
        }
      })()
    : null;

  // Handle date change from DatePicker
  const handleDateChange = (value: any) => {
    if (value && onDateChange) {
      onDateChange(value.toString());
    }
  };

  // Check if there's any content to display (in edit mode, always show)
  const hasContent = isEditing || date || description || (actants && actants.length > 0);

  // Don't render if there's no content (except in edit mode)
  if (!hasContent) {
    return null;
  }

  // Mode édition
  if (isEditing) {
    return (
      <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
        <motion.div variants={itemVariants} className='flex flex-col bg-c2 p-6 rounded-lg gap-5'>
          {/* Date */}
          <div className='flex flex-col gap-2'>
            <label className='text-sm text-c5 font-medium'>Date</label>
            <DatePicker
              aria-label="Date de l'expérimentation"
              value={parsedDate as any}
              onChange={handleDateChange}
              classNames={{
                base: 'w-full',
                inputWrapper: 'bg-c1 border border-c3 rounded-lg',
                input: 'text-c6',
              }}
            />
          </div>

          {/* Description */}
          <div className='flex flex-col gap-2'>
            <label className='text-sm text-c5 font-medium'>Description</label>
            <Textarea
              aria-label="Description de l'expérimentation"
              value={description || ''}
              onValueChange={(value) => onDescriptionChange?.(value)}
              placeholder='Décrivez votre expérimentation...'
              minRows={4}
              classNames={{
                inputWrapper: 'bg-c1 border border-c3 rounded-lg',
                input: 'text-c6 text-base',
              }}
            />
          </div>

          {/* Slider d'avancement */}
          <div className='flex flex-col gap-2'>
            <div className='flex justify-between items-center'>
              <label className='text-sm text-c5 font-medium'>Avancement</label>
              <span className='text-sm text-c6 font-medium'>{percentage}%</span>
            </div>
            <Slider
              aria-label="Pourcentage d'avancement"
              size='md'
              step={5}
              minValue={0}
              maxValue={100}
              value={percentage}
              onChange={(value) => onPercentageChange?.(value as number)}
              classNames={{
                track: 'bg-c3',
                filler: 'bg-action',
                thumb: 'bg-action',
              }}
            />
            <div className='flex justify-between text-xs text-c4'>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Actants */}
          <div className='flex flex-col gap-2'>
            <label className='text-sm text-c5 font-medium'>Contributeurs</label>
            <div className='flex flex-wrap gap-2 items-center'>
              {actants &&
                actants.map((actant: any, index: number) => (
                  <span key={actant.id || index} className='px-3 py-px bg-c3 text-c6 rounded-lg text-sm'>
                    {actant.name || actant.firstname + ' ' + actant.lastname}
                  </span>
                ))}
              <Button size='sm' isIconOnly className='bg-c3 text-c6 hover:bg-action hover:text-selected rounded-full' onPress={onAddActant}>
                <AddIcon size={14} />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Mode affichage (inchangé)
  return (
    <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
      <motion.div
        variants={itemVariants}
        className='cursor-pointer flex flex-col bg-c2 hover:bg-c3 p-6 rounded-lg gap-2.5 transition-all ease-in-out duration-200'
        onClick={toggleExpansion}>
        <h3 className='text-base text-c5 font-medium'>{date}</h3>
        <p
          className={`text-base text-c4 font-normal transition-all ease-in-out duration-200 gap-2.5 ${expanded ? '' : 'line-clamp-3'}`}
          style={{ lineHeight: '120%' }}>
          {description}
        </p>
        {actants && actants.length > 0 && (
          <p className='text-sm text-end text-c4 italic transition-all ease-in-out duration-200'>
            Ajouté par : {actants.map((actant: any) => {
              const name = actant.name || `${actant.firstname} ${actant.lastname}`;
              const uni = actant.universities?.[0] ? ` (${actant.universities[0]})` : '';
              return name + uni;
            }).join(', ')}
          </p>
        )}
        <p className='text-base text-c5 font-medium transition-all ease-in-out duration-200'>{expanded ? 'affichez moins' : '...affichez plus'}</p>
      </motion.div>
    </motion.div>
  );
};

export const ExpDetailsSkeleton: React.FC = () => {
  return (
    <div className='flex w-full flex-col gap-2.5 p-6 bg-c2 rounded-lg'>
      {/* Header skeleton (date + edition) */}
      <div className='w-1/2 h-4 bg-c3 rounded-md animate-pulse' />
      
      {/* Description lines skeleton */}
      <div className='flex flex-col gap-1.5'>
        <div className='w-full h-4 bg-c3 rounded-md animate-pulse' />
        <div className='w-full h-4 bg-c3 rounded-md animate-pulse' />
        <div className='w-full h-4 bg-c3 rounded-md animate-pulse' />
        <div className='w-[90%] h-4 bg-c3 rounded-md animate-pulse' />
        <div className='w-3/4 h-4 bg-c3 rounded-md animate-pulse' />
      </div>
      
      {/* Expand button skeleton */}
      <div className='w-[20%] h-4 bg-c3 rounded-md animate-pulse' />
    </div>
  );
};
