import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbnailIcon, UserIcon } from '@/components/ui/icons';
import { getResourceAuthors, getResourceSubtitle, getResourceThumbnail, navigateToResource } from '@/lib/resourceUtils';

export interface WideResourceCardProps {
  title?: string;
  thumbnailUrl?: string;
  authors?: {
    name: string;
    picture?: string;
  }[];
  subtitle?: string; 
  date?: string;     
  
  type?: string;     
  className?: string;

  // Optional: Raw item to derive data from
  item?: any;
}

export const WideResourceCard: React.FC<WideResourceCardProps> = ({
  title,
  thumbnailUrl,
  authors,
  subtitle,
  date,
  type,
  className = '',
  item
}) => {
  const navigate = useNavigate();

  // Derive data
  const finalTitle = title || item?.title || '';
  const finalThumbnail = thumbnailUrl || (item ? getResourceThumbnail(item) : '') || '';
  const finalAuthors = authors || (item ? getResourceAuthors(item) : []);
  const finalSubtitle = subtitle || (item ? getResourceSubtitle(item) : undefined);
  // const finalType = type || item?.type; // finalType is also unused if we remove the label/icon usage below


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

  const handleClick = () => {
    const payload = item ?? (type && item?.id ? { type, id: item.id } : null);
    if (!payload) return;
    if (!navigateToResource(payload, navigate)) {
      console.warn('Navigation impossible', { type, item });
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group w-full shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 cursor-pointer p-5 rounded-2xl hover:bg-c2/80 cursor-pointer rounded-xl flex items-stretch gap-6 transition-all duration-300 relative ${className}`}
    >
      {/* Thumbnail (Left) - Fixed Width */}
      <div className="w-[180px] shrink-0">
        <div
          className={`w-full h-full min-h-[80px] rounded-lg overflow-hidden flex items-center justify-center ${
            finalThumbnail ? 'bg-cover bg-center' : 'bg-c3'
          }`}
          style={finalThumbnail ? { backgroundImage: `url(${finalThumbnail})` } : {}}
        >
          {!finalThumbnail && <ThumbnailIcon className="text-c4/40" size={32} />}
        </div>
      </div>

      {/* Content (Right) */}
        
        {/* Bottom Section - Authors */}
        <div className="flex flex-col items-start gap-4 w-full">
          <h3 className="text-base font-regular text-c6 line-clamp-2 leading-tight">
            {finalTitle}
          </h3>
          
           {/* Authors Section */}
           <div className='flex items-center gap-3 w-full'>
             {/* Avatars */}
             {hasAuthors ? (
                <div className='flex items-center relative shrink-0'>
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
                <div className='h-6 w-6 rounded-md bg-c3 flex items-center justify-center text-xs font-medium text-c1 shrink-0'>
                   <UserIcon size={12} className='text-c4' />
                </div>
             )}

             {/* Names & Subtitle */}
             <div className='flex flex-col gap-0.5 w-full min-w-0'>
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
            
           {date && (
             <p className="text-xs text-c6">{date}</p>
           )}
        </div>

    </div>
  );
};
