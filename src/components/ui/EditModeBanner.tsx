import React from 'react';
import { motion } from 'framer-motion';
import { getResourceDisplayTheme } from '@/config/resourceConfig';

interface EditModeBannerProps {
  mode: 'create' | 'edit';
  resourceType: string;
  className?: string;
}

/**
 * Bannière mode édition/création — alignée à gauche, point clignotant + type de ressource en dessous.
 */
export const EditModeBanner: React.FC<EditModeBannerProps> = ({ resourceType, className = '' }) => {
  const { label, icon: Icon, color } = getResourceDisplayTheme(resourceType);
  const title = 'Mode édition';

  return (
    <div className={`py-2.5 relative w-full ${className}`}>
      <div className='z-[12] flex items-center gap-4'>
        <motion.span
          className='w-2.5 h-2.5 shrink-0 rounded-full bg-c6'
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />

        <div className='flex flex-col gap-1'>
          <h1 className='text-4xl text-c6 font-medium leading-none'>{title}</h1>

          <div className='flex items-center gap-2'>
            <div
              className='p-2 rounded-lg flex items-center justify-center border-1 border-c3'
              style={{ backgroundColor: `${color}15` }}>
              <Icon size={12} style={{ color }} />
            </div>
            <span className='text-lg font-normal' style={{ color }}>
              {label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
