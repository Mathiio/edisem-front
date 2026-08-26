import React, { useCallback, useEffect, useState, type Key } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/theme/components';
import { outlineButtonClass } from '@/theme/components/button';
import { Layouts } from '@/components/layout/Layouts';
import { PageBanner } from '@/components/ui/PageBanner';
import { AlertModal } from '@/components/ui/AlertModal';
import { BookMarkIcon, AddIcon, TrashIcon, EditIcon, LockIcon, ShareIcon, DotsIcon } from '@/components/ui/icons';
import { mySpaceActionButtonClass } from '@/components/features/shared/my-space/MySpaceResourceRow';
import { addToast } from '@/theme/components';
import {
  dropdownContentClassNames,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
} from '@/theme/components/dropdown';
import { usePlaylist } from '@/hooks/usePlaylist';
import { fetchPlaylistPreviewThumbnails, type Playlist } from '@/services/Playlist';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08 } }),
};

// ─── Mosaic de miniatures ──────────────────────────────────────────────────────
const MosaicCell: React.FC<{ thumb: string | null }> = ({ thumb }) => (
  <div className='relative h-full w-full min-h-0 min-w-0 overflow-hidden bg-c3/60'>
    {thumb ? (
      <img src={thumb} alt='' className='absolute inset-0 h-full w-full object-cover' />
    ) : (
      <span className='absolute inset-0 flex items-center justify-center'>
        <BookMarkIcon size={16} className='text-c4/30' />
      </span>
    )}
  </div>
);

const PlaylistMosaic: React.FC<{ count: number; thumbnails?: (string | null)[]; loading?: boolean }> = ({
  count,
  thumbnails = [],
  loading = false,
}) => {
  const previewCount = Math.min(count, 4);
  const thumbs = thumbnails.slice(0, previewCount);

  if (loading) {
    return <div className='w-full aspect-[2/1] rounded-xl overflow-hidden bg-c3 animate-pulse' />;
  }

  if (count === 0) {
    return (
      <div className='relative w-full aspect-[2/1] rounded-xl overflow-hidden bg-c3'>
        <div className='absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1'>
          {Array.from({ length: 4 }).map((_, i) => (
            <MosaicCell key={i} thumb={null} />
          ))}
        </div>
      </div>
    );
  }

  if (count === 1) {
    return (
      <div className='relative w-full aspect-[2/1] rounded-xl overflow-hidden bg-c3'>
        <div className='absolute inset-0'>
          <MosaicCell thumb={thumbs[0] ?? null} />
        </div>
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className='relative w-full aspect-[2/1] rounded-xl overflow-hidden bg-c3'>
        <div className='absolute inset-0 flex gap-1'>
          <div className='relative min-h-0 min-w-0 flex-1'>
            <MosaicCell thumb={thumbs[0] ?? null} />
          </div>
          <div className='relative min-h-0 min-w-0 flex-1'>
            <MosaicCell thumb={thumbs[1] ?? null} />
          </div>
        </div>
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className='relative w-full aspect-[2/1] rounded-xl overflow-hidden bg-c3'>
        <div className='absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1'>
          <MosaicCell thumb={thumbs[0] ?? null} />
          <MosaicCell thumb={thumbs[1] ?? null} />
          <MosaicCell thumb={thumbs[2] ?? null} />
          <div className='min-h-0 bg-c3/60' />
        </div>
      </div>
    );
  }

  return (
    <div className='relative w-full aspect-[2/1] rounded-xl overflow-hidden bg-c3'>
      <div className='absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1'>
        {Array.from({ length: 4 }).map((_, i) => (
          <MosaicCell key={i} thumb={thumbs[i] ?? null} />
        ))}
      </div>
    </div>
  );
};

