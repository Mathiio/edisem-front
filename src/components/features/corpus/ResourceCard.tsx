import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSvgProps } from '@/types/ui';
import { ThumbnailIcon, UserIcon, SeminaireIcon } from '@/components/ui/icons';
import { getResourceAuthors, getResourceSubtitle, getSafeResourceUrl, getResourceThumbnail } from '@/lib/resourceUtils';
import { getRessourceLabel, getResourceIcon } from '@/config/resourceConfig';

export interface ResourceCardProps {
  title?: string;
  thumbnailUrl?: string;
  authors?: {
    name: string;
    picture?: string;
  }[];
  subtitle?: string; // For universities or extra date info
  date?: string;     // Explicit date line if needed (e.g. for Recits)
  
  type?: string;     // Standardized backend type key
  typeLabel?: string; // Manual override
  TypeIcon?: React.FC<IconSvgProps>; // Optional Override
  typeColor?: string; // Optional override color for the type icon
  
  className?: string;

  // Optional: Raw item to derive data from
  item?: any;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  title,
  thumbnailUrl,
  authors,
  subtitle,
  date,
  type,
  typeLabel,
  TypeIcon,
  typeColor,
  className = '',
  item
}) => {
  const navigate = useNavigate();

  // Derive data if item is provided and props are missing
  const finalTitle = title || item?.title || '';
  const finalThumbnail = thumbnailUrl || (item ? getResourceThumbnail(item) : '') || '';
  const finalAuthors = authors || (item ? getResourceAuthors(item) : []);
  const finalSubtitle = subtitle || (item ? getResourceSubtitle(item) : undefined);
  const finalType = type || item?.type;


  const finalTypeLabel = typeLabel || (finalType ? getRessourceLabel(finalType) : 'Ressource');
  
  // Determine Icon
  const FinalTypeIcon = TypeIcon || (finalType ? getResourceIcon(finalType) : SeminaireIcon) || SeminaireIcon;

  // Determine Click Handler
  const handleClick = () => {
      // 1. Try to get URL from item (most robust)
      if (item) {
          const url = getSafeResourceUrl(item);
          if (url && url !== '#') {
            navigate(url);
            return;
          }
      } 
      
      // 2. Fallback: construct from type and explicitly passed properties or item id
      // Since 'id' is not a prop, we check item.id from the optional item
      if (type && item?.id) {
           const url = getSafeResourceUrl({ type, id: item.id });
           if (url && url !== '#') {
             navigate(url);
             return;
           }
      }
      
      console.warn('Navigation impossible: ID manquant pour ce type', { type, item });
  };

  // Helper to format multiple authors
  const renderAuthorNames = () => {
    if (finalAuthors.length === 0) return 'Aucun intervenant';
    
    if (finalAuthors.length === 1) return finalAuthors[0].name || 'Nom inconnu';
    
    const displayAuthors = finalAuthors.slice(0, 3);
    const names = displayAuthors.map(a => {
        // Simple heuristic for "F. Lastname" or just name
        const parts = a.name.split(' ');
        if (parts.length > 1) {
             return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
        }
        return a.name;
    }).join(' - ');
    
    return finalAuthors.length > 3 ? `${names}...` : names;
  };

  const hasAuthors = finalAuthors.length > 0;

  return (
    <div
      onClick={handleClick}
      className={`group border-c3 border-2 cursor-pointer p-5 rounded-3xl justify-between flex flex-col gap-5 hover:bg-c3/50 bg-c2/50 h-full transition-all ease-in-out duration-300 relative ${className}`}
    >
      <div className="flex flex-col gap-2.5 justify-between">
        {/* Thumbnail */}
        <div
          className={`w-full aspect-[2/1] h-36 rounded-xl justify-center items-center flex overflow-hidden ${
            finalThumbnail ? 'bg-cover bg-center' : 'bg-gradient-to-br from-c2 to-c3'
          }`}
          style={finalThumbnail ? { backgroundImage: `url(${finalThumbnail})` } : {}}
        >
          {!finalThumbnail && (
             <ThumbnailIcon className="text-c4/20" size={40} />
          )}
        </div>

        {/* Content */}
        <div className='flex flex-col gap-2 w-full'>
          {/* Title & Optional Date */}
          <div className='flex flex-col gap-1.5 w-full'>
            <p className='text-base text-c6 font-medium overflow-hidden line-clamp-2 leading-[1.2]'>
              {finalTitle}
            </p>
            {date && <p className='text-xs text-c5 font-normal'>{date}</p>}
          </div>

          {/* Authors Section */}
          <div className='flex items-center gap-1.5'>
             {/* Avatars */}
             {hasAuthors ? (
                <div className='flex items-center relative'>
                   {finalAuthors.length === 1 ? (
                        <div className='w-7 h-7 rounded-lg overflow-hidden bg-c3 flex items-center justify-center'>
                           {finalAuthors[0].picture ? (
                               <img src={finalAuthors[0].picture} alt={finalAuthors[0].name} className='w-full h-full object-cover' />
                           ) : (
                               <UserIcon size={12} className='text-c4' />
                           )}
                        </div>
                   ) : (
                       <div className='w-7 h-7 rounded-lg bg-c3 flex items-center justify-center'>
                         <p className='text-xs font-bold text-c4'>+{finalAuthors.length}</p>
                       </div>
                   )}
                </div>
             ) : (
                <div className='h-7 w-7 min-w-7 min-h-7 shrink-0 rounded-lg bg-c3 flex items-center justify-center text-xs font-medium text-c1'>
                   <UserIcon size={12} className='text-c4' />
                </div>
             )}

             {/* Names & Subtitle */}
             <div className='flex flex-col gap-0.5 w-full'>
                <p className={`text-sm font-normal w-full line-clamp-1 ${hasAuthors ? 'text-c4' : 'text-c5'}`}>
                   {renderAuthorNames()}
                </p>
                {finalSubtitle && (
                   <p className='text-xs text-c5 font-normal w-full line-clamp-1'>
                     {finalSubtitle}
                   </p>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Footer Type Badge */}
      <div className="flex gap-1.5 items-center">
        <FinalTypeIcon size={14} className={typeColor ? "" : "text-c4/60"} style={typeColor ? { color: typeColor } : {}} />
        <p className='text-sm text-c4/60 font-medium'>{finalTypeLabel}</p>
      </div>

    </div>
  );
};

export const ResourceCardSkeleton: React.FC = () => {
    return (
      <div className='border-c3 border-2 p-5 rounded-3xl flex flex-col gap-5 h-full animate-pulse'>
        <div className="flex flex-col gap-2.5 justify-between">
          <div className="w-full aspect-[2/1] h-36 rounded-xl bg-c3/50" />
          <div className="flex flex-col gap-2 mt-2">
            {/* Title lines */}
            <div className="h-4 w-full bg-c3/50 rounded-lg" />
            <div className="h-4 w-3/4 bg-c3/50 rounded-lg" />
            
            {/* Author line */}
            <div className="flex items-center gap-3 mt-px">
              <div className="w-8 h-8 rounded-lg bg-c3/50" />
              <div className="h-6 w-2/4 bg-c3/50 rounded-md" />
            </div>
          </div>
        </div>
        
        {/* Footer badge */}
        <div className="flex items-center gap-2 mt-auto">
            <div className="w-4 h-4 rounded-md bg-c3/50" />
            <div className="h-4 w-2/4 bg-c3/50 rounded-md" />
        </div>
      </div>
    );
  };
