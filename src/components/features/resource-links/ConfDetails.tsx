import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Conference } from '@/types/ui';
import { formatDate } from '@/lib/utils';


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

type ConfDetailsProps = {
    conf: Conference;
};


export const ConfDetailsCard: React.FC<ConfDetailsProps> = ({ conf }) => {
    const [expanded, setExpanded] = useState<boolean>(false);

    const toggleExpansion = () => {
        setExpanded(!expanded);
    };

    const formattedDate = formatDate(conf.date);
    const editionText = `Édition ${conf.season} ${conf.date.split('-')[0]}`;

    // Check if there's any content to display
    const hasContent = formattedDate || editionText || conf.description;

    // Don't render if there's no content
    if (!hasContent) {
        return null;
    }

  return (
    <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
      <motion.div
        variants={itemVariants}
        className='cursor-pointer flex flex-col bg-c2 hover:bg-c3 p-6 rounded-lg gap-2.5 transition-all ease-in-out duration-200'
        onClick={toggleExpansion}>
        <h3 className='text-base text-c5 font-medium'>{formattedDate} - {editionText}</h3>
        <p
          className={`text-base text-c4 font-normal transition-all ease-in-out duration-200 gap-2.5 ${expanded ? '' : 'line-clamp-3'}`}
          style={{ lineHeight: '120%' }}>
          {conf.description}
        </p>
        <p className='text-base text-c5 font-medium transition-all ease-in-out duration-200'>
          {expanded ? 'affichez moins' : '...affichez plus'}
        </p>
      </motion.div>
    </motion.div>
  );
};



export const ConfDetailsSkeleton: React.FC = () => {
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