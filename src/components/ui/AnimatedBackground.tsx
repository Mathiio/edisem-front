import { motion } from 'framer-motion';
import { BackgroundEllipse } from '@/assets/svg/BackgroundEllipse';

interface AnimatedBackgroundProps {
  className?: string;
  opacity?: number;
  darkOpacity?: number;
  top?: string;
  color?: string;
  /** Facteur d'échelle (1 = taille d'origine). */
  scale?: number;
  /** Largeur max du SVG en px ou rem. */
  maxWidth?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  opacity = 25,
  top = '-50px',
  color,
  scale = 1,
  maxWidth = '100%',
}) => (
  <motion.div
    className={`absolute z-[-1] left-1/2 pointer-events-none ${className}`}
    style={{ top, maxWidth, width: '100%', transformOrigin: 'top center' }}
    initial={{ opacity: 0, x: '-50%', scale }}
    animate={{ opacity: 1, x: '-50%', scale }}
    transition={{ duration: 0.8, ease: 'easeIn' }}
  >
    <div style={{ opacity: opacity / 100 }} className='dark:opacity-25'>
      <BackgroundEllipse color={color} />
    </div>
  </motion.div>
);
