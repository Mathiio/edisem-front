import { ReactNode } from 'react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

interface Stat {
  label: string;
  value: number;
}

interface PageBannerProps {
  icon?: ReactNode;
  title: string | ReactNode;
  description: string | ReactNode;
  stats?: Stat[];
  className?: string;
  edition?: boolean;
  backgroundScale?: number;
  backgroundMaxWidth?: string;
  backgroundClassName?: string;
}

export const PageBanner = ({
  icon,
  title,
  description,
  stats = [],
  className = '',
  edition = false,
  backgroundScale = 1,
  backgroundMaxWidth = '100%',
  backgroundClassName = '',
}: PageBannerProps) => {
  const paddingClass = edition ? 'py-[10px]' : 'pt-18';

  return (
    <div className={`${paddingClass} justify-center flex items-center flex-col gap-5 relative ${className}`}>
      <div className='gap-5 justify-between flex items-center flex-col'>
        {/* Icon */}
        {icon && <div className='text-c4'>{icon}</div>}

        {/* Description + Stats */}
        <div className='flex flex-col gap-3 justify-center items-center'>

          {/* Title */}
          <h1 className='z-[12] text-5xl text-c6 font-medium flex flex-col items-center text-center'>{title}</h1>
        
          {/* Description */}
          <p className='text-c5 text-base z-[12] text-center max-w-[600px]'>{description}</p>

          {/* Stats */}
          {stats.length > 0 && (
            <div className='flex gap-5 z-[12] flex-wrap justify-center'>
              {stats.map((stat, index) => (
                <StatCard key={index} label={stat.label} value={stat.value} />
              ))}
            </div>
          )}
        </div>

        {/* Animated Background */}
        <AnimatedBackground
          scale={backgroundScale}
          maxWidth={backgroundMaxWidth}
          className={backgroundClassName}
          color={edition ? '#FF191D' : undefined}
        />
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className='flex border-1 border-c4/40 rounded-lg py-2 px-4'>
    <p className='text-sm text-c5'>
      {value} {label}
    </p>
  </div>
);
