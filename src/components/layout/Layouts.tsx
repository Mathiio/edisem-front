import React, { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion, Variants } from 'framer-motion';
import { useNavbarReadyContext } from '@/context/NavbarReadyContext';

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 15 },
  },
};

interface LayoutsProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  noPadding?: boolean;
  noFooter?: boolean;
}

export const Layouts: React.FC<LayoutsProps> = ({ children, className, fullWidth, noPadding, noFooter }) => {
  const navbarContext = useNavbarReadyContext();
  
  return (
    <div className={`relative bg-c1 overflow-x-hidden ${noFooter ? 'h-screen overflow-hidden' : ''}`}>
      <Navbar onReady={navbarContext?.onNavbarReady} />
      {fullWidth ? (
        <motion.main
          className={`w-full  overflow-hidden transition-all ease-in-out duration-200 ${noFooter ? 'h-[calc(100vh-80px)]' : ''}`}
          initial='hidden'
          animate='visible'
          variants={containerVariants}>
          <motion.div className={`${className} w-full h-full ${noPadding ? '' : 'p-6'}`} variants={itemVariants}>
            {children}
          </motion.div>
        </motion.main>
      ) : (
        <motion.main
          className={`mx-auto max-w-screen-2xl w-full grid grid-cols-10 xl:gap-20 gap-12 p-6 transition-all ease-in-out duration-200 ${noFooter ? 'h-[calc(100vh-80px)] overflow-hidden' : ''}`}
          initial='hidden'
          animate='visible'
          variants={containerVariants}>
          <motion.div className={className} variants={itemVariants}>
            {children}
          </motion.div>

          {!noFooter && (
            <motion.div className='col-span-10' variants={itemVariants}>
              <Footer />
            </motion.div>
          )}
        </motion.main>
      )}
    </div>
  );
};
