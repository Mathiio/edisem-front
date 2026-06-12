/**
 * PAGE TEMPORAIRE — Gestion des mots-clés
 * Accessible à /mots-cles (réservé actants admin)
 * Fonctionnalités : exploration des liens, usages CSV, suppression
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layouts } from '@/components/layout/Layouts';
import { Spinner } from '@/theme/components';
import { Button } from '@/theme/components/button';

const BASE_URL = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=MotsCles';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Keyword = { id: number; title: string };

type ConferenceItem = {
  id: number; title: string;
  agent?: string | null;
  edition?: { id: number; title: string } | null;
};

type CitationItem = {
  id: number; title: string;
  parent_conf?: { id: number; title: string; template: number } | null;
};

type GenericItem = { id: number; title: string };

type Group = {
  template: number;
  label: string;
  slug: string;
  items: (ConferenceItem | CitationItem | GenericItem)[];
};

type KeywordResult = {
  keyword: Keyword;
  total: number;
  groups: Group[];
};

type DryRunResult = {
  valid_count: number;
  valid_keywords: Keyword[];
  incoming_refs: number;
  own_values: number;
  item_set_links: number;
  not_found: number[];
};

type DeleteResult = {
  deleted_items: number;
  deleted_refs: number;
  not_found: number[];
};

type ReplaceDryRun = {
  from_keyword: Keyword;
  to_keyword: Keyword;
  total_refs: number;
  refs_to_update: number;
  refs_to_remove_dup: number;
  distinct_items: number;
};

type ReplaceResult = {
  from_keyword: Keyword;
  to_keyword: Keyword;
  updated_refs: number;
  removed_dupes: number;
  distinct_items: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────

const parseIds = (raw: string): number[] =>
  [...new Set(
    raw.split(/[\s,;]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0)
  )];

/** Retourne le path de navigation pour un item selon son template et son id */
function itemPath(template: number, id: number, extra?: { conf_template?: number }): string | null {
  switch (template) {
    case 71:  return `/corpus/seminaires/conference/${id}`;
    case 121: return `/corpus/journees-etudes/conference/${id}`;
    case 122: return `/corpus/colloques/conference/${id}`;
    case 81:  return `/corpus/bibliographie/${id}`;
    case 103: return `/corpus/recit-artistique/${id}`;
    case 108: return `/corpus/experimentation/${id}`;
    case 117: return `/corpus/recit-techno-industriel/${id}`;
    case 119: return `/corpus/recit-citoyen/${id}`;
    case 120: return `/corpus/recit-mediatique/${id}`;
    case 124: return `/corpus/recit-scientifique/${id}`;
    case 127: return `/espace-etudiant/experimentation/${id}`;
    case 33:  return `/personne/${id}`;
    // Pour les citations : on navigue vers la conférence parente
    case 80: {
      const ct = extra?.conf_template;
      if (!ct) return null;
      const confId = id; // ici id = conf_id passé en extra
      if (ct === 71)  return `/corpus/seminaires/conference/${confId}`;
      if (ct === 121) return `/corpus/journees-etudes/conference/${confId}`;
      if (ct === 122) return `/corpus/colloques/conference/${confId}`;
      return null;
    }
    default: return null;
  }
}

const CONF_TEMPLATES = new Set([71, 121, 122]);

