import React, { useState } from 'react';
import { Button } from '@heroui/react';
import { Splide, SplideSlide, SplideTrack } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import MediaViewer from '@/components/features/resource-links/MediaViewer';
import { ArrowIcon, MovieIcon } from '@/components/ui/icons';
import { carouselArrowButtonClass } from '@/components/ui/Carrousels';
import { getYouTubeThumbnailUrl, isValidYouTubeUrl } from '@/lib/utils';

interface PopupMediaGalleryProps {
  medias: string[];
}

export const PopupMediaGallery: React.FC<PopupMediaGalleryProps> = ({ medias }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!medias.length) return null;

  const currentMedia = medias[currentIndex];
  const isVideo =
    currentMedia?.includes('.mov') ||
    currentMedia?.includes('.mp4') ||
    isValidYouTubeUrl(currentMedia);

  return (
    <div className='flex flex-col gap-2.5 w-full'>
      <MediaViewer
        src={currentMedia}
        alt={`Média ${currentIndex + 1}`}
        className='w-full h-[280px] sm:h-[320px] rounded-xl overflow-hidden border-1 border-c3'
        isVideo={isVideo}
      />

      {medias.length > 1 && (
        <Splide
          options={{
            perPage: 3,
            gap: '0.75rem',
            pagination: false,
            perMove: 1,
            speed: 800,
            autoWidth: true,
          }}
          hasTrack={false}
          aria-label='Galerie de médias'
          className='flex w-full justify-between items-center gap-4'>
          <SplideTrack className='w-full min-w-0'>
            {medias.map((media, index) => {
              const isYouTube = isValidYouTubeUrl(media);
              const thumbnailSrc = isYouTube ? getYouTubeThumbnailUrl(media) : media;
              const isVideoFile = media.includes('.mov') || media.includes('.mp4');

              return (
                <SplideSlide key={`${media}-${index}`}>
                  <button
                    type='button'
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-[100px] h-[60px] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                      index === currentIndex ? 'border-2 border-c5' : 'border-2 border-transparent hover:border-c3'
                    }`}>
                    {isVideoFile ? (
                      <video src={media} className='w-full h-full object-cover' />
                    ) : isYouTube ? (
                      <div className='relative w-full h-full'>
                        <img src={thumbnailSrc} alt={`Miniature ${index + 1}`} className='w-full h-full object-cover' />
                        <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
                          <MovieIcon size={18} className='text-white' />
                        </div>
                      </div>
                    ) : (
                      <img src={thumbnailSrc} alt={`Miniature ${index + 1}`} className='w-full h-full object-cover' />
                    )}
                  </button>
                </SplideSlide>
              );
            })}
          </SplideTrack>
          <div className='flex shrink-0 justify-between items-center'>
            <div className='splide__arrows relative flex gap-2'>
              <Button
                isIconOnly
                className={`${carouselArrowButtonClass} splide__arrow--prev`}
                aria-label='Média précédent'>
                <ArrowIcon transform='rotate(180deg)' />
              </Button>
              <Button
                isIconOnly
                className={`${carouselArrowButtonClass} splide__arrow--next`}
                aria-label='Média suivant'>
                <ArrowIcon />
              </Button>
            </div>
          </div>
        </Splide>
      )}
    </div>
  );
};
