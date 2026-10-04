import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDisclosure } from '@heroui/react';
import { Select, SelectItem, Button } from '@/theme/components';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  modalCloseButtonClasses,
} from '@/theme/components';
import { FormTextInput, formFieldLabelClass } from '@/components/features/forms/edit/FormFields';
import { outlineIconButtonClass } from '@/theme/components/button';
import { AddIcon, EditIcon } from '@/components/ui/icons';
import {
  emptyEditionLinkState,
  listEditionsForConferenceType,
  type EditionLinkFormState,
} from '@/services/ConferenceEdition';
import {
  EDITION_SEASON_TERM_FALLBACK,
  EDITION_SEASON_VOCAB_ID,
} from '@/config/editionConfig';
import { fetchCustomVocabTerms } from '@/utils/customVocab';
import { getSeasonOrder } from '@/lib/utils';

interface EditionOption {
  id: number;
  title: string;
  year?: string;
  season?: string;
}

interface ConferenceEditionEditorProps {
  value: EditionLinkFormState | undefined;
  onChange: (next: EditionLinkFormState) => void;
  conferenceTypeTerm: string;
}

type EditionDraft = Pick<EditionLinkFormState, 'title' | 'year' | 'season'>;
type EditionModalMode = 'create' | 'edit';

const emptyEditionDraft = (): EditionDraft => ({ title: '', year: '', season: '' });

function sortSeasonTerms(terms: string[]): string[] {
  return [...terms].sort((a, b) => getSeasonOrder(a) - getSeasonOrder(b));
}

const EditionSeasonSelect: React.FC<{
  label: string;
  value: string;
  onChange: (term: string) => void;
  terms: string[];
  loading?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, terms, loading, placeholder = 'Choisir une saison' }) => (
  <div className='w-full'>
    <Select
      label={label}
      labelPlacement='outside-top'
      classNames={{
        label: `${formFieldLabelClass} !text-c6`,
        trigger: '!min-h-[50px]',
      }}
      placeholder={loading ? 'Chargement…' : placeholder}
      isLoading={loading}
      isDisabled={loading || terms.length === 0}
      selectedKeys={value ? [value] : []}
      onSelectionChange={(keys) => {
        const key = Array.from(keys)[0];
        onChange(key ? String(key) : '');
      }}
    >
      {terms.map((term) => (
        <SelectItem key={term} textValue={term}>
          {term.charAt(0).toUpperCase() + term.slice(1)}
        </SelectItem>
      ))}
    </Select>
  </div>
);

const EditionFormFields: React.FC<{
  draft: EditionDraft;
  onDraftChange: (next: EditionDraft) => void;
  seasonTerms: string[];
  loadingSeasonTerms: boolean;
  intro?: string;
  error: string | null;
}> = ({ draft, onDraftChange, seasonTerms, loadingSeasonTerms, intro, error }) => (
  <>
    {intro ? <p className='text-sm text-c4'>{intro}</p> : null}
    <FormTextInput
      label='Titre de l’édition'
      value={draft.title}
      onChange={(v) => onDraftChange({ ...draft, title: v })}
      placeholder='Ex. : Séminaire Arcanes 2024-2025'
    />
    <div className='grid grid-cols-2 gap-3'>
      <EditionSeasonSelect
        label='Saison'
        value={draft.season}
        onChange={(v) => onDraftChange({ ...draft, season: v })}
        terms={seasonTerms}
        loading={loadingSeasonTerms}
      />
      <FormTextInput
        label='Année'
        value={draft.year}
        onChange={(v) => onDraftChange({ ...draft, year: v })}
        placeholder='Ex. : 2024'
      />
    </div>
    {error ? <p className='text-sm text-danger'>{error}</p> : null}
  </>
);

