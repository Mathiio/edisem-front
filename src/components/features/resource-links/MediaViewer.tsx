import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MaximizeIcon, MinimizeIcon, SquareIcon, GalleryIcon } from '@/components/ui/icons';
import { getYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/utils';

interface MediaViewerProps {
  src: string | { url?: string; thumbnail?: string }; // Support pour objet avec URL YouTube
  alt?: string;
  className?: string;
  isVideo?: boolean;
  /** Objet seek avec temps et ID unique pour forcer le re-render même pour le même temps */
  seekTo?: { time: number; id: number };
}

type MediaSize = { width: number; height: number };

const computeContainFrameSize = (naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number): MediaSize => {
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  };
};

const MediaViewer: React.FC<MediaViewerProps> = ({ src, alt = 'Media', className = '', isVideo = false, seekTo: seekToObj }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [objectFit, setObjectFit] = useState<'cover' | 'contain'>('cover');
  const [showControls, setShowControls] = useState(false);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const mediaUrl = typeof src === 'string' ? src : src.url ?? src.thumbnail ?? '';
  const mediaData = typeof src === 'string'
    ? {
        url: src,
        thumbnail: (src.includes('youtube.com') || src.includes('youtu.be')) ? getYouTubeThumbnailUrl(src) : src,
      }
    : src;
  const isYouTube = mediaData.url && (mediaData.url.includes('youtube.com') || mediaData.url.includes('youtu.be'));
  const youtubeVideoId = isYouTube ? getYouTubeVideoId(mediaData.url!) : null;

  const hugMediaFrame = isFullscreen || objectFit === 'contain';

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleObjectFit = () => {
    setObjectFit(objectFit === 'cover' ? 'contain' : 'cover');
  };

  const handleMediaLoad = (event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
    const element = event.currentTarget;
    const width = 'videoWidth' in element ? element.videoWidth : element.naturalWidth;
    const height = 'videoHeight' in element ? element.videoHeight : element.naturalHeight;
    if (width > 0 && height > 0) {
      setMediaSize({ width, height });
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    setMediaSize(null);
  }, [mediaUrl]);

  useEffect(() => {
    if (!isFullscreen) return;

    const onResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isFullscreen]);

  // Gestion de la touche Échap pour sortir du plein écran
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  // Écouter le message "onReady" du player YouTube pour savoir quand il est prêt
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'onReady' || data.info?.playerState !== undefined) {
          setPlayerReady(true);
        }
      } catch {
        // Ignorer les messages non-JSON
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Envoyer seekTo au player YouTube quand seekToObj change
  useEffect(() => {
    if (!seekToObj || !youtubeVideoId) return;

    if (playerReady && iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow;
      win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekToObj.time, true] }), '*');
      win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    } else if (iframeRef.current) {
      iframeRef.current.src = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&enablejsapi=1&start=${Math.floor(seekToObj.time)}`;
    }
  }, [seekToObj, playerReady, youtubeVideoId]);

  const frameStyle: React.CSSProperties | undefined =
    hugMediaFrame && mediaSize
      ? isFullscreen
        ? computeContainFrameSize(mediaSize.width, mediaSize.height, viewportSize.width * 0.9, viewportSize.height * 0.9)
        : {
            aspectRatio: `${mediaSize.width} / ${mediaSize.height}`,
            maxWidth: '100%',
            maxHeight: '100%',
          }
      : undefined;

  const mediaWrapperClasses = [
    'relative overflow-hidden rounded-xl border-2 shrink-0',
    isFullscreen ? 'border-c4 shadow-2xl' : 'border-c3',
    hugMediaFrame ? 'w-auto h-auto max-w-full max-h-full' : 'w-full h-full bg-c2 flex items-center justify-center',
  ].join(' ');

  const mediaClasses = hugMediaFrame
    ? 'block w-full h-full'
    : `w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`;

  const renderYouTubePlayer = () => {
    if (!youtubeVideoId) return null;

    const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&rel=0&enablejsapi=1`;

    return (
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className={`${mediaClasses} rounded-xl`}
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        title={alt}
      />
    );
  };

  const renderMediaFrame = () => (
    <div className={mediaWrapperClasses} style={frameStyle}>
      {isYouTube ? (
        renderYouTubePlayer()
      ) : isVideo ? (
        <video
          src={typeof src === 'string' ? src : mediaData.url}
          controls
          className={mediaClasses}
          onLoadedMetadata={handleMediaLoad}
        />
      ) : (
        <img
          src={typeof src === 'string' ? src : mediaData.thumbnail || mediaData.url}
          alt={alt}
          className={mediaClasses}
          onLoad={handleMediaLoad}
        />
      )}

      {!isYouTube && (
        <div
          className={[
            'absolute bottom-3 right-3 z-10',
            'flex items-center gap-1 p-1',
            'rounded-xl border-2 border-c3 bg-c2',
            'transition-all duration-200 ease-out',
            isFullscreen || showControls
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-1 pointer-events-none',
          ].join(' ')}>
          {!isFullscreen && (
            <button
              type='button'
              onClick={toggleObjectFit}
              className='flex items-center justify-center w-9 h-9 rounded-lg text-c6 cursor-pointer hover:bg-c3 transition-colors duration-200'
              title={objectFit === 'cover' ? 'Mode Contain (ajuster)' : 'Mode Cover (remplir)'}>
              {objectFit === 'cover' ? <MinimizeIcon size={18} /> : <SquareIcon size={18} />}
            </button>
          )}

          <button
            type='button'
            onClick={toggleFullscreen}
            className='flex items-center justify-center w-9 h-9 rounded-lg text-c6 cursor-pointer hover:bg-c3 transition-colors duration-200'
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}>
            {isFullscreen ? <GalleryIcon size={18} /> : <MaximizeIcon size={18} />}
          </button>
        </div>
      )}
    </div>
  );

  const inlineContainerClass = [
    'relative',
    className,
    !isFullscreen && hugMediaFrame ? 'flex items-center justify-center' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const fullscreenOverlay = isFullscreen
    ? createPortal(
        <div
          className='fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4'
          onClick={handleBackdropClick}
          onMouseEnter={() => !isYouTube && setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}>
          {renderMediaFrame()}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        className={inlineContainerClass}
        onMouseEnter={() => !isYouTube && !isFullscreen && setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}>
        {!isFullscreen && renderMediaFrame()}
      </div>
      {fullscreenOverlay}
    </>
  );
};

export default MediaViewer;