// ─── Card d'une playlist ───────────────────────────────────────────────────────
interface PlaylistCardProps {
  playlist: Playlist;
  onDelete: (id: number, title: string) => void;
  onEdit: (playlist: Playlist) => void;
  onShare: (playlist: Playlist) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onDelete, onEdit, onShare }) => {
  const navigate = useNavigate();
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(playlist.items.length > 0);

  useEffect(() => {
    if (playlist.items.length === 0) {
      setThumbnails([]);
      setLoadingThumbnails(false);
      return;
    }

    let cancelled = false;
    setLoadingThumbnails(true);

    fetchPlaylistPreviewThumbnails(playlist).then((preview) => {
      if (cancelled) return;
      setThumbnails(preview);
      setLoadingThumbnails(false);
    });

    return () => {
      cancelled = true;
    };
  }, [playlist.id, playlist.items.map((i) => i.id).join(',')]);

  const stopCardNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      className='group border-c3 border-2 cursor-pointer p-5 rounded-3xl flex flex-col gap-4 hover:bg-c3/30 bg-c2/50 transition-all duration-200 relative'
      onClick={() => navigate(`/mes-playlists/${playlist.id}`)}
    >
      <PlaylistMosaic count={playlist.items.length} thumbnails={thumbnails} loading={loadingThumbnails} />

      <div className='flex flex-col gap-1.5 flex-1'>
        <p className='text-base text-c6 font-medium line-clamp-2 leading-tight'>{playlist.title}</p>
        {playlist.description && (
          <p className='text-sm text-c4 line-clamp-2'>{playlist.description}</p>
        )}
      </div>

      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          {playlist.visibility === 'private' ? (
            <span className='flex items-center gap-1 text-xs text-c5'>
              <LockIcon size={11} /> Privée
            </span>
          ) : (
            <span className='flex items-center gap-1 text-xs text-c5'>
              <ShareIcon size={11} /> Partagée
            </span>
          )}
          <span className='text-xs text-c4'>·</span>
          <span className='text-xs text-c5'>
            {playlist.items.length} {playlist.items.length === 1 ? 'élément' : 'éléments'}
          </span>
        </div>

        <div
          className='shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          onClick={stopCardNavigation}
          onMouseDown={stopCardNavigation}
        >
          <Dropdown
            classNames={{
              ...dropdownContentClassNames,
              content: `${dropdownContentClassNames.content} w-fit min-w-0`,
            }}
          >
            <DropdownTrigger>
              <button
                type='button'
                aria-label='Actions sur la playlist'
                onClick={stopCardNavigation}
                className={mySpaceActionButtonClass}
              >
                <DotsIcon size={14} />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label='Actions playlist'
              className='p-2 w-fit min-w-0'
              classNames={{
                ...dropdownMenuClassNames,
                base: `${dropdownMenuClassNames.base} w-fit min-w-0`,
                list: `${dropdownMenuClassNames.list} w-fit min-w-0`,
              }}
              itemClasses={{
                base: `${dropdownMenuItemClass} w-full min-w-0`,
                title: 'w-full flex-1',
              }}
              onAction={(key: Key) => {
                if (key === 'share') onShare(playlist);
                else if (key === 'edit') onEdit(playlist);
                else if (key === 'delete') onDelete(playlist.id, playlist.title);
              }}
            >
              <DropdownItem key='share'>
                <div className={`flex items-center gap-2 w-full whitespace-nowrap ${dropdownItemInnerPadding} rounded-lg text-c6`}>
                  <ShareIcon size={16} className='text-c5 shrink-0' />
                  <span>Partager</span>
                </div>
              </DropdownItem>
              <DropdownItem key='edit'>
                <div className={`flex items-center gap-2 w-full whitespace-nowrap ${dropdownItemInnerPadding} rounded-lg text-c6`}>
                  <EditIcon size={16} className='text-c5 shrink-0' />
                  <span>Modifier</span>
                </div>
              </DropdownItem>
              <DropdownItem key='delete'>
                <div className={`flex items-center gap-2 w-full whitespace-nowrap ${dropdownItemInnerPadding} rounded-lg text-danger`}>
                  <TrashIcon size={16} className='shrink-0' />
                  <span>Supprimer</span>
                </div>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Modale création / édition ─────────────────────────────────────────────────
interface PlaylistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: Playlist;
  onSubmit: (title: string, description: string, visibility: 'private' | 'public') => Promise<void>;
}

