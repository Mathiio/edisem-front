import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { IconSvgProps } from '@/types/ui';

export interface CorpusNavCardData {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<IconSvgProps>;
  color?: string;
}

interface CorpusNavCardProps {
  card: CorpusNavCardData;
  index?: number;
  testId?: string;
}

export const CorpusNavCard = ({ card, index = 0, testId }: CorpusNavCardProps) => {
  const navigate = useNavigate();
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.2 }}
      onClick={() => navigate(card.path)}
      data-testid={testId}
      className='border-c3 border-2 cursor-pointer p-8 rounded-3xl justify-between flex flex-col gap-6 bg-c1 hover:bg-c2/80 h-full transition-all ease-in-out duration-200'
    >
      <Icon
        size={40}
        className={card.color ? undefined : 'text-c6'}
        style={card.color ? { color: card.color } : undefined}
      />
      <div className='flex flex-col gap-1'>
        <p className='text-3xl font-medium text-c6'>{card.title}</p>
        <p className='text-base text-c5 font-normal'>{card.description}</p>
      </div>
    </motion.div>
  );
};
