import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Button, outlineButtonClass, outlineButtonCompactClass, primaryButtonClass } from '@/theme/components/button';
import { Layouts } from '@/components/layout/Layouts';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import { BookMarkIcon, ArrowIcon, LockIcon, ShareIcon } from '@/components/ui/icons';
import { addToast } from '@/theme/components';
import { usePlaylist } from '@/hooks/usePlaylist';
import { fetchPlaylistById, fetchPlaylistItemCards, type Playlist, type PlaylistCard } from '@/services/Playlist';
import { BackgroundEllipse } from '@/assets/svg/BackgroundEllipse';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 } }),
};

export const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playlists, canUsePlaylists, loading: contextLoading } = usePlaylist();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [cards, setCards] = useState<PlaylistCard[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);

  const playlistId = id ? Number(id) : null;

  // Trouver la playlist dans le contexte (si owner) ou la charger via l'API
  useEffect(() => {
    if (!playlistId) {
      setLoadingPlaylist(false);
      return;
    }

    const fromContext = playlists.find((p) => p.id === playlistId);
    if (fromContext) {
      setPlaylist(fromContext);
      setLoadingPlaylist(false);
      return;
    }

    // Attendre le chargement du contexte avant de conclure à une absence
    if (contextLoading) {
      setLoadingPlaylist(true);
      return;
    }

    let cancelled = false;
    setLoadingPlaylist(true);

    fetchPlaylistById(playlistId).then((p) => {
      if (cancelled) return;
      setPlaylist(p);
      setLoadingPlaylist(false);
    });

    return () => {
      cancelled = true;
    };
  }, [playlistId, playlists, contextLoading]);

  // Charger les cards des items via l'endpoint backend
  useEffect(() => {
    if (!playlist) return;
    setLoadingCards(true);
    fetchPlaylistItemCards(playlist).then((result) => {
      setCards(result?.items ?? []);
      setLoadingCards(false);
    });
  }, [playlist]);

  // Retrait via PlaylistPickerButton sur ResourceCard
  useEffect(() => {
    if (!playlistId) return;
    const fromContext = playlists.find((p) => p.id === playlistId);
    if (!fromContext) return;
    const itemIds = new Set(fromContext.items.map((i) => i.id));
    setCards((prev) => prev.filter((c) => itemIds.has(c.id)));
  }, [playlists, playlistId]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      addToast({ title: 'Lien copié', description: 'Lien de la playlist copié dans votre presse-papier.', color: 'success' });
    });
  }, []);

  const isOwner = canUsePlaylists && playlist && playlists.some((p) => p.id === playlist.id);

  if (loadingPlaylist) {
    return (
      <Layouts className='col-span-10 flex flex-col gap-24'>
        <div className='pt-24 flex flex-col items-center gap-4 animate-pulse'>
          <div className='h-10 w-80 bg-c3 rounded-xl' />
          <div className='h-4 w-48 bg-c3 rounded-lg' />
        </div>
        <div className='grid grid-cols-4 gap-5'>
          {Array.from({ length: 8 }).map((_, i) => <ResourceCardSkeleton key={i} />)}
        </div>
      </Layouts>
    );
  }

  if (!playlist) {
    return (
      <Layouts className='col-span-10 flex flex-col items-center justify-center min-h-[50vh] gap-5'>
        <BookMarkIcon size={36} className='text-c4' />
        <div className='text-center'>
          <p className='text-xl font-medium text-c6'>Playlist introuvable</p>
          <p className='text-sm text-c5 mt-1'>Cette playlist n'existe pas ou n'est plus accessible.</p>
        </div>
        <Button className={outlineButtonClass} onPress={() => navigate('/mes-playlists')} startContent={<ArrowIcon size={14} transform='rotate(180deg)' />}>
          Retour aux playlists
        </Button>
      </Layouts>
    );
  }

  return (
    <Layouts className='col-span-10 flex flex-col gap-16'>
      {/* Header */}
      <div className='pt-20 flex flex-col items-center gap-5 relative'>
        <div className='flex flex-col items-center gap-3 z-10'>
          <div className='flex items-center gap-2'>
            {playlist.visibility === 'private' ? (
              <span className='flex items-center gap-1.5 text-sm text-c5 bg-c2 border border-c3 px-3 py-1 rounded-full'>
                <LockIcon size={12} /> Privée
              </span>
            ) : (
              <span className='flex items-center gap-1.5 text-sm text-c5 bg-c2 border border-c3 px-3 py-1 rounded-full'>
                <ShareIcon size={12} /> Partagée
              </span>
            )}
          </div>
          <h1 className='text-5xl text-c6 font-medium text-center max-w-[700px] leading-tight'>
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className='text-base text-c5 text-center max-w-[500px]'>{playlist.description}</p>
          )}
          <p className='text-sm text-c4'>
            {playlist.items.length} {playlist.items.length === 1 ? 'élément' : 'éléments'} dans cette playlist.
          </p>
        </div>
        <motion.div
          className='top-[-20px] absolute z-[-1]'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className='opacity-10 dark:opacity-20'>
            <BackgroundEllipse />
          </div>
        </motion.div>
      </div>

      {/* Grille */}
      {loadingCards ? (
        <div className='grid grid-cols-4 gap-5 pb-16'>
          {Array.from({ length: Math.max(playlist.items.length, 4) }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-24 gap-4'>
          <BookMarkIcon size={36} className='text-c4/40' />
          <div className='text-center'>
            <p className='text-lg font-medium text-c6'>Playlist vide</p>
            <p className='text-sm text-c5 mt-1'>
              Parcourez le corpus et ajoutez des éléments à cette playlist.
            </p>
          </div>
          <Button className={`${primaryButtonClass} mt-2`} onPress={() => navigate('/corpus/mises-en-recits')}>
            Explorer le corpus
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-4 gap-5 pb-16'>
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial='hidden'
              animate='visible'
              variants={fadeIn}
              custom={i}
            >
              <ResourceCard item={card} />
            </motion.div>
          ))}
        </div>
      )}
    </Layouts>
  );
};