export const ConferenceEditionEditor: React.FC<ConferenceEditionEditorProps> = ({
  value,
  onChange,
  conferenceTypeTerm,
}) => {
  const state = value ?? emptyEditionLinkState();
  const [editions, setEditions] = useState<EditionOption[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [seasonTerms, setSeasonTerms] = useState<string[]>([]);
  const [loadingSeasonTerms, setLoadingSeasonTerms] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalMode, setModalMode] = useState<EditionModalMode>('create');
  const [draft, setDraft] = useState<EditionDraft>(emptyEditionDraft());
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSeasonTerms(true);
      try {
        let terms = await fetchCustomVocabTerms(EDITION_SEASON_VOCAB_ID);
        if (!terms.length) {
          terms = [...EDITION_SEASON_TERM_FALLBACK];
        }
        if (!cancelled) setSeasonTerms(sortSeasonTerms(terms));
      } catch {
        if (!cancelled) setSeasonTerms(sortSeasonTerms([...EDITION_SEASON_TERM_FALLBACK]));
      } finally {
        if (!cancelled) setLoadingSeasonTerms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEditions = useCallback(async () => {
    setLoadingEditions(true);
    try {
      const list = await listEditionsForConferenceType(conferenceTypeTerm);
      setEditions(
        list.map((ed: { id: string | number; title: string; year?: string; season?: string }) => ({
          id: Number(ed.id),
          title: ed.title,
          year: ed.year,
          season: ed.season,
        })),
      );
    } finally {
      setLoadingEditions(false);
    }
  }, [conferenceTypeTerm]);

  useEffect(() => {
    void loadEditions();
  }, [loadEditions]);

  const isCreatePending = state.mode === 'create' && Boolean(state.title.trim());
  const hasExistingEdition = state.mode === 'existing' && state.editionId != null;
  const selectKey =
    state.mode === 'existing' && state.editionId
      ? String(state.editionId)
      : isCreatePending
        ? '__create_pending__'
        : '';

  const openCreateModal = () => {
    setDraftError(null);
    setModalMode('create');
    setDraft(
      state.mode === 'create'
        ? { title: state.title, year: state.year, season: state.season }
        : emptyEditionDraft(),
    );
    onOpen();
  };

  const openEditModal = () => {
    if (!hasExistingEdition) return;
    setDraftError(null);
    setModalMode('edit');
    setDraft({ title: state.title, year: state.year, season: state.season });
    onOpen();
  };

  const confirmDraft = () => {
    if (!draft.title.trim()) {
      setDraftError('Le titre de l’édition est obligatoire.');
      return;
    }
    if (modalMode === 'create') {
      onChange({
        mode: 'create',
        editionId: null,
        title: draft.title.trim(),
        year: draft.year,
        season: draft.season,
      });
    } else {
      onChange({
        mode: 'existing',
        editionId: state.editionId,
        title: draft.title.trim(),
        year: draft.year,
        season: draft.season,
      });
      setEditions((prev) =>
        prev.map((ed) =>
          ed.id === state.editionId
            ? { ...ed, title: draft.title.trim(), year: draft.year, season: draft.season }
            : ed,
        ),
      );
    }
    onClose();
  };

  const canEditEditionDraft = hasExistingEdition || isCreatePending;

  const openEditionDraftModal = () => {
    if (isCreatePending) openCreateModal();
    else openEditModal();
  };

  const editionSelectItems = useMemo(() => {
    const items: EditionOption[] = editions.map((ed) => {
      // Si l'édition sélectionnée est dans la liste, on applique les éventuelles
      // modifications locales (titre/saison/année modifiés via la modale)
      if (state.mode === 'existing' && ed.id === state.editionId) {
        return {
          ...ed,
          title: state.title || ed.title,
          year: state.year !== undefined ? state.year : ed.year,
          season: state.season !== undefined ? state.season : ed.season,
        };
      }
      return ed;
    });

    // Si l'édition sélectionnée n'est PAS dans la liste chargée (ex. colloque
    // chargé avant que conferenceTypeTerm soit connu, ou type différent),
    // on l'ajoute synthétiquement à partir du state pour que le Select puisse
    // afficher la valeur.
    if (
      state.mode === 'existing' &&
      state.editionId != null &&
      !items.some((ed) => ed.id === state.editionId)
    ) {
      items.unshift({
        id: state.editionId,
        title: state.title || `Édition ${state.editionId}`,
        year: state.year,
        season: state.season,
      });
    }

    if (isCreatePending) {
      items.unshift({
        id: -1,
        title: `${state.title} (nouvelle édition)`,
        year: state.year,
        season: state.season,
      });
    }
    return items;
  }, [editions, isCreatePending, state.editionId, state.mode, state.title, state.year, state.season]);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <Select
          className='min-w-0 flex-1'
          aria-label='Édition'
          placeholder={loadingEditions ? 'Chargement…' : 'Aucune ou choisir une édition'}
          selectedKeys={selectKey ? [selectKey] : []}
          isLoading={loadingEditions}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0];
            if (!key || key === '__create_pending__') {
              if (!key) {
                onChange({ ...emptyEditionLinkState() });
              }
              return;
            }
            const id = Number(key);
            const ed = editions.find((e) => e.id === id);
            onChange({
              mode: 'existing',
              editionId: id,
              title: ed?.title ?? '',
              year: ed?.year ?? '',
              season: ed?.season ?? '',
            });
          }}
        >
          {editionSelectItems.map((ed) => {
            const itemKey = ed.id === -1 ? '__create_pending__' : String(ed.id);
            return (
              <SelectItem key={itemKey} textValue={ed.title}>
                {ed.id === -1 ? (
                  ed.title
                ) : (
                  <>
                    {ed.title}
                    {ed.season || ed.year ? ` — ${[ed.season, ed.year].filter(Boolean).join(' ')}` : ''}
                  </>
                )}
              </SelectItem>
            );
          })}
        </Select>

        <div className='flex shrink-0 items-center gap-2'>
          {canEditEditionDraft && (
            <Button
              type='button'
              className={outlineIconButtonClass}
              aria-label='Modifier l’édition'
              onPress={openEditionDraftModal}
            >
              <EditIcon size={16} className='shrink-0' />
            </Button>
          )}
          <Button
            type='button'
            className={outlineIconButtonClass}
            aria-label='Nouvelle édition'
            onPress={openCreateModal}
          >
            <AddIcon size={16} className='shrink-0' />
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size='lg'
        backdrop='blur'
        scrollBehavior='inside'
        classNames={{ closeButton: modalCloseButtonClasses }}
      >
        <ModalContent>
          {(onModalClose) => (
            <>
              <ModalHeader>
                <span className='text-c6 font-semibold text-xl'>
                  {modalMode === 'edit' ? 'Modifier l’édition' : 'Nouvelle édition'}
                </span>
              </ModalHeader>
              <ModalBody className='flex flex-col gap-4'>
                <EditionFormFields
                  draft={draft}
                  onDraftChange={(next) => {
                    setDraftError(null);
                    setDraft(next);
                  }}
                  seasonTerms={seasonTerms}
                  loadingSeasonTerms={loadingSeasonTerms}
                  intro={
                    modalMode === 'create'
                      ? 'Les champs seront enregistrés avec la conférence. Vous pourrez compléter l’édition plus tard dans le corpus.'
                      : 'Les modifications seront appliquées à l’édition liée lors de l’enregistrement de la conférence.'
                  }
                  error={draftError}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant='light' onPress={onModalClose} className='text-c5 rounded-lg'>
                  Annuler
                </Button>
                <Button onPress={confirmDraft} className='bg-action text-selected rounded-lg'>
                  {modalMode === 'edit' ? 'Enregistrer' : 'Utiliser cette édition'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};
