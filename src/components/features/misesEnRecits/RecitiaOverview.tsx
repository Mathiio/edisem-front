import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CameraIcon, UserIcon, ShareIcon, MovieIcon, ArrowIcon, SettingsIcon } from '@/components/ui/icons';
import { motion, Variants } from 'framer-motion';
import { addToast, Skeleton, Button, cn, DropdownMenu, Dropdown, DropdownItem, DropdownTrigger } from '@heroui/react';
import { Splide, SplideTrack, SplideSlide } from '@splidejs/react-splide';
import MediaViewer from '../conference/MediaViewer';
import { getYouTubeThumbnailUrl } from '@/lib/utils';

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

type RecitiaOverviewProps = {
  id: number;
  title: string;
  personnes: any;
  credits?: string | string[];
  medias: (string | { id?: number; title?: string; url?: string; thumbnail?: string })[]; // Tableau de liens d'images ou objets média
  fullUrl: string;
  currentTime: number;
  buttonText: string;
  type?: string;
};

export const RecitiaOverviewCard: React.FC<RecitiaOverviewProps> = ({ id: _id, title, personnes, medias, fullUrl, buttonText, credits, type }) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);

  const navigate = useNavigate();

  const openPersonne = (id: number) => {
    navigate(`/personne/${id}`);
  };

  const copyToClipboard = () => {
    // Copie l'image actuellement affichée
    if (medias && medias[currentMediaIndex]) {
      const currentMedia = medias[currentMediaIndex];
      const urlToCopy = typeof currentMedia === 'string' ? currentMedia : currentMedia.url || currentMedia.thumbnail || '';
      navigator.clipboard.writeText(urlToCopy).then(() => {});
    }
  };

  return (
    <motion.div className='w-full flex flex-col gap-6' initial='hidden' animate='visible' variants={containerVariants}>
      <motion.div variants={itemVariants} className=' lg:w-full overflow-hidden relative'>
        {medias && medias.length > 0 ? (
          <div className='flex flex-col gap-2.5'>
            <MediaViewer
              src={medias[currentMediaIndex]}
              alt={`Média ${currentMediaIndex + 1}`}
              className='lg:w-[100%] lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px] rounded-xl overflow-hidden'
              isVideo={(() => {
                const currentMedia = medias[currentMediaIndex];
                if (typeof currentMedia === 'string') {
                  return currentMedia.includes('.mov');
                }
                if (typeof currentMedia === 'object' && currentMedia !== null && 'url' in currentMedia) {
                  return currentMedia.url?.includes('.mov');
                }
                return false;
              })()}
            />
            {medias.length > 1 && (
              <Splide
                options={{
                  perPage: 3,
                  gap: '1rem',
                  pagination: false,
                  perMove: 1,
                  speed: 1000,
                  autoWidth: true,
                }}
                hasTrack={false}
                aria-label='...'
                className='flex w-full justify-between items-center gap-6'>
                <SplideTrack className='w-full'>
                  {medias.map((media, index) => {
                    // Obtenir la thumbnail appropriée
                    let thumbnailSrc = '';
                    let isYouTubeVideo = false;

                    if (typeof media === 'string') {
                      // Si c'est une string qui contient une URL YouTube, générer la thumbnail
                      if (media.includes('youtube.com') || media.includes('youtu.be')) {
                        thumbnailSrc = getYouTubeThumbnailUrl(media);
                        isYouTubeVideo = true;
                      } else {
                        // Sinon utiliser directement comme thumbnail (URL d'image)
                        thumbnailSrc = media;
                      }
                    } else {
                      // Si c'est une URL YouTube, générer la thumbnail YouTube
                      if (media.url && (media.url.includes('youtube.com') || media.url.includes('youtu.be'))) {
                        thumbnailSrc = getYouTubeThumbnailUrl(media.url);
                        isYouTubeVideo = true;
                      } else {
                        thumbnailSrc = media.thumbnail || media.url || '';
                      }
                    }

                    return (
                      <SplideSlide key={index}>
                        <button
                          onClick={() => setCurrentMediaIndex(index)}
                          className={`flex-shrink-0 w-[136px] h-[60px] rounded-xl overflow-hidden transition-all duration-200 ${
                            index === currentMediaIndex ? 'border-2 border-c6' : 'border-2 border-transparent hover:border-gray-300'
                          }`}>
                          <div className='relative w-full h-full'>
                            {typeof media === 'string' && media.includes('.mov') ? (
                              <video src={media} className='w-full h-full object-cover' />
                            ) : (
                              <img src={thumbnailSrc} alt={`Miniature ${index + 1}`} className='w-full h-full object-cover' />
                            )}
                            {/* Icône vidéo pour les vidéos YouTube */}
                            {isYouTubeVideo && (
                              <div className='absolute bottom-2 right-2'>
                                <MovieIcon size={16} className='text-c6 drop-shadow-lg' />
                              </div>
                            )}
                          </div>
                        </button>
                      </SplideSlide>
                    );
                  })}
                </SplideTrack>
                <div className=' flex justify-between items-center'>
                  <div className='splide__arrows relative flex gap-2.5'>
                    <Button
                      size='sm'
                      className='p-0 min-w-[32px] min-h-[32px] text-selected bg-action splide__arrow transform translate-y-0 splide__arrow--prev relative left-0 focus:outline-none'>
                      <ArrowIcon size={20} transform='rotate(180deg)' />
                    </Button>
                    <Button
                      size='sm'
                      className='p-0 min-w-[32px] min-h-[32px] text-selected bg-action splide__arrow transform translate-y-0 splide__arrow--next relative right-0 focus:outline-none'>
                      <ArrowIcon size={20} />
                    </Button>
                  </div>
                </div>
              </Splide>
            )}
          </div>
        ) : (
          <UnloadedCard />
        )}
      </motion.div>

      <motion.div variants={itemVariants} className={`w-full flex flex-col ${!Array.isArray(personnes) ? 'gap-0' : 'gap-6'}`}>
        <div className='flex items-center gap-4 justify-between'>
          <div className='flex items-center gap-4'>
            <h1 className='font-medium text-c6 text-2xl'>{title}</h1>
            {type && <span className='text-sm w-fit text-c5 px-2.5 py-1.5 bg-c2 rounded-lg border border-c3 whitespace-nowrap'>{type}</span>}
          </div>
          {(!Array.isArray(personnes) || personnes.length === 0) && (
            <div className='w-fit flex justify-between gap-2.5 items-center'>
              <Button
                size='md'
                className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
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

              {fullUrl !== '' ||
                fullUrl !== null ||
                (fullUrl !== undefined && (
                  <Button
                    size='md'
                    className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
                    onClick={() => window.open(fullUrl, '_blank')}>
                    <MovieIcon size={12} />
                    {buttonText}
                  </Button>
                ))}

              {((Array.isArray(credits) && credits.length > 0) || (typeof credits === 'string' && credits.trim() !== '')) && (
                <Button
                  size='md'
                  className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
                  onClick={() => {
                    if (typeof credits === 'string') {
                      window.open(credits, '_blank');
                    } else if (Array.isArray(credits) && credits.length > 0) {
                      const url = credits[0];
                      if (typeof url === 'string') {
                        window.open(url, '_blank');
                      }
                    }
                  }}>
                  <SettingsIcon size={12} />
                  Crédits complets
                </Button>
              )}
            </div>
          )}
        </div>
        <div className='w-full flex flex-col gap-2.5'>
          <div className='w-full flex justify-between gap-2.5 items-center'>
            <div className='w-fit flex justify-start gap-2.5 items-center'>
              {Array.isArray(personnes) && personnes.length > 0 && (
                personnes[0]?.id != null ? (
                  <Link to={`/personne/${personnes[0].id}`} className='w-fit flex justify-start gap-2.5 items-center'>
                    {personnes[0]?.picture ? (
                      <img src={personnes[0].picture} alt='Avatar' className='w-9 h-9 rounded-md object-cover' />
                    ) : (
                      <UserIcon size={22} className='text-default-500 hover:text-default-action hover:opacity-100 transition-all ease-in-out duration-200' />
                    )}
                      <div className='flex flex-col items-start gap-0.5'>
                        <h3 className='text-c6 font-medium text-base gap-2.5 transition-all ease-in-out duration-200'>{personnes[0]?.name}</h3>
                        {(personnes[0]?.role || (personnes[0]?.jobTitle && Array.isArray(personnes[0].jobTitle) && personnes[0].jobTitle.length > 0)) && (
                          <p className='text-c4 font-normal text-sm'>{personnes[0].role || personnes[0].jobTitle[0]?.title}</p>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className='w-fit flex justify-start gap-2.5 items-center'>
                      {personnes[0]?.picture ? (
                        <img src={personnes[0].picture} alt='Avatar' className='w-9 h-9 rounded-md object-cover' />
                      ) : (
                        <UserIcon size={22} className='text-default-500 hover:text-default-action hover:opacity-100 transition-all ease-in-out duration-200' />
                      )}
                      <div className='flex flex-col items-start gap-0.5'>
                        <h3 className='text-c6 font-medium text-base gap-2.5 transition-all ease-in-out duration-200'>{personnes[0]?.name}</h3>
                        {(personnes[0]?.role || (personnes[0]?.jobTitle && Array.isArray(personnes[0].jobTitle) && personnes[0].jobTitle.length > 0)) && (
                          <p className='text-c4 font-normal text-sm'>{personnes[0].role || personnes[0].jobTitle[0]?.title}</p>
                        )}
                      </div>
                    </div>
                  )
                )}
                {Array.isArray(personnes) && personnes.length > 1 && (
                  <Dropdown
                    classNames={{
                      content:
                        'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3 min-w-[240px]',
                    }}>
                    <DropdownTrigger className='p-0'>
                      <Button
                        size='md'
                        className='text-base h-full min-h-[36px]  px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 border-2 border-c6 bg-c1 hover:bg-c2 transition-all ease-in-out duration-200'>
                        <h3 className='text-c6 font-medium h-full text-sm gap-2.5 transition-all ease-in-out duration-200'>+ {personnes.length - 1}</h3>
                      </Button>
                    </DropdownTrigger>

                    <DropdownMenu
                      aria-label='View options'
                      className='p-2'
                      classNames={{
                        base: 'bg-transparent shadow-none border-0',
                        list: 'bg-transparent',
                      }}>
                      {Array.isArray(personnes) && personnes.length > 1
                        ? personnes.slice(1).map((option: any, index: number) => (
                            <DropdownItem
                              key={option.id || `person-${index}`}
                              className='p-0 cursor-pointer rounded-lg bg-transparent data-[hover=true]:!bg-transparent data-[selectable=true]:focus:!bg-transparent'
                              onClick={() => option.id != null && openPersonne(option.id)}
                              isDisabled={option.id == null}>
                              <div className='flex items-center gap-4 w-full py-2 px-3 rounded-lg transition-all ease-in-out duration-200 hover:bg-c3 text-c6'>
                                {option.picture ? (
                                  <img src={option.picture} alt='Avatar' className='w-9 h-9 rounded-md object-cover' />
                                ) : (
                                  <UserIcon size={22} className='text-default-500 hover:text-default-action hover:opacity-100 transition-all ease-in-out duration-200' />
                                )}
                                <div className='flex flex-col items-start gap-0.5'>
                                  <span className='text-base'>{option.name}</span>
                                  {(option.role || (option.jobTitle && Array.isArray(option.jobTitle) && option.jobTitle.length > 0)) && (
                                    <span className='text-sm text-c4 font-normal'>{option.role || option.jobTitle[0]?.title}</span>
                                  )}
                                </div>
                              </div>
                            </DropdownItem>
                          ))
                        : null}
                    </DropdownMenu>
                  </Dropdown>
              )}
            </div>

            {Array.isArray(personnes) && personnes.length > 0 && (
              <div className='w-fit flex justify-between gap-2.5 items-center'>
                <Button
                  size='md'
                  className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
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

                {fullUrl !== '' && (
                  <Button
                    size='md'
                    className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
                    onClick={() => window.open(fullUrl, '_blank')}>
                    <MovieIcon size={12} />
                    {buttonText}
                  </Button>
                )}

                {((Array.isArray(credits) && credits.length > 0) || (typeof credits === 'string' && credits.trim() !== '')) && (
                  <Button
                    size='md'
                    className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
                    onClick={() => {
                      if (typeof credits === 'string') {
                        window.open(credits, '_blank');
                      } else if (Array.isArray(credits) && credits.length > 0) {
                        const url = credits[0];
                        if (typeof url === 'string') {
                          window.open(url, '_blank');
                        }
                      }
                    }}>
                    <SettingsIcon size={12} />
                    Crédits complets
                  </Button>
                )}
                </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const RecitiaOverviewSkeleton: React.FC = () => {
  return (
    <div className='flex flex-col gap-5'>
      <Skeleton className='rounded-xl lg:w-full lg:h-[400px] xl:h-[450px] h-[450px] sm:h-[450px] xs:h-[250px]'></Skeleton>
      <div className='flex flex-col gap-5'>
        <div className='flex flex-col gap-1.5'>
          <Skeleton className='w-[100%] h-6 rounded-lg' />
          <Skeleton className='w-[80%] h-6 rounded-lg' />
        </div>
        <div className='flex justify-between items-center'>
          <Skeleton className='w-[50%] h-4 rounded-lg' />
          <Skeleton className='w-[30%] h-6 rounded-lg' />
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
          Aucun média n'est lié au contenu de cette œuvre. Veuillez vérifier plus tard ou explorer d'autres sections de notre site.
        </p>
      </div>
    </div>
  );
};