const USAGE_COLUMNS = [
  { key: 'conf_seminaire',          label: 'Séminaire (71)' },
  { key: 'journee_etudes',          label: "Journée d'études (121)" },
  { key: 'colloque',                label: 'Colloque (122)' },
  { key: 'citation',                label: 'Citation (80)' },
  { key: 'micro_resume_ia',         label: 'Micro-résumé IA (125)' },
  { key: 'experimentation',         label: 'Expérimentation (108)' },
  { key: 'experimentation_etudiant',label: 'Expérimentation étudiant (127)' },
  { key: 'recit_artistique',        label: 'Récit artistique (103)' },
  { key: 'recit_citoyen',           label: 'Récit citoyen (119)' },
  { key: 'recit_mediatique',        label: 'Récit médiatique (120)' },
  { key: 'recit_scientifique',      label: 'Récit scientifique (124)' },
  { key: 'recit_techno',            label: 'Récit techno (117)' },
  { key: 'annotation',              label: 'Annotation (101)' },
  { key: 'bibliographie',           label: 'Bibliographie (81)' },
  { key: 'mediagraphie',            label: 'Médiagraphie (83)' },
  { key: 'carnet_recherche',        label: 'Carnet recherche (39)' },
  { key: 'recherche',               label: 'Recherche (102)' },
  { key: 'personne',                label: 'Personne (33)' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section : Recherche et exploration d'un mot-clé
// ─────────────────────────────────────────────────────────────────────────────

function ItemCard({ template, item }: { template: number; item: ConferenceItem | CitationItem | GenericItem }) {
  const isConf     = CONF_TEMPLATES.has(template);
  const isCitation = template === 80;

  // Chemin de navigation
  let path: string | null = null;
  let subtitle: string | null = null;

  if (isConf) {
    const conf = item as ConferenceItem;
    path     = itemPath(template, item.id);
    subtitle = [conf.agent, conf.edition?.title].filter(Boolean).join(' — ') || null;
  } else if (isCitation) {
    const cit = item as CitationItem;
    if (cit.parent_conf) {
      path     = itemPath(80, cit.parent_conf.id, { conf_template: cit.parent_conf.template });
      subtitle = `→ ${cit.parent_conf.title}`;
    }
  } else {
    path = itemPath(template, item.id);
  }

  const inner = (
    <div className={`
      flex flex-col gap-1 bg-c2 border border-c3 rounded-xl px-4 py-3 text-sm
      ${path ? 'hover:border-c4 hover:bg-c3 transition-colors cursor-pointer' : ''}
    `}>
      <span className='text-c5 font-medium leading-snug line-clamp-2'>
        {item.title || <span className='italic text-c4'>Sans titre</span>}
      </span>
      {subtitle && <span className='text-xs text-c4/60 truncate'>{subtitle}</span>}
      <span className='text-xs text-c4/50 font-mono'>ID {item.id}</span>
    </div>
  );

  if (path) {
    return <Link to={path}>{inner}</Link>;
  }
  return inner;
}

function GroupSection({ group }: { group: Group }) {
  const [expanded, setExpanded] = useState(true);
  const count = group.items.length;

  return (
    <div className='flex flex-col gap-2'>
      <button
        onClick={() => setExpanded(e => !e)}
        className='flex items-center gap-2 text-left'
      >
        <span className='text-sm font-medium text-c5'>{group.label}</span>
        <span className='text-xs px-2 py-0.5 rounded-full bg-c3 text-c4'>{count}</span>
        <span className='text-xs text-c4 ml-auto'>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
          {group.items.map(item => (
            <ItemCard key={item.id} template={group.template} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

const KeywordExplorerSection: React.FC = () => {
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState<Keyword[]>([]);
  const [showSugg, setShowSugg]     = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult]         = useState<KeywordResult | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError]           = useState('');
  const [replaceTargetId, setReplaceTargetId] = useState('');
  const [replacePreview, setReplacePreview] = useState<ReplaceDryRun | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceSuccess, setReplaceSuccess] = useState<string | null>(null);
  const [originDeleteProposal, setOriginDeleteProposal] = useState<{
    from: Keyword;
    to: Keyword;
  } | null>(null);
  const [originDeleteDryRun, setOriginDeleteDryRun] = useState<DryRunResult | null>(null);
  const [isDeletingOrigin, setIsDeletingOrigin] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Évite de rouvrir le dropdown après sélection : setQuery relance le fetch qui faisait setShowSugg(true). */
  const suppressNextSuggestOpenRef = useRef(false);

  // Fetch suggestions avec debounce
  useEffect(() => {
    if (query.trim().length < 1) { setSuggestions([]); setShowSugg(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res  = await fetch(`${BASE_URL}&action=searchKeywords&q=${encodeURIComponent(query)}&json=1`);
        const data = await res.json();
        setSuggestions(data.keywords ?? []);
        if (suppressNextSuggestOpenRef.current) {
          suppressNextSuggestOpenRef.current = false;
          setShowSugg(false);
        } else {
          setShowSugg(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const loadItems = useCallback(async (kw: Keyword, opts?: { keepPostReplaceUi?: boolean }) => {
    suppressNextSuggestOpenRef.current = true;
    setResult(null);
    setError('');
    if (!opts?.keepPostReplaceUi) {
      setReplaceTargetId('');
      setReplacePreview(null);
      setReplaceSuccess(null);
      setOriginDeleteProposal(null);
      setOriginDeleteDryRun(null);
    }
    setShowSugg(false);
    setQuery(kw.title);
    setIsLoadingItems(true);
    try {
      const res  = await fetch(`${BASE_URL}&action=getKeywordItems&id=${kw.id}&json=1`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Erreur serveur');
      setResult(data as KeywordResult);
    } catch (e: any) {
      setError(e.message ?? 'Erreur inconnue');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  const clearSearch = () => {
    suppressNextSuggestOpenRef.current = false;
    setQuery('');
    setResult(null);
    setError('');
    setReplaceTargetId('');
    setReplacePreview(null);
    setReplaceSuccess(null);
    setOriginDeleteProposal(null);
    setOriginDeleteDryRun(null);
    setSuggestions([]);
    setShowSugg(false);
    inputRef.current?.focus();
  };

  const replaceToId = parseInt(replaceTargetId.trim(), 10);

  const handleReplaceDryRun = async () => {
    if (!result) return;
    setError('');
    setReplaceSuccess(null);
    setReplacePreview(null);
    setOriginDeleteProposal(null);
    setOriginDeleteDryRun(null);
    if (!replaceToId || replaceToId <= 0) {
      setError('Indiquez un ID de mot-clé de remplacement valide.');
      return;
    }
    if (replaceToId === result.keyword.id) {
      setError('Le mot-clé de remplacement doit être différent du mot-clé actuel.');
      return;
    }
    setIsReplacing(true);
    try {
      const res = await fetch(
        `${BASE_URL}&action=replaceKeyword&from_id=${result.keyword.id}&to_id=${replaceToId}&dryRun=1&json=1`,
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Erreur serveur');
      setReplacePreview(data as ReplaceDryRun);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsReplacing(false);
    }
  };

  const handleReplaceConfirm = async () => {
    if (!result) return;
    setError('');
    setIsReplacing(true);
    try {
      const res = await fetch(
        `${BASE_URL}&action=replaceKeyword&from_id=${result.keyword.id}&to_id=${replaceToId}&json=1`,
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Erreur serveur');
      const r = data as ReplaceResult;
      setReplaceSuccess(
        `${r.updated_refs} lien(s) mis à jour, ${r.removed_dupes} doublon(s) supprimé(s) sur ${r.distinct_items} item(s).`,
      );
      setReplacePreview(null);
      setReplaceTargetId('');
      setOriginDeleteProposal({ from: r.from_keyword, to: r.to_keyword });
      setOriginDeleteDryRun(null);
      await loadItems(result.keyword, { keepPostReplaceUi: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsReplacing(false);
    }
  };

  const handleDeleteOriginCheck = async () => {
    if (!originDeleteProposal) return;
    setError('');
    setIsDeletingOrigin(true);
    try {
      const res = await fetch(
        `${BASE_URL}&action=deleteKeywords&dryRun=1&ids=${originDeleteProposal.from.id}&json=1`,
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Erreur serveur');
      setOriginDeleteDryRun(data as DryRunResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsDeletingOrigin(false);
    }
  };

  const handleDeleteOriginConfirm = async () => {
    if (!originDeleteProposal) return;
    setError('');
    setIsDeletingOrigin(true);
    try {
      const res = await fetch(
        `${BASE_URL}&action=deleteKeywords&dryRun=0&ids=${originDeleteProposal.from.id}&json=1`,
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Erreur serveur');
      setReplaceSuccess(
        `Mot-clé « ${originDeleteProposal.from.title} » (ID ${originDeleteProposal.from.id}) supprimé.`,
      );
      setOriginDeleteProposal(null);
      setOriginDeleteDryRun(null);
      setResult(null);
      setQuery('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsDeletingOrigin(false);
    }
  };

  const dismissOriginDelete = () => {
    setOriginDeleteProposal(null);
    setOriginDeleteDryRun(null);
  };

  return (
    <section className='flex flex-col gap-6'>

      {/* Barre de recherche — z élevé pour passer au-dessus du footer (frère dans la grille Layouts) */}
      <div className='relative z-[200] w-full'>
        <div className='flex items-center gap-2 bg-c2 border border-c3 rounded-xl px-4 py-2.5 focus-within:border-c4 transition-colors'>
          {isSearching
            && <Spinner size='sm' color='current' className='text-c5 shrink-0' />
          }
          <input
            ref={inputRef}
            type='text'
            value={query}
            onChange={e => {
              suppressNextSuggestOpenRef.current = false;
              setQuery(e.target.value);
              setResult(null);
            }}
            onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            placeholder='Rechercher un nom ou ID de mot-clé'
            className='flex-1 bg-transparent text-c5 text-sm placeholder:text-c4/60 focus:outline-none'
          />
          {query && (
            <button onClick={clearSearch} className='text-xs text-c5 hover:text-c5 transition-colors shrink-0'>
              ✕
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSugg && suggestions.length > 0 && (
          <div
            className='absolute top-full left-0 right-0 mt-1 bg-c1 border border-c3 rounded-xl shadow-lg z-[201] overflow-hidden'
            onMouseDown={e => e.preventDefault()}
          >
            {suggestions.map(kw => (
              <button
                key={kw.id}
                onClick={() => loadItems(kw)}
                className='cursor-pointer w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-c3 transition-colors'
              >
                <span className='text-c5 truncate'>{kw.title}</span>
                <span className='text-xs text-c4 font-mono ml-3 shrink-0'>ID {kw.id}</span>
              </button>
            ))}
          </div>
        )}

        {showSugg && suggestions.length === 0 && !isSearching && query.trim().length > 0 && (
          <div className='absolute top-full left-0 right-0 mt-1 bg-c1 border border-c3 rounded-xl shadow-lg z-[201] px-4 py-3 text-sm text-c4'>
            Aucun mot-clé trouvé pour « {query} »
          </div>
        )}
      </div>

      {/* Loading items */}
      {isLoadingItems && (
        <div className='flex items-center gap-3 text-c4'>
          <Spinner size='sm' color='current' />
          <span className='text-sm'>Chargement des items liés…</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className='text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3'>{error}</div>
      )}

      {/* Résultats */}
      {result && (
        <div className='flex flex-col gap-6'>
          {/* En-tête du mot-clé */}
          <div className='flex items-center gap-4 bg-c2 border border-c3 rounded-xl px-5 py-4'>
            <div className='flex flex-col gap-0.5 min-w-0'>
              <span className='text-lg font-semibold text-c6 truncate'>{result.keyword.title}</span>
              <span className='text-xs text-c4 font-mono'>ID {result.keyword.id}</span>
            </div>
            <div className='ml-auto shrink-0 flex flex-col items-end gap-0.5'>
              <span className='text-3xl font-bold text-c6'>{result.total}</span>
              <span className='text-xs text-c4'>item{result.total > 1 ? 's' : ''} lié{result.total > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Remplacement de mot-clé sur tous les items liés */}
          <div className='flex flex-col gap-3 bg-c2 border border-c3 rounded-xl px-5 py-4'>
            <div className='flex flex-col gap-1'>
              <h3 className='text-base font-medium text-c6'>Remplacer ce mot-clé</h3>
              <p className='text-c4 text-sm'>
                Sur tous les items listés ci-dessous, remplace la référence{' '}
                <span className='font-mono text-c5'>ID {result.keyword.id}</span> par un autre mot-clé.
              </p>
            </div>
            <div className='flex flex-wrap items-end gap-3'>
              <div className='flex flex-col gap-1.5 min-w-[200px] flex-1'>
                <label className='text-xs text-c5 font-medium'>ID du mot-clé de remplacement</label>
                <input
                  type='text'
                  inputMode='numeric'
                  value={replaceTargetId}
                  onChange={e => {
                    setReplaceTargetId(e.target.value.replace(/\D/g, ''));
                    setReplacePreview(null);
                    setReplaceSuccess(null);
                  }}
                  placeholder='ex. 15035'
                  className='bg-c1 border border-c3 rounded-lg px-3 py-2 text-sm text-c6 font-mono focus:outline-none focus:border-c4'
                />
              </div>
              <Button
                type='button'
                variant='bordered'
                isLoading={isReplacing && !replacePreview}
                isDisabled={!replaceTargetId.trim() || isReplacing}
                onPress={handleReplaceDryRun}>
                Prévisualiser
              </Button>
              <Button
                type='button'
                color='primary'
                isLoading={isReplacing && !!replacePreview}
                isDisabled={!replacePreview || isReplacing}
                onPress={handleReplaceConfirm}>
                Remplacer par
              </Button>
            </div>
            {replacePreview && (
              <div className='text-sm text-c5 bg-c1 border border-c3 rounded-lg px-4 py-3 flex flex-col gap-1'>
                <p>
                  <strong className='text-c6'>{replacePreview.from_keyword.title}</strong>
                  {' '}(ID {replacePreview.from_keyword.id}) →{' '}
                  <strong className='text-c6'>{replacePreview.to_keyword.title}</strong>
                  {' '}(ID {replacePreview.to_keyword.id})
                </p>
                <p>
                  {replacePreview.refs_to_update} lien(s) seront mis à jour
                  {replacePreview.refs_to_remove_dup > 0 && (
                    <>, {replacePreview.refs_to_remove_dup} doublon(s) seront retirés (cible déjà présente)</>
                  )}
                  {' '}sur {replacePreview.distinct_items} item(s).
                </p>
                <p className='text-c4 text-xs'>Cliquez sur « Remplacer par » pour appliquer.</p>
              </div>
            )}
            {replaceSuccess && (
              <p className='text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2'>
                {replaceSuccess}
              </p>
            )}
          </div>

          {/* Proposition suppression — bloc distinct, visible après remplacement */}
          {originDeleteProposal && (
            <div className='flex flex-col gap-3 border-2 border-red-500/40 bg-red-500/10 rounded-xl px-5 py-4'>
              <div className='flex flex-col gap-1'>
                <p className='text-base font-medium text-c6'>Supprimer le mot-clé d&apos;origine ?</p>
                <p className='text-c4 text-sm'>
                  Les items pointent maintenant vers{' '}
                  <strong className='text-c5'>{originDeleteProposal.to.title}</strong> (ID{' '}
                  {originDeleteProposal.to.id}). Vous pouvez supprimer{' '}
                  <strong className='text-c5'>{originDeleteProposal.from.title}</strong> (ID{' '}
                  {originDeleteProposal.from.id}) s&apos;il n&apos;est plus utile.
                </p>
              </div>

              {!originDeleteDryRun ? (
                <div className='flex flex-wrap items-center gap-3'>
                  <Button
                    type='button'
                    className='h-9 px-4 text-sm rounded-lg bg-red-600 hover:bg-red-600 text-white font-medium'
                    isLoading={isDeletingOrigin}
                    onPress={handleDeleteOriginCheck}>
                    Supprimer le mot-clé d&apos;origine
                  </Button>
                  <button
                    type='button'
                    onClick={dismissOriginDelete}
                    className='text-sm text-c4 hover:text-c5 transition-colors px-2'>
                    Non, garder ce mot-clé
                  </button>
                </div>
              ) : (
                <div className='flex flex-col gap-3'>
                  {originDeleteDryRun.incoming_refs > 0 ? (
                    <p className='text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2'>
                      Attention : {originDeleteDryRun.incoming_refs} lien(s) pointent encore vers ce mot-clé.
                      La suppression retirera aussi ces références.
                    </p>
                  ) : (
                    <p className='text-sm text-c5'>
                      Aucun item ne référence plus ce mot-clé — suppression sans impact sur les contenus.
                    </p>
                  )}
                  <div className='flex flex-wrap items-center gap-3'>
                    <Button
                      type='button'
                      className='h-9 px-4 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium'
                      isLoading={isDeletingOrigin}
                      onPress={handleDeleteOriginConfirm}>
                      Confirmer la suppression
                    </Button>
                    <button
                      type='button'
                      onClick={dismissOriginDelete}
                      className='text-sm text-c4 hover:text-c5 transition-colors px-2'>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {result.total === 0 ? (
            <p className='text-c4 text-sm italic'>Aucun item ne référence ce mot-clé.</p>
          ) : (
            <div className='flex flex-col gap-6'>
              {result.groups.map(group => (
                <GroupSection key={group.template} group={group} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section : Usages CSV (masquée visuellement, logique conservée)
// ─────────────────────────────────────────────────────────────────────────────

const KeywordsUsageSection: React.FC = () => {
  const [idsInput, setIdsInput]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState<{ count: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idCount = parseIds(idsInput).length;

  const handleExport = useCallback(async () => {
    setError(''); setDone(null);
    const ids = parseIds(idsInput);
    if (!ids.length) { setError('Aucun ID valide.'); return; }
    setIsLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}&action=exportKeywordUsage&ids=${encodeURIComponent(ids.join(','))}&json=1`);
      const data = await res.json();
      if (!data.success || !data.csv) throw new Error(data.error ?? 'Réponse vide');
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = data.filename ?? 'mots_cles_usages.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDone({ count: data.count });
    } catch (e: any) { setError(e.message ?? 'Erreur inconnue'); }
    finally { setIsLoading(false); }
  }, [idsInput]);

  return (
    <section className='flex flex-col gap-4 border border-c3 rounded-xl p-6'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-2xl font-medium text-c6'>Usages des mots-clés par type d'item</h2>
        <p className='text-c4 text-sm'>
          Génère un CSV avec, pour chaque mot-clé, le nombre d'items qui le référencent — ventilé par type.
        </p>
      </div>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <label className='text-sm text-c5 font-medium'>IDs des mots-clés</label>
          {idCount > 0 && <span className='text-xs text-c4'>{idCount} ID{idCount > 1 ? 's' : ''} détecté{idCount > 1 ? 's' : ''}</span>}
        </div>
        <textarea
          ref={textareaRef}
          value={idsInput}
          onChange={e => { setIdsInput(e.target.value); setError(''); setDone(null); }}
          placeholder='123\n456\n789\n\nou : 123, 456, 789'
          rows={6}
          className='w-full rounded-xl bg-c2 border border-c3 text-c5 text-sm font-mono px-3 py-2 resize-y placeholder:text-c3 focus:outline-none focus:border-c4 transition-colors'
        />
      </div>
      <div className='flex items-center gap-3'>
        <Button onPress={handleExport} isDisabled={isLoading || idCount === 0} className='h-9 px-4 text-sm rounded-lg bg-action text-white disabled:opacity-50'>
          {isLoading ? <span className='flex items-center gap-2'><Spinner size='sm' color='current' />Génération…</span> : `Exporter (${idCount} mots-clés)`}
        </Button>
        {idsInput && <button onClick={() => { setIdsInput(''); setError(''); setDone(null); textareaRef.current?.focus(); }} className='text-xs text-c4 hover:text-c5 transition-colors'>Effacer</button>}
      </div>
      {error && <div className='text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3'>{error}</div>}
      {done && (
        <div className='text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 flex flex-col gap-1'>
          <span className='font-medium'>✓ CSV téléchargé</span>
          <span className='text-emerald-300/70 text-xs'>{done.count} mots-clés — colonnes : motcle:id, motcle:title, total, puis une colonne par type ({USAGE_COLUMNS.length} types)</span>
        </div>
      )}
      <div className='border-t border-c3 pt-4 flex flex-col gap-2'>
        <p className='text-xs text-c4 font-medium'>Colonnes générées après motcle:id / motcle:title / total</p>
        <div className='grid grid-cols-2 gap-x-8 gap-y-0.5 font-mono text-xs text-c3'>
          {USAGE_COLUMNS.map(col => (
            <span key={col.key}><span className='text-c4'>{col.key}</span><span className='text-c2 ml-1'>— {col.label}</span></span>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section : Suppression (masquée visuellement, logique conservée)
// ─────────────────────────────────────────────────────────────────────────────

type DeleteStep = 'idle' | 'confirming' | 'deleted';

const KeywordsDeleteSection: React.FC = () => {
  const [idsInput, setIdsInput]         = useState('');
  const [step, setStep]                 = useState<DeleteStep>('idle');
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [dryRun, setDryRun]             = useState<DryRunResult | null>(null);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idCount = parseIds(idsInput).length;

  const reset = () => { setStep('idle'); setDryRun(null); setDeleteResult(null); setError(''); };

  const handleCheck = useCallback(async () => {
    setError('');
    const ids = parseIds(idsInput);
    if (!ids.length) { setError('Aucun ID valide.'); return; }
    setIsLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}&action=deleteKeywords&dryRun=1&ids=${encodeURIComponent(ids.join(','))}&json=1`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Erreur serveur');
      setDryRun(data as DryRunResult); setStep('confirming');
    } catch (e: any) { setError(e.message ?? 'Erreur inconnue'); }
    finally { setIsLoading(false); }
  }, [idsInput]);

  const handleDelete = useCallback(async () => {
    setError('');
    const ids = parseIds(idsInput);
    setIsLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}&action=deleteKeywords&dryRun=0&ids=${encodeURIComponent(ids.join(','))}&json=1`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Erreur serveur');
      setDeleteResult(data as DeleteResult); setStep('deleted');
    } catch (e: any) { setError(e.message ?? 'Erreur inconnue'); }
    finally { setIsLoading(false); }
  }, [idsInput]);

  return (
    <section className='flex flex-col gap-4 border border-red-500/30 rounded-xl p-6 bg-red-500/5'>
      <div className='flex flex-col gap-1'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30'>DESTRUCTIF</span>
          <h2 className='text-2xl font-medium text-c6'>Suppression de mots-clés</h2>
        </div>
        <p className='text-c4 text-sm'>
          Supprime définitivement des items mots-clés (template 34) et tous leurs liens. <strong className='text-red-400'>Opération irréversible.</strong>
        </p>
      </div>

      {step === 'idle' && (
        <>
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
              <label className='text-sm text-c5 font-medium'>IDs des mots-clés à supprimer</label>
              {idCount > 0 && <span className='text-xs text-c4'>{idCount} ID{idCount > 1 ? 's' : ''} détecté{idCount > 1 ? 's' : ''}</span>}
            </div>
            <textarea
              ref={textareaRef}
              value={idsInput}
              onChange={e => { setIdsInput(e.target.value); setError(''); }}
              placeholder='123\n456\n789\n\nou : 123, 456, 789'
              rows={6}
              className='w-full rounded-xl bg-c2 border border-c3 text-c5 text-sm font-mono px-3 py-2 resize-y placeholder:text-c3 focus:outline-none focus:border-red-400/50 transition-colors'
            />
          </div>
          <div className='flex items-center gap-3'>
            <Button onPress={handleCheck} isDisabled={isLoading || idCount === 0} className='h-9 px-4 text-sm rounded-lg bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50'>
              {isLoading ? <span className='flex items-center gap-2'><Spinner size='sm' color='current' />Vérification…</span> : `Vérifier (${idCount} IDs)`}
            </Button>
          </div>
          {error && <div className='text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3'>{error}</div>}
        </>
      )}

      {step === 'confirming' && dryRun && (
        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {[
              { label: 'Mots-clés trouvés',  value: dryRun.valid_count,      color: 'text-c6' },
              { label: 'Liens conférences',  value: dryRun.incoming_refs,    color: 'text-orange-400' },
              { label: 'Valeurs propres',    value: dryRun.own_values,       color: 'text-c4' },
              { label: 'Appartenances sets', value: dryRun.item_set_links,   color: 'text-c4' },
              { label: 'IDs introuvables',   value: dryRun.not_found.length, color: dryRun.not_found.length > 0 ? 'text-yellow-400' : 'text-c4' },
            ].map(({ label, value, color }) => (
              <div key={label} className='bg-c2 border border-c3 rounded-xl px-4 py-3 flex flex-col gap-0.5'>
                <span className={`text-2xl font-semibold ${color}`}>{value}</span>
                <span className='text-xs text-c4'>{label}</span>
              </div>
            ))}
          </div>
          {dryRun.not_found.length > 0 && (
            <div className='text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3'>
              <span className='font-medium'>IDs non trouvés (ignorés) :</span> <span className='font-mono'>{dryRun.not_found.join(', ')}</span>
            </div>
          )}
          <div className='flex flex-col gap-1'>
            <p className='text-xs text-c4 font-medium'>Mots-clés qui seront supprimés ({dryRun.valid_count})</p>
            <div className='max-h-48 overflow-y-auto rounded-xl border border-c3 bg-c2 divide-y divide-c3'>
              {dryRun.valid_keywords.map(kw => (
                <div key={kw.id} className='flex items-center gap-3 px-4 py-2'>
                  <span className='text-xs text-c3 font-mono w-12 shrink-0'>{kw.id}</span>
                  <span className='text-sm text-c5 truncate'>{kw.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className='flex items-center gap-3 pt-1'>
            <Button onPress={handleDelete} isDisabled={isLoading} className='h-9 px-4 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50'>
              {isLoading ? <span className='flex items-center gap-2'><Spinner size='sm' color='current' />Suppression…</span> : `Confirmer — supprimer ${dryRun.valid_count} mot${dryRun.valid_count > 1 ? 's-clés' : '-clé'}`}
            </Button>
            <button onClick={reset} className='text-xs text-c4 hover:text-c5 transition-colors'>Annuler</button>
          </div>
          {error && <div className='text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3'>{error}</div>}
        </div>
      )}

      {step === 'deleted' && deleteResult && (
        <div className='flex flex-col gap-4'>
          <div className='text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-4 flex flex-col gap-2'>
            <span className='font-medium text-base'>✓ Suppression effectuée</span>
            <div className='flex flex-col gap-0.5 text-emerald-300/70 text-xs'>
              <span>{deleteResult.deleted_items} mot{deleteResult.deleted_items > 1 ? 's-clés supprimés' : '-clé supprimé'}</span>
              <span>{deleteResult.deleted_refs} lien{deleteResult.deleted_refs > 1 ? 's supprimés' : ' supprimé'} depuis d'autres items</span>
              {deleteResult.not_found.length > 0 && (
                <span className='text-yellow-400/70'>{deleteResult.not_found.length} ID{deleteResult.not_found.length > 1 ? 's' : ''} ignoré{deleteResult.not_found.length > 1 ? 's' : ''} : {deleteResult.not_found.join(', ')}</span>
              )}
            </div>
          </div>
          <button onClick={() => { reset(); setIdsInput(''); }} className='text-xs text-c4 hover:text-c5 transition-colors self-start'>Nouvelle suppression</button>
        </div>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────

export const MotsClesPage: React.FC = () => (
  <Layouts className='relative z-[100] col-span-10 flex flex-col gap-12 pt-8'>
    <div className='flex flex-col gap-1'>
      <h1 className='text-4xl font-medium text-c6'>Gestion des mots-clés</h1>
      <p className='text-c4 text-sm'>
        Recherchez un mot-clé par nom ou par ID. Tous les items qui lui sont liés s'affichent en dessous,
        organisés par type. Cliquez sur une card pour accéder au contenu.
      </p>
    </div>

    <KeywordExplorerSection />

    {/* Sections masquées visuellement — logique conservée */}
    <div className='hidden'>
      <KeywordsUsageSection />
      <KeywordsDeleteSection />
    </div>
  </Layouts>
);
