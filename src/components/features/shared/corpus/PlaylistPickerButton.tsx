import React, { useCallback, useRef, useState } from 'react';
import { usePlaylist } from '@/hooks/usePlaylist';
import { BookMarkIcon, AddIcon } from '@/components/ui/icons';
import { addToast, Button, Checkbox, Input, cancelButtonClass, primaryButtonClass } from '@/theme/components';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  dropdownContentClassNames,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
} from '@/theme/components/dropdown';

interface PlaylistPickerButtonProps {
  resourceId: number;
}

export const PlaylistPickerButton: React.FC<PlaylistPickerButtonProps> = ({ resourceId }) => {
  const { playlists, isInAnyPlaylist, isInPlaylist, addToPlaylist, removeFromPlaylist, createPlaylist } = usePlaylist();

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const pendingToggleRef = useRef<Set<number>>(new Set());

  const inAny = isInAnyPlaylist(resourceId);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCreating(false);
      setNewTitle('');
    }
  }, []);

  const stopCardClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleTogglePlaylist = useCallback(
    async (playlistId: number) => {
      if (pendingToggleRef.current.has(playlistId)) return;
      pendingToggleRef.current.add(playlistId);

      try {
        const inIt = isInPlaylist(playlistId, resourceId);
        if (inIt) {
          await removeFromPlaylist(playlistId, resourceId);
          addToast({ title: 'Retiré', description: 'Retiré de la playlist.', color: 'success' });
        } else {
          await addToPlaylist(playlistId, resourceId);
          addToast({ title: 'Ajouté', description: 'Ajouté à la playlist.', color: 'success' });
        }
      } catch {
        addToast({ title: 'Erreur', description: 'Impossible de modifier la playlist.', color: 'danger' });
      } finally {
        pendingToggleRef.current.delete(playlistId);
      }
    },
    [isInPlaylist, resourceId, removeFromPlaylist, addToPlaylist],
  );

  const handlePlaylistRowClick = useCallback(
    (e: React.MouseEvent, playlistId: number) => {
      e.stopPropagation();
      void handleTogglePlaylist(playlistId);
    },
    [handleTogglePlaylist],
  );

  const handleCreateConfirm = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || isCreating) return;
    setIsCreating(true);
    try {
      const playlist = await createPlaylist(title);
      await addToPlaylist(playlist.id, resourceId);
      addToast({ title: 'Playlist créée', description: `« ${title} » créée et l'élément ajouté.`, color: 'success' });
      setCreating(false);
      setNewTitle('');
    } catch {
      addToast({ title: 'Erreur', description: 'Impossible de créer la playlist.', color: 'danger' });
    } finally {
      setIsCreating(false);
    }
  }, [newTitle, isCreating, createPlaylist, addToPlaylist, resourceId]);

  return (
    <div
      className='absolute bottom-5 right-5 z-20'
      onClick={stopCardClick}
      onMouseDown={stopCardClick}
    >
      <Dropdown
        placement='top'
        classNames={{
          ...dropdownContentClassNames,
          content: `${dropdownContentClassNames.content} w-fit min-w-0`,
        }}
        onOpenChange={handleOpenChange}
      >
        <DropdownTrigger>
          <button
            type='button'
            aria-label='Ajouter à une playlist'
            aria-pressed={inAny}
            onClick={stopCardClick}
            className={`flex h-8 w-8 items-center cursor-pointer justify-center rounded-lg border-1 transition-all duration-200 outline-none data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-action/40 ${
              inAny
                ? 'border-action bg-action/15 text-action opacity-100'
                : 'border-c3 bg-c2/90 text-c4 opacity-0 group-hover:opacity-100 hover:border-action hover:text-action'
            }`}
          >
            <BookMarkIcon size={14} />
          </button>
        </DropdownTrigger>

        <DropdownMenu
          closeOnSelect={false}
          className='p-2 max-h-72 overflow-auto w-fit min-w-0'
          classNames={{
            ...dropdownMenuClassNames,
            base: `${dropdownMenuClassNames.base} w-fit min-w-0`,
            list: `${dropdownMenuClassNames.list} w-fit min-w-0`,
          }}
          itemClasses={{
            base: `${dropdownMenuItemClass} w-full min-w-0`,
            title: 'w-full flex-1',
          }}
        >
          <DropdownSection
            title='MES PLAYLISTS'
            showDivider
            classNames={{
              heading: 'text-xs font-medium text-c4 uppercase tracking-wider px-3 pb-1 pt-0',
            }}
          >
            {playlists.length === 0 ? (
              <DropdownItem key='empty' isReadOnly className='opacity-100 cursor-default'>
                <p className={`text-sm text-c4 whitespace-nowrap ${dropdownItemInnerPadding}`}>Aucune playlist encore.</p>
              </DropdownItem>
            ) : (
              playlists.map((playlist) => {
                const inIt = isInPlaylist(playlist.id, resourceId);
                return (
                  <DropdownItem
                    key={playlist.id}
                    isReadOnly
                    textValue={playlist.title}
                    className={`${dropdownMenuItemClass} opacity-100`}
                  >
                    <div
                      role='button'
                      tabIndex={0}
                      aria-pressed={inIt}
                      className={`flex items-center gap-2 w-full whitespace-nowrap ${dropdownItemInnerPadding} rounded-lg cursor-pointer`}
                      onClick={(e) => handlePlaylistRowClick(e, playlist.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePlaylistRowClick(e as unknown as React.MouseEvent, playlist.id);
                        }
                      }}
                    >
                      <Checkbox
                        isSelected={inIt}
                        size='sm'
                        isReadOnly
                        classNames={{
                          base: 'pointer-events-none m-0 gap-0 p-0',
                          wrapper: '!me-0',
                        }}
                      />
                      <span className='text-sm text-c6'>{playlist.title}</span>
                    </div>
                  </DropdownItem>
                );
              })
            )}
          </DropdownSection>

          <DropdownSection classNames={{ base: 'mb-0' }}>
            {creating ? (
              <DropdownItem
                key='create-form'
                isReadOnly
                className='opacity-100 cursor-default p-0 data-[hover=true]:!bg-transparent data-[selectable=true]:focus:!bg-transparent'
              >
                <div className='flex flex-col gap-2 min-w-[14rem]' onClick={stopCardClick}>
                  <Input
                    size='md'
                    aria-label='Nom de la playlist'
                    placeholder='Nom de la playlist…'
                    value={newTitle}
                    autoFocus
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') handleCreateConfirm();
                      if (e.key === 'Escape') {
                        setCreating(false);
                        setNewTitle('');
                      }
                    }}
                  />
                  <div className='flex gap-1.5'>
                    <Button
                      size='sm'
                      variant='light'
                      className={`flex-1 ${cancelButtonClass}`}
                      onPress={() => {
                        setCreating(false);
                        setNewTitle('');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size='sm'
                      className={`flex-1 ${primaryButtonClass}`}
                      isDisabled={!newTitle.trim() || isCreating}
                      isLoading={isCreating}
                      onPress={handleCreateConfirm}
                    >
                      Créer
                    </Button>
                  </div>
                </div>
              </DropdownItem>
            ) : (
              <DropdownItem
                key='create'
                className={dropdownMenuItemClass}
                onPress={() => setCreating(true)}
              >
                <div className={`flex items-center gap-2 w-full whitespace-nowrap ${dropdownItemInnerPadding} rounded-lg text-c6`}>
                  <AddIcon size={14} />
                  <span className='text-sm font-medium'>Nouvelle playlist</span>
                </div>
              </DropdownItem>
            )}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};
