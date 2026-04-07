import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraIcon, UserIcon, ShareIcon, MovieIcon } from '@/components/ui/icons';
import { motion, Variants } from 'framer-motion';
import { addToast, Link, Button, cn, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Conference } from '@/types/ui';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 10 } },
};

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};

type ConfOverviewProps = {
  conf: Conference;
  currentTime: number;
  type?: string;
};

export const ConfOverviewCard: React.FC<ConfOverviewProps> = ({ conf, currentTime, type }) => {
  const [videoUrl, setVideoUrl] = useState<string>(conf.url);
  const [isShowingSession, setIsShowingSession] = useState<boolean>(false);
  const [buttonText, setButtonText] = useState<string>('séance complète');
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Remettre videoUrl à conf.url quand on change de conférence
  useEffect(() => {
    setIsShowingSession(false);
    setButtonText('séance complète');
    if (conf.url && typeof conf.url === 'string' && conf.url.trim() !== '') {
      try {
        const urlWithTimestamp = new URL(conf.url);
        urlWithTimestamp.searchParams.set('t', Date.now().toString());
        setVideoUrl(urlWithTimestamp.toString());
      } catch (urlError) {
        console.warn('Invalid URL provided:', conf.url, urlError);
        setVideoUrl('');
      }
    } else {
      setVideoUrl('');
    }
  }, [conf.url]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const message = JSON.stringify({ event: 'command', func: 'seekTo', args: [currentTime, true] });
      iframeRef.current.contentWindow.postMessage(message, '*');
    } else {
      console.log('❌ ConfOverviewCard - iframeRef ou contentWindow non disponible');
    }
  }, [currentTime]);

  useEffect(() => {
    if (videoUrl && videoUrl.trim() !== '') {
      try {
        const updatedUrl = new URL(videoUrl);
        updatedUrl.searchParams.set('enablejsapi', '1');
        setVideoUrl(updatedUrl.toString());
      } catch (urlError) {
        console.warn('Invalid video URL for jsapi:', videoUrl, urlError);
        // Si l'URL n'est pas valide, ne rien faire
      }
    }
  }, [videoUrl]);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      // Convertir en nombre si nécessaire
      const time = typeof currentTime === 'string' ? parseInt(currentTime, 10) : currentTime;

      const message = JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [time, true],
      });

      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, [currentTime]);

  const openActant = (id: string) => {
    navigate(`/intervenant/${id}`);
  };

  const changeLink = () => {
    if (!isShowingSession) {
      // Passer à la séance complète
      if (conf.fullUrl && typeof conf.fullUrl === 'string' && conf.fullUrl.trim() !== '') {
        setVideoUrl(conf.fullUrl);
        setIsShowingSession(true);
        setButtonText('conférence');
      } else {
        console.warn('Invalid fullUrl:', conf.fullUrl);
      }
    } else {
      // Revenir à la vidéo de la conférence
      if (conf.url && typeof conf.url === 'string' && conf.url.trim() !== '') {
        setVideoUrl(conf.url);
        setIsShowingSession(false);
        setButtonText('séance complète');
      } else {
        console.warn('Invalid url:', conf.url);
      }
    }
  };

  const copyToClipboard = () => {
    if (videoUrl && videoUrl.trim() !== '') {
      navigator.clipboard.writeText(videoUrl).then(() => {});
    }
  };

  return (
    <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
      <motion.div variants={itemVariants} className='rounded-xl lg:w-full overflow-hidden'>
        {videoUrl ? (
          <iframe
            ref={iframeRef}
            className='lg:w-[100%] lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px]'
            title='YouTube Video'
            width='100%'
            src={videoUrl}
            allowFullScreen></iframe>
        ) : (
          <UnloadedCard />
        )}
      </motion.div>
      <motion.div variants={itemVariants} className='w-full flex flex-col gap-6'>
        <div className='flex items-center gap-4'>
          <h1 className='font-medium text-c6 text-2xl'>{conf.title}</h1>
          {type && <span className='text-sm w-fit text-c5 px-2.5 py-1.5 bg-c2 rounded-lg border border-c3 whitespace-nowrap'>{type}</span>}
        </div>
        <div className='w-full flex flex-col gap-2.5'>
          <div className='w-full flex justify-between gap-2.5 items-center'>
            <div className='w-fit flex justify-start gap-2.5 items-center'>
              {/* Premier actant */}
              {conf.actant && Array.isArray(conf.actant) && conf.actant.length > 0 && (
                <Link className='w-fit flex justify-start gap-2.5 items-center cursor-pointer' onClick={() => openActant(conf.actant[0].id)}>
                  {conf.actant[0]?.picture ? (
                    <img src={conf.actant[0].picture} alt='Avatar' className='w-9 h-9 rounded-md object-cover' />
                  ) : (
                    <UserIcon size={22} className='text-default-500 hover:text-default-action hover:opacity-100 transition-all ease-in-out duration-200' />
                  )}
                  <div className='flex flex-col items-start gap-0.5'>
                    <h3 className='text-c6 font-medium text-base gap-2.5 transition-all ease-in-out duration-200'>
                      {conf.actant[0]?.firstname} {conf.actant[0]?.lastname}
                    </h3>
                    {conf.actant[0]?.jobTitle && Array.isArray(conf.actant[0].jobTitle) && conf.actant[0].jobTitle.length > 0 ? (
                      <p className='text-c4 font-normal text-sm gap-2.5 transition-all ease-in-out duration-200'>{conf.actant[0].jobTitle[0]?.title}</p>
                    ) : (
                      <p className='text-c4 font-normal text-sm gap-2.5 transition-all ease-in-out duration-200'>{String(conf.actant[0]?.universities?.[0] || '')}</p>
                    )}
                  </div>
                </Link>
              )}

              {conf.actant && Array.isArray(conf.actant) && conf.actant.length > 1 && (
                <Dropdown
                  classNames={{
                    content: 'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3',
                  }}>
                  <DropdownTrigger className='p-0'>
                    <Button
                      size='md'
                      className='text-base h-full min-h-[36px] px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 border-2 border-c4 bg-c1 hover:bg-c2 transition-all ease-in-out duration-200'>
                      <h3 className='text-c6 font-medium h-full text-sm gap-2.5 transition-all ease-in-out duration-200'>+{conf.actant.length - 1}</h3>
                    </Button>
                  </DropdownTrigger>

                  <DropdownMenu
                    aria-label='Autres intervenants'
                    className='p-2'
                    classNames={{ base: 'bg-transparent shadow-none border-0', list: 'bg-transparent' }}>
                    {conf.actant.slice(1).map((actant: any) => (
                      <DropdownItem
                        key={actant.id}
                        className='p-0 cursor-pointer rounded-lg bg-transparent data-[hover=true]:!bg-transparent data-[selectable=true]:focus:!bg-transparent'
                        onClick={() => openActant(actant.id)}>
                        <div className='flex items-center gap-4 w-full py-2 px-3 rounded-lg transition-all ease-in-out duration-200 hover:bg-c3 text-c6'>
                          {actant.picture ? (
                            <img src={actant.picture} alt='Avatar' className='w-9 h-9 rounded-md object-cover' />
                          ) : (
                            <UserIcon size={22} className='text-default-500 hover:text-default-action hover:opacity-100 transition-all ease-in-out duration-200' />
                          )}
                          <div className='flex flex-col items-start gap-0.5'>
                            <span className='text-base font-medium'>
                              {actant.firstname} {actant.lastname}
                            </span>
                            {actant.jobTitle && Array.isArray(actant.jobTitle) && actant.jobTitle.length > 0 ? (
                              <span className='text-sm text-c4 font-normal'>{actant.jobTitle[0]?.title}</span>
                            ) : (
                              <span className='text-sm text-c4 font-normal'>{String(actant.universities?.[0] || '')}</span>
                            )}
                          </div>
                        </div>
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>

            <div className='w-fit flex justify-between gap-2.5 items-center'>
              <Button
                className='hover:bg-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] h-fit cursor-pointer bg-c2 flex flex-row rounded-lg border-2 border-c3 items-center justify-center px-2.5 py-1.5 text-base gap-2.5 text-c6 transition-all ease-in-out duration-200'
                onClick={copyToClipboard}
                onPress={() => {
                  addToast({
                    title: 'Lien copié',
                    classNames: {
                      base: cn(['text-c6', 'mb-4']),
                      icon: 'w-6 h-6 fill-current text-c6',
                    },
                  });
                }}>
                <ShareIcon size={12} />
                Partager
              </Button>
              {conf.url &&
                conf.fullUrl &&
                typeof conf.url === 'string' &&
                typeof conf.fullUrl === 'string' &&
                conf.url.trim() !== '' &&
                conf.fullUrl.trim() !== '' &&
                conf.url !== conf.fullUrl && (
                  <Button
                    size='md'
                    className='hover:bg-c3 shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] h-fit cursor-pointer bg-c2 flex flex-row rounded-lg border-2 border-c3 items-center justify-center px-2.5 py-1.5 text-base gap-2.5 text-c6 transition-all ease-in-out duration-200'
                    onClick={changeLink}>
                    <MovieIcon size={12} />
                    {buttonText}
                  </Button>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const ConfOverviewSkeleton: React.FC = () => {
  return (
    <div className='w-full flex flex-col gap-6'>
      {/* Video skeleton */}
      <div className='rounded-xl lg:w-full h-[400px] bg-c2 animate-pulse' />
      
      {/* Content skeleton */}
      <div className='flex flex-col gap-5'>
        {/* Title skeleton */}
        <div className='flex flex-col gap-2.5'>
          <div className='w-[80%] h-8 bg-c2 rounded-lg animate-pulse' />
          <div className='w-[60%] h-8 bg-c2 rounded-lg animate-pulse' />
        </div>
        
        {/* Actant & buttons row skeleton */}
        <div className='flex justify-between items-center gap-2.5'>
          {/* Actant skeleton */}
          <div className='flex items-center gap-2.5'>
            <div className='w-9 h-9 bg-c2 rounded-lg animate-pulse' />
            <div className='flex flex-col gap-1.5'>
              <div className='w-32 h-4 bg-c2 rounded-lg animate-pulse' />
              <div className='w-24 h-3 bg-c2 rounded-lg animate-pulse' />
            </div>
          </div>
          
          {/* Buttons skeleton */}
          <div className='flex gap-2.5'>
            <div className='w-24 h-9 bg-c2 rounded-lg animate-pulse' />
            <div className='w-24 h-9 bg-c2 rounded-lg animate-pulse' />
          </div>
        </div>
      </div>
    </div>
  );
};

export const UnloadedCard: React.FC = () => {
  return (
    <div className='lg:w-[100%] lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] flex flex-col items-center justify-center p-5 bg-c3 rounded-xl gap-5'>
      <CameraIcon size={42} className='text-c4' />
      <div className='w-[80%] flex flex-col justify-center items-center gap-2.5'>
        <h2 className='text-c5 text-3xl font-medium'>Oups !</h2>
        <p className='w-[400px] text-c5 text-base text-regular text-center'>
          Aucune Image ou Vidéo n'est liée à ce contenu. Veuillez vérifier plus tard ou explorer d'autres sections de notre site.
        </p>
      </div>
    </div>
  );
};
