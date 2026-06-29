import React, { useState, useEffect, useRef } from 'react';
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

const MediaViewer: React.FC<MediaViewerProps> = ({ src, alt = 'Media', className = '', isVideo = false, seekTo: seekToObj }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [objectFit, setObjectFit] = useState<'cover' | 'contain'>('cover');
  const [showControls, setShowControls] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // Déterminer le type de média
  const mediaData = typeof src === 'string'
    ? {
        url: src,
        thumbnail: (src.includes('youtube.com') || src.includes('youtu.be')) ? getYouTubeThumbnailUrl(src) : src
      }
    : src;
  const isYouTube = mediaData.url && (mediaData.url.includes('youtube.com') || mediaData.url.includes('youtu.be'));
  const youtubeVideoId = isYouTube ? getYouTubeVideoId(mediaData.url!) : null;

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleObjectFit = () => {
    setObjectFit(objectFit === 'cover' ? 'contain' : 'cover');
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    // Fermer le plein écran seulement si on clique sur le backdrop (pas sur l'image)
    if (event.target === event.currentTarget) {
      setIsFullscreen(false);
    }
  };

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

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-black bg-opacity-80 backdrop-blur-[16px] flex items-center justify-center p-4 animate-in fade-in duration-300'
    : `relative ${className}`;

  const mediaWrapperClasses = isFullscreen ? ' flex justify-center max-w-[90vw] items-center max-h-[90vh]' : 'relative w-full h-full';

  const mediaClasses = `transition-all duration-500 ease-out transform ${
    isFullscreen
      ? `rounded-12 shadow-2xl ${objectFit === 'cover' ? 'object-cover w-full h-full' : 'object-contain'} animate-in zoom-in-95 duration-300`
      : `w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`
  }`;

  // Style pour l'effet d'ombre sur les icônes
  const iconShadowStyle = {
    filter: 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.8))',
    WebkitFilter: 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.8))',
  };

  // Render YouTube player
  const renderYouTubePlayer = () => {
    if (!youtubeVideoId) return null;

    const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&rel=0&enablejsapi=1`;

    return (
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className={`${mediaClasses} rounded-12`}
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        title={alt}
      />
    );
  };

  return (
    <div
      className={containerClasses}
      onMouseEnter={() => !isYouTube && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={isFullscreen ? handleBackdropClick : undefined}>
      {/* Wrapper pour le média et les contrôles associés */}
      <div className={mediaWrapperClasses}>
        {/* Média principal */}
        {isYouTube ? (
          renderYouTubePlayer()
        ) : isVideo ? (
          <video src={typeof src === 'string' ? src : mediaData.url} controls className={mediaClasses} />
        ) : (
          <img src={typeof src === 'string' ? src : mediaData.thumbnail || mediaData.url} alt={alt} className={mediaClasses} />
        )}

        {/* Contrôles en bas à droite de l'IMAGE (pas pour YouTube) */}
        {!isYouTube && (
          <div
            className={`absolute bottom-4 right-4 flex items-center gap-10 bg-[#000] bg-opacity-30 backdrop-blur-[16px] rounded-12 px-3 py-2 transition-all duration-300 ease-out z-10 transform ${
              showControls ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
            }`}>
            <div className='flex gap-1'>
              {/* Bouton mode d'affichage */}
              {!isFullscreen && (
                <button
                  onClick={toggleObjectFit}
                  className='text-[#fff] p-2 rounded-12 hover:bg-[#fff] hover:bg-opacity-20 transition-all duration-200'
                  title={objectFit === 'cover' ? 'Mode Contain (ajuster)' : 'Mode Cover (remplir)'}>
                  <div style={iconShadowStyle}>{objectFit === 'cover' ? <MinimizeIcon size={20} /> : <SquareIcon size={20} />}</div>
                </button>
              )}

              {/* Bouton plein écran */}
              <button
                onClick={toggleFullscreen}
                className='text-[#fff] p-2 rounded-12 hover:bg-[#fff] hover:bg-opacity-20 transition-all duration-200'
                title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}>
                <div style={iconShadowStyle}>{isFullscreen ? <GalleryIcon size={20} /> : <MaximizeIcon size={20} />}</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewer;
