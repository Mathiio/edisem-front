import React from 'react';
import { cn } from '@heroui/react';
import { FileIcon, ImageIcon, ThumbnailIcon } from '@/components/ui/icons';

type EmptyStateIcon = 'thumbnail' | 'image' | 'file';

export interface EmptyStateCardProps {
  message: string;
  icon?: EmptyStateIcon;
  /** `media` = placeholder visuel (overview), `section` = état vide dans un onglet/liste */
  variant?: 'media' | 'section';
  iconSize?: number;
  iconClassName?: string;
  messageClassName?: string;
  className?: string;
}

const ICONS = {
  thumbnail: ThumbnailIcon,
  image: ImageIcon,
  file: FileIcon,
} as const;

const VARIANT_CLASSES = {
  media: 'lg:w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] flex flex-col items-center justify-center p-5 bg-c3 rounded-xl gap-5',
  section: 'w-full h-full flex flex-col justify-center items-center gap-5 mt-12',
} as const;

const DEFAULT_ICON_SIZE: Record<EmptyStateIcon, number> = {
  thumbnail: 36,
  image: 42,
  file: 36,
};

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  message,
  icon = 'file',
  variant = 'section',
  iconSize,
  iconClassName = 'text-c4',
  messageClassName = 'w-56 text-c5 text-base text-regular text-center',
  className,
}) => {
  const Icon = ICONS[icon];

  return (
    <div className={cn(VARIANT_CLASSES[variant], className)}>
      <Icon size={iconSize ?? DEFAULT_ICON_SIZE[icon]} className={iconClassName} />
      <p className={messageClassName}>{message}</p>
    </div>
  );
};