const PlaylistFormModal: React.FC<PlaylistFormModalProps> = ({ isOpen, onClose, initial, onSubmit }) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [visibility, setVisibility] = useState<'private' | 'public'>(initial?.visibility ?? 'private');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setVisibility(initial?.visibility ?? 'private');
    }
  }, [isOpen, initial]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onSubmit(title.trim(), description.trim(), visibility);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <p className='text-lg font-semibold text-c6'>{initial ? 'Modifier la playlist' : 'Nouvelle playlist'}</p>
        </ModalHeader>
        <ModalBody>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-c5'>Nom *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Ex : IA & Cinéma'
                className='w-full text-sm bg-c2 border-2 border-c3 rounded-lg px-3 py-2 text-c6 placeholder:text-c4 outline-none focus:border-action'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-c5'>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Description optionnelle…'
                rows={3}
                className='w-full text-sm bg-c2 border-2 border-c3 rounded-lg px-3 py-2 text-c6 placeholder:text-c4 outline-none focus:border-action resize-none'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-c5'>Visibilité</label>
              <div className='flex gap-3'>
                {(['private', 'public'] as const).map((v) => (
                  <button
                    key={v}
                    type='button'
                    onClick={() => setVisibility(v)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      visibility === v ? 'border-action bg-action/10 text-action' : 'border-c3 text-c5 hover:border-c4'
                    }`}
                  >
                    {v === 'private' ? <LockIcon size={14} /> : <ShareIcon size={14} />}
                    {v === 'private' ? 'Privée' : 'Partagée'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant='light' onPress={onClose} className='text-c5'>Annuler</Button>
          <Button
            onPress={handleSubmit}
            isLoading={loading}
            isDisabled={!title.trim()}
            className='bg-action text-selected font-medium'
          >
            {initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// ─── Page principale ───────────────────────────────────────────────────────────
export const PlaylistsPage: React.FC = () => {
  const { playlists, loading, createPlaylist, deletePlaylist, updatePlaylist } = usePlaylist();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Playlist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleCreate = useCallback(
    async (title: string, description: string, visibility: 'private' | 'public') => {
      try {
        const playlist = await createPlaylist(title, description);
        if (visibility !== 'private') {
          await updatePlaylist(playlist.id, { visibility });
        }
        addToast({ title: 'Playlist créée', description: `« ${title} » est prête.`, color: 'success' });
      } catch {
        addToast({ title: 'Erreur', description: 'Impossible de créer la playlist.', color: 'danger' });
        throw new Error();
      }
    },
    [createPlaylist, updatePlaylist],
  );

  const handleEdit = useCallback(
    async (title: string, description: string, visibility: 'private' | 'public') => {
      if (!editTarget) return;
      try {
        await updatePlaylist(editTarget.id, { title, description, visibility });
        addToast({ title: 'Modifiée', description: 'Playlist mise à jour.', color: 'success' });
      } catch {
        addToast({ title: 'Erreur', description: 'Impossible de modifier la playlist.', color: 'danger' });
        throw new Error();
      }
    },
    [editTarget, updatePlaylist],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deletePlaylist(deleteTarget.id);
      addToast({ title: 'Supprimée', description: `« ${deleteTarget.title} » supprimée.`, color: 'success' });
      setDeleteTarget(null);
    } catch {
      addToast({ title: 'Erreur', description: 'Impossible de supprimer la playlist.', color: 'danger' });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, deletePlaylist]);

  const handleShare = useCallback((playlist: Playlist) => {
    const url = `${window.location.origin}/mes-playlists/${playlist.id}`;
    navigator.clipboard.writeText(url).then(() => {
      addToast({ title: 'Lien copié', description: 'Lien de la playlist copié dans votre presse-papier.', color: 'success' });
    }).catch(() => {
      addToast({ title: 'Lien', description: url, color: 'default' });
    });
  }, []);

  return (
    <Layouts className='col-span-10 flex flex-col gap-24 z-0 overflow-visible'>
      <PageBanner
        icon={<BookMarkIcon size={40} />}
        title='Mes playlists'
        description='Organisez vos ressources favorites en playlists thématiques et partagez-les.'
        backgroundScale={0.8}
        actions={
          <button
            type='button'
            onClick={() => setCreateOpen(true)}
            className={outlineButtonClass}
          >
            <AddIcon size={14} className='text-c6 shrink-0' />
            <span>Nouvelle playlist</span>
          </button>
        }
      />

      <div className='flex flex-col gap-8'>
        {loading ? (
          <div className='grid grid-cols-4 gap-5'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='border-c3 border-2 p-5 rounded-3xl flex flex-col gap-4 animate-pulse'>
                <div className='w-full aspect-[2/1] rounded-xl bg-c3/50' />
                <div className='h-4 w-3/4 bg-c3/50 rounded-lg' />
                <div className='h-3 w-1/2 bg-c3/50 rounded-lg' />
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className='col-span-4 rounded-3xl border-2 border-c3 border-dashed bg-c2/30 p-16 text-center flex flex-col items-center gap-4'>
            <BookMarkIcon size={36} className='text-c4/40' />
            <div className='flex flex-col gap-1'>
              <p className='text-lg text-c6 font-medium'>Aucune playlist</p>
              <p className='text-sm text-c5'>Créez votre première playlist pour organiser vos ressources.</p>
            </div>
            <button
              type='button'
              onClick={() => setCreateOpen(true)}
              className={`${outlineButtonClass} mt-2`}
            >
              <AddIcon size={14} className='text-c6 shrink-0' />
              <span>Créer une playlist</span>
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-4 gap-5'>
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={{ ...playlist, items: playlist.items } as any}
                onDelete={(id, title) => setDeleteTarget({ id, title })}
                onEdit={setEditTarget}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>

      {/* Création */}
      <PlaylistFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Édition */}
      <PlaylistFormModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        initial={editTarget ?? undefined}
        onSubmit={handleEdit}
      />

      {/* Suppression */}
      <AlertModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='Supprimer la playlist'
        description={`Supprimer « ${deleteTarget?.title} » ? Cette action est irréversible.`}
        type='danger'
        confirmLabel='Supprimer'
        onConfirm={handleDelete}
        isLoading={deleteLoading}
      />
    </Layouts>
  );
};
