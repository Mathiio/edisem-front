import React, { useEffect, useRef } from 'react';
import { Button } from '@heroui/react';
import { ArrowIcon } from '@/components/ui/icons';
import { Splide, SplideSlide, SplideTrack } from '@splidejs/react-splide';
import type { Splide as SplideInstance } from '@splidejs/splide';
import '@splidejs/react-splide/css';

export const carouselArrowButtonClass =
  '!static !translate-y-0 !transform-none !left-auto !right-auto !top-auto !bottom-auto !opacity-100 ' +
  '!w-10 !h-10 !min-w-10 !min-h-10 !max-w-10 !max-h-10 !p-0 !rounded-xl !border-1 !border-c3 !bg-c2 !text-c6 ' +
  'splide__arrow !outline-none focus:!outline-none focus-visible:!outline-none !ring-0 focus:!ring-0 focus-visible:!ring-0 focus:!border-c3 focus-visible:!border-c3 hover:!bg-c3 ' +
  'focus:!shadow-none focus-visible:!shadow-none cursor-pointer text-base transition-colors ease-in-out duration-200 ' +
  '[&>svg]:!w-4 [&>svg]:!h-4 [&>svg]:shrink-0';

const CarouselArrows: React.FC = () => (
  <div className='splide__arrows relative flex gap-2 shrink-0'>
    <Button
      isIconOnly
      className={`${carouselArrowButtonClass} splide__arrow--prev`}
      aria-label='Slide precedente'>
      <ArrowIcon transform='rotate(180deg)' />
    </Button>
    <Button
      isIconOnly
      className={`${carouselArrowButtonClass} splide__arrow--next`}
      aria-label='Slide suivante'>
      <ArrowIcon />
    </Button>
  </div>
);

type FullCarrouselProps = {
  data: any[];
  title: string;
  perPage: number;
  perMove: number;
  renderSlide: (item: any, index: number) => React.ReactNode;
  getItemKey?: (item: any, index: number) => string | number;
  titleClassName?: string;
  gap?: string;
  ariaLabel?: string;
  className?: string;
  trackClassName?: string;
  /** Masque les flèches (ex. moins de slides que perPage) */
  hideArrows?: boolean;
  /** Recalcule les largeurs au montage / changement de data (modales) */
  refreshOnDataChange?: boolean;
};

export const FullCarrousel: React.FC<FullCarrouselProps> = ({
  data,
  title,
  perPage,
  perMove,
  renderSlide,
  getItemKey,
  titleClassName = 'text-2xl font-medium text-c6',
  gap = '1rem',
  ariaLabel,
  className = '',
  trackClassName = '',
  hideArrows = false,
  refreshOnDataChange = false,
}) => {
  const splideRef = useRef<SplideInstance | null>(null);

  useEffect(() => {
    if (!refreshOnDataChange) return;
    const frame = requestAnimationFrame(() => splideRef.current?.refresh());
    return () => cancelAnimationFrame(frame);
  }, [data.length, refreshOnDataChange]);

  return (
    <Splide
      ref={splideRef}
      onMounted={(splide: SplideInstance) => {
        splideRef.current = splide;
        if (refreshOnDataChange) splide.refresh();
      }}
      options={{ perPage, gap, pagination: false, perMove, speed: 1000 }}
      hasTrack={false}
      aria-label={ariaLabel ?? title}
      className={`flex flex-col w-full justify-center gap-5 ${className}`}>
      <div className='w-full flex justify-between items-center gap-3'>
        <h2 className={titleClassName}>{title}</h2>
        {!hideArrows && <CarouselArrows />}
      </div>
      <SplideTrack className={`w-full ${trackClassName}`}>
        {data.map((item, index) => (
          <SplideSlide key={getItemKey?.(item, index) ?? index} className='flex'>
            <div className='w-full min-w-0'>{renderSlide(item, index)}</div>
          </SplideSlide>
        ))}
      </SplideTrack>
    </Splide>
  );
};


type LongCarrouselProps = {
  data: any[];
  perPage: number;
  perMove: number;
  autowidth: boolean;
  renderSlide: (item: any, index: number) => React.ReactNode;
};

export const LongCarrousel: React.FC<LongCarrouselProps> = ({ data, autowidth, perPage, perMove, renderSlide }) => {
  return (
    <Splide
      options={{
        perPage: perPage,
        gap: '8px',
        pagination: false,
        perMove: perMove,
        speed: 1000,
        autoWidth: autowidth,
      }}
      hasTrack={false}
      aria-label='...'
      className='flex w-full justify-between items-center gap-6'>
      <SplideTrack className='w-full'>
        {data.map((item, index) => (
          <SplideSlide key={index}>{renderSlide(item, index)}</SplideSlide>
        ))}
      </SplideTrack>
      <div className=' flex justify-between items-center'>
        <div className='splide__arrows relative flex gap-2'>
          <Button
            isIconOnly
            className={`${carouselArrowButtonClass} splide__arrow--prev`}
            aria-label='Slide precedente'>
            <ArrowIcon transform='rotate(180deg)' />
          </Button>
          <Button
            isIconOnly
            className={`${carouselArrowButtonClass} splide__arrow--next`}
            aria-label='Slide suivante'>
            <ArrowIcon />
          </Button>
        </div>
      </div>
    </Splide>
  );
};

export const LongCarrouselFilter: React.FC<LongCarrouselProps> = ({
  data,
  autowidth,
  perPage,
  perMove,
  renderSlide,
}) => {
  return (
    <Splide
      options={{
        perPage: perPage,
        gap: '8px',
        pagination: false,
        perMove: perMove,
        autoWidth: autowidth,
        rewind: true,
      }}
      hasTrack={false}
      aria-label='...'
      className='flex w-full justify-between items-center gap-2'>
      <div className='hidden justify-between items-center'>
        <div className='splide__arrows relative flex gap-2'>
          <Button
            isIconOnly
            className={`${carouselArrowButtonClass} splide__arrow--prev`}
            aria-label='Slide precedente'>
            <ArrowIcon transform='rotate(180deg)' />
          </Button>
        </div>
      </div>
      <SplideTrack className='w-full'>
        {data.map((item, index) => (
          <SplideSlide key={index}>{renderSlide(item, index)}</SplideSlide>
        ))}
      </SplideTrack>
      <div className=' flex justify-between items-center'>
        <div className='splide__arrows relative flex gap-2'>
          <Button isIconOnly className={`${carouselArrowButtonClass} splide__arrow--next`} aria-label='Slide suivante'>
            <ArrowIcon />
          </Button>
        </div>
      </div>
    </Splide>
  );
};
