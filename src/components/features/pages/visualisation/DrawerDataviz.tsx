import { useState } from 'react';
import { SunIcon } from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';

export default function DrawerDataviz() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Bouton pour ouvrir */}
      <button onClick={toggleDrawer} className='p-2 rounded hover:bg-c2 transition z-50 relative'>
        <SunIcon className='w-6 h-6' />
      </button>

      {/* Overlay + Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className='fixed inset-0 bg-black/50 z-40'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleDrawer}
            />

            {/* Drawer */}
            <motion.div
              className='fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-c1 z-50 shadow-lg p-4'
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className='flex justify-between items-center mb-6'>
                <h2 className='text-lg font-bold'>Menu</h2>
                <button onClick={toggleDrawer} className='p-2 rounded hover:bg-c2 transition'>
                  <SunIcon className='w-px.5 h-px.5' />
                </button>
              </div>

              <nav className='flex flex-col gap-4'>
                <a href='#' className='hover:underline'>
                  Accueil
                </a>
                <a href='#' className='hover:underline'>
                  Profil
                </a>
                <a href='#' className='hover:underline'>
                  Paramètres
                </a>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
