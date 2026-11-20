/**
 * Page Chat IA Corpus — réservée aux global_admin.
 * Layout : sidebar gauche (liste conversations) + zone droite (thread + input).
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Layouts } from '@/components/layout/Layouts';
import { useCorpusChat } from '@/hooks/useCorpusChat';
import {
  syncEmbeddingIndex,
  type EmbeddingStats,
} from '@/services/CorpusChat';
import {
  Textarea,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  dropdownContentClassNames,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
  Tooltip,
} from '@/theme/components';
import { outlineButtonClass, outlineIconButtonClass } from '@/theme/components/button';
import type { ChatContextType } from '@/services/CorpusChat';
import type { IconSvgProps } from '@/types/ui';
import { AlertModal } from '@/components/ui/AlertModal';
import { ModalTitle } from '@/components/ui/ModalTitle';
import { DotsIcon, EditIcon, Sidebar, TrashIcon } from '@/components/ui/icons';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SIDEBAR_COLLAPSED_KEY = 'edisem-corpus-chat-sidebar-collapsed';
/** Même hauteur que outlineIconButtonClass (h-11 = 44px) */
const CHAT_COMPOSER_MIN_H_PX = 44;
const CHAT_COMPOSER_MAX_H_PX = 200;
/** Padding vertical du wrapper (py-2 × 2) — inclus dans le calcul de hauteur */
const CHAT_COMPOSER_WRAPPER_Y_PAD_PX = 16;
/** Même marge basse que la zone input chat (`py-5`) */
const CHAT_AREA_BOTTOM_PAD = 'pb-5';
/** Padding intérieur panneau sidebar */
const SIDEBAR_PANEL_INSET = 'p-3';
/** Tooltips bouton panneau replié — alignés sur AppSidebar */
const sidebarCollapsedTooltipClassNames = {
  content: 'bg-c2 text-c6 border-2 border-c3 px-2.5 py-1.5 rounded-lg text-sm font-medium max-w-[220px]',
};
/** Bouton panneau — taille fixe (évite le flash pleine largeur à l’ouverture) */
const sidebarPanelToggleClass = `${outlineIconButtonClass} !w-11 !min-w-11 !max-w-11 shrink-0`;

const chatComposerTextareaClassNames = {
  base: 'w-full min-w-0 flex-1',
  inputWrapper: [
    '!bg-c2',
    '!border-2',
    '!border-c3',
    '!shadow-none',
    'rounded-xl',
    '!mt-0',
    'box-border',
    '!min-h-11',
    '!h-auto',
    '!py-2',
    '!px-3',
    '!items-center',
    'data-[hover=true]:!border-c3',
    'data-[hover=true]:!bg-c3',
    'group-data-[focus=true]:!bg-c3',
    'group-data-[focus=true]:!border-c3',
    'transition-[height] duration-150',
  ].join(' '),
  input:
    'text-sm leading-5 text-c6 placeholder:text-c4/60 !resize-none !outline-none overflow-hidden !mt-0 !px-0 !py-0.5',
};

// ─── Icônes légères ───────────────────────────────────────────────────────────

function IconPlus({ size = 16, width, height, ...props }: IconSvgProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      {...props}
    >
      <path d='M12 5v14M5 12h14' />
    </svg>
  );
}

function IconArrowUp({ size = 18, width, height, ...props }: IconSvgProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      {...props}
    >
      <path d='M12 19V5' />
      <path d='m5 12 7-7 7 7' />
    </svg>
  );
}

function IconBot({ size = 20, width, height, ...props }: IconSvgProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.8}
      strokeLinecap='round'
      strokeLinejoin='round'
      {...props}
    >
      <rect x='3' y='11' width='18' height='10' rx='2' />
      <path d='M12 11V7' />
      <circle cx='12' cy='5' r='2' />
      <path d='M8 16h.01M12 16h.01M16 16h.01' />
    </svg>
  );
}

type ConversationRef = { id: number; title: string };

function stopRowClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

// ─── Menu ⋮ (renommer / supprimer) ───────────────────────────────────────────

function ConversationActionsMenu({
  onRename,
  onDelete,
  revealOnHover = false,
}: {
  onRename: () => void;
  onDelete: () => void;
  revealOnHover?: boolean;
}) {
  return (
    <Dropdown
      className='min-w-0 w-fit'
      classNames={{
        ...dropdownContentClassNames,
        content: `${dropdownContentClassNames.content} w-fit min-w-0`,
      }}
    >
      <DropdownTrigger>
        <button
          type='button'
          onClick={stopRowClick}
          onMouseDown={stopRowClick}
          aria-label='Actions sur la conversation'
          className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-c4 transition-all hover:bg-c3 hover:text-c6 ${
            revealOnHover ? 'opacity-0 group-hover:opacity-100' : ''
          }`}
        >
          <DotsIcon size={13} />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label='Actions conversation'
        className='p-2 w-fit min-w-0 text-c6'
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
        <DropdownItem key='rename' onPress={onRename}>
          <div className={`flex w-full items-center gap-2 whitespace-nowrap ${dropdownItemInnerPadding} rounded-lg text-c6`}>
            <EditIcon size={16} className='shrink-0 text-c5' />
            <span>Renommer</span>
          </div>
        </DropdownItem>
        <DropdownItem key='delete' onPress={onDelete}>
          <div className={`flex w-full items-center gap-2 whitespace-nowrap ${dropdownItemInnerPadding} rounded-lg text-danger`}>
            <TrashIcon size={16} className='shrink-0' />
            <span>Supprimer</span>
          </div>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

// ─── Modale renommer ─────────────────────────────────────────────────────────

function RenameConversationModal({
  isOpen,
  initialTitle,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  initialTitle: string;
  onClose: () => void;
  onConfirm: (title: string) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setTitle(initialTitle);
  }, [isOpen, initialTitle]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader className='flex flex-col gap-px'>
          <ModalTitle
            title='Renommer la conversation'
            icon={EditIcon}
            iconColor='text-action'
            iconBg='bg-action/15'
          />
        </ModalHeader>
        <ModalBody>
          <Input
            label='Titre'
            labelPlacement='outside-top'
            value={title}
            onValueChange={setTitle}
            placeholder='Titre de la conversation'
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant='light' onPress={onClose} className='text-c5'>
            Annuler
          </Button>
          <Button
            onPress={() => void handleSubmit()}
            isLoading={loading}
            isDisabled={!title.trim()}
            className='bg-action font-medium text-selected'
          >
            Enregistrer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─── Markdown — react-markdown + remark-gfm ──────────────────────────────────

/**
 * Découpe le texte en blocs : titres de sections numérotées vs contenu markdown.
 * Gère les deux formats générés par l'IA :
 *   - **1. Titre de section**   (gras, sur sa propre ligne)
 *   - 1. Titre de section       (numéroté brut, sur sa propre ligne)
 */
type ContentBlock =
  | { type: 'section'; n: number; title: string }
  | { type: 'md'; text: string };

function parseBlocks(raw: string): ContentBlock[] {
  // Regex qui capture les deux formats sur une ligne entière
  const RE = /^(?:\*\*(\d+)\.\s+([^*\n]+?)\*\*|(\d+)\.\s+(.+?))[ \t]*$/gm;
  const blocks: ContentBlock[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(raw)) !== null) {
    if (m.index > cursor) {
      const chunk = raw.slice(cursor, m.index).trim();
      if (chunk) blocks.push({ type: 'md', text: chunk });
    }
    const n     = parseInt(m[1] ?? m[3], 10);
    const title = (m[2] ?? m[4]).trim();
    blocks.push({ type: 'section', n, title });
    cursor = m.index + m[0].length;
  }

  if (cursor < raw.length) {
    const chunk = raw.slice(cursor).trim();
    if (chunk) blocks.push({ type: 'md', text: chunk });
  }

  return blocks;
}

/** Séparateur de section numérotée (badge violet + titre + ligne de séparation). */
function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <div
      className={n > 1 ? 'border-t border-c3' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        marginTop: n === 1 ? '4px' : '22px',
        marginBottom: '10px',
        ...(n > 1 ? { paddingTop: '14px' } : {}),
      }}
    >
      <span
        className='bg-action'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          color: '#fff',
          fontSize: '0.6rem',
          fontWeight: 800,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {n}
      </span>
      <b className='text-c6' style={{ fontWeight: 700, fontSize: '0.875rem' }}>
        {title}
      </b>
    </div>
  );
}

/** Composants react-markdown : stylise chaque nœud selon le design du chat. */
const MD_COMPONENTS: Components = {
  p({ children }) {
    return (
      <p className='text-c5 text-sm leading-relaxed' style={{ marginBottom: '3px' }}>
        {children}
      </p>
    );
  },
  strong({ children }) {
    return <strong className='text-c6 font-semibold'>{children}</strong>;
  },
  em({ children }) {
    return <em className='text-c5'>{children}</em>;
  },
  h1({ children }) {
    return (
      <b className='text-c6' style={{ display: 'block', fontWeight: 700, fontSize: '1rem', marginTop: '14px', marginBottom: '4px' }}>
        {children}
      </b>
    );
  },
  h2({ children }) {
    return (
      <b className='text-c6' style={{ display: 'block', fontWeight: 600, marginTop: '12px', marginBottom: '4px' }}>
        {children}
      </b>
    );
  },
  h3({ children }) {
    return (
      <b className='text-c6' style={{ display: 'block', fontWeight: 600, fontSize: '0.8125rem', marginTop: '10px', marginBottom: '2px' }}>
        {children}
      </b>
    );
  },
  ul({ children }) {
    return (
      <ul style={{ listStyleType: 'disc', paddingLeft: '18px', margin: '3px 0' }}>
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol style={{ listStyleType: 'decimal', paddingLeft: '18px', margin: '3px 0' }}>
        {children}
      </ol>
    );
  },
  li({ children }) {
    return (
      <li style={{ margin: '1px 0' }} className='text-c5 text-sm'>
        {children}
      </li>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className='border-l-2 border-c3 pl-3 italic text-c4' style={{ margin: '6px 0' }}>
        {children}
      </blockquote>
    );
  },
  pre({ children }) {
    return (
      <pre className='bg-c2 rounded-lg p-3 my-2 text-xs overflow-x-auto whitespace-pre-wrap text-c5 border border-c3'>
        {children}
      </pre>
    );
  },
  code({ children, className }) {
    // Bloc de code (dans un <pre>) → pas de styles inline
    if (className?.startsWith('language-')) return <code className={className}>{children}</code>;
    // Code inline
    return <code className='bg-c2 text-action px-1 py-0.5 rounded text-xs'>{children}</code>;
  },
};

/** Rendu markdown final (après streaming terminé). */
function MarkdownContent({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className='space-y-0'>
      {blocks.map((block, i) =>
        block.type === 'section' ? (
          <SectionHeader key={i} n={block.n} title={block.title} />
        ) : (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {block.text}
          </ReactMarkdown>
        ),
      )}
    </div>
  );
}

/** Pendant le streaming : texte lisible sans #, **, listes brutes, etc. */
function markdownToPlainForStream(text: string): string {
  let plain = text
    .replace(/```[\s\S]*?```/g, (block) => block.slice(3, -3).replace(/^[^\n]*\n/, ''))
    .replace(/`([^`\n]*)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\s]*[-•*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '');
  plain = plain.replace(/(\*{1,2}|#{1,6}|`)+$/g, '');
  return plain;
}

// ─── Skeleton chargement conversation ─────────────────────────────────────────

const CHAT_SKELETON_PULSE = 'animate-pulse bg-c3/70';

function ChatSkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-2.5 rounded-md ${CHAT_SKELETON_PULSE} ${className}`} />;
}

/** Skeleton liste sidebar — uniquement au premier chargement (liste vide). */
function ConversationListSkeleton() {
  const widths = ['w-[88%]', 'w-[72%]', 'w-[80%]', 'w-[65%]', 'w-[76%]'] as const;
  return (
    <div className='mt-1 space-y-2' role='status' aria-live='polite' aria-label='Chargement des conversations'>
      {widths.map((titleW, i) => (
        <div key={i} className='space-y-2 rounded-xl px-3 py-2.5'>
          <ChatSkeletonLine className={`h-3 ${titleW}`} />
          <ChatSkeletonLine className='h-2 w-[48%]' />
        </div>
      ))}
    </div>
  );
}

function ConversationThreadSkeleton() {
  return (
    <div
      className='mx-auto flex max-w-3xl flex-col gap-5 pb-4'
      role='status'
      aria-live='polite'
      aria-label='Chargement de la conversation'
    >
      {/* Message utilisateur */}
      <div className='flex justify-end'>
        <div className='max-w-[72%] space-y-2 rounded-2xl rounded-tr-sm border border-c3/30 bg-c2 px-4 py-3.5'>
          <ChatSkeletonLine className='h-2.5 w-40' />
          <ChatSkeletonLine className='w-28' />
        </div>
      </div>

      {/* Réponse assistant */}
      <div className='flex items-start gap-3'>
        <div className={`mt-1 h-8 w-8 shrink-0 rounded-xl border border-c3/40 ${CHAT_SKELETON_PULSE}`} />
        <div className='min-w-0 flex-1 space-y-2 rounded-2xl rounded-tl-sm border border-c3/30 bg-c2 px-4 py-3.5'>
          <ChatSkeletonLine className='w-full' />
          <ChatSkeletonLine className='w-[94%]' />
          <ChatSkeletonLine className='w-[88%]' />
          <ChatSkeletonLine className='w-[72%]' />
          <ChatSkeletonLine className='mt-1 w-[56%]' />
        </div>
      </div>

      {/* Échange suivant */}
      <div className='flex justify-end'>
        <div className='max-w-[58%] space-y-2 rounded-2xl rounded-tr-sm border border-c3/30 bg-c2 px-4 py-3.5'>
          <ChatSkeletonLine className='w-36' />
        </div>
      </div>

      <div className='flex items-start gap-3'>
        <div className={`mt-1 h-8 w-8 shrink-0 rounded-xl border border-c3/40 ${CHAT_SKELETON_PULSE}`} />
        <div className='min-w-0 flex-1 space-y-2 rounded-2xl rounded-tl-sm border border-c3/30 bg-c2 px-4 py-3.5'>
          <ChatSkeletonLine className='w-full' />
          <ChatSkeletonLine className='w-[90%]' />
          <ChatSkeletonLine className='w-[65%]' />
        </div>
      </div>
    </div>
  );
}

// ─── Composant bulle de message ───────────────────────────────────────────────

/**
 * Streaming adaptatif : durée cible ~5s quelle que soit la longueur.
 * Tick fixe de 20ms, nombre de chars par tick calculé dynamiquement.
 */
const STREAM_TICK_MS = 20;
function streamCharsPerTick(contentLength: number): number {
  // cible : ~250 ticks × 20ms = 5 secondes
  return Math.max(1, Math.ceil(contentLength / 250));
}

function AssistantModelFootnote({ modelLabel }: { modelLabel?: string }) {
  if (!modelLabel) {
    return null;
  }

  const isSonnet = modelLabel === 'sonnet+thinking';
  const short = isSonnet ? 'Sonnet' : 'Haiku';
  const title = isSonnet
    ? 'Réponse générée avec Claude Sonnet (réflexion approfondie)'
    : 'Réponse générée avec Claude Haiku';

  return (
    <p
      className='mt-2.5 flex items-center gap-1.5 border-t border-c3/25 pt-2 text-[10px] leading-none text-c4'
      title={title}
    >
      <span
        className={`h-1 w-1 shrink-0 rounded-full ${isSonnet ? 'bg-c5/50' : 'bg-c4/35'}`}
        aria-hidden
      />
      <span className='text-c4/90'>{short}</span>
      {isSonnet ? <span className='text-c4/55'>· analyse</span> : null}
    </p>
  );
}

function MessageBubble({
  role,
  content,
  stream = false,
  onStreamDone,
  modelLabel,
}: {
  role: 'user' | 'assistant';
  content: string;
  stream?: boolean;
  onStreamDone?: () => void;
  modelLabel?: string;
}) {
  const isUser = role === 'user';

  // État de streaming pour les messages assistant
  const [displayed, setDisplayed] = useState(stream ? '' : content);
  const [isDone, setIsDone]       = useState(!stream);
  const posRef = useRef(0);

  useLayoutEffect(() => {
    if (!stream) {
      setDisplayed(content);
      setIsDone(true);
      return;
    }

    posRef.current = 0;
    setDisplayed('');
    setIsDone(false);
  }, [stream, content]);

  useEffect(() => {
    if (!stream) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const charsPerTick = streamCharsPerTick(content.length);

    const tick = () => {
      if (cancelled) return;
      posRef.current = Math.min(posRef.current + charsPerTick, content.length);
      setDisplayed(content.slice(0, posRef.current));
      if (posRef.current < content.length) {
        timeoutId = setTimeout(tick, STREAM_TICK_MS);
      } else {
        setIsDone(true);
        onStreamDone?.();
      }
    };

    timeoutId = setTimeout(tick, 40);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [stream, content, onStreamDone]);

  if (isUser) {
    return (
      <div className='flex justify-end'>
        <div className='max-w-[75%] rounded-2xl rounded-tr-sm bg-action px-4 py-3'>
          <p className='text-sm leading-relaxed text-selected whitespace-pre-wrap'>{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex gap-3 items-start'>
      <div className='mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-c2 border-2 border-c3 text-action'>
        <IconBot size={16} />
      </div>
      <div className='min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-c2 border border-c3 px-4 py-3'>
        {isDone && !stream ? (
          /* Rendu markdown complet une fois l'animation terminée */
          <MarkdownContent content={content} />
        ) : (
          /* Texte lisible (sans syntaxe markdown) + curseur */
          <p className='prose-sm text-sm leading-relaxed text-c5 whitespace-pre-wrap'>
            {markdownToPlainForStream(displayed)}
            {stream && (
              <span
                className='ml-px inline-block h-[1em] w-[2px] translate-y-[2px] rounded-sm bg-action align-middle opacity-90 animate-pulse'
              />
            )}
          </p>
        )}
        {isDone ? <AssistantModelFootnote modelLabel={modelLabel} /> : null}
      </div>
    </div>
  );
}

// ─── Suggestions de démarrage ─────────────────────────────────────────────────

const SUGGESTIONS: { label: string; prompt: string; ctx: ChatContextType }[] = [
  { label: 'Vue d\'ensemble du corpus', prompt: 'Donne-moi une vue d\'ensemble du corpus EdiSem : quels types de récits, combien d\'items, et les grandes tendances des imaginaires de l\'IA.', ctx: 'corpus' },
  { label: 'Figures d\'IA dominantes', prompt: 'Quelles sont les figures de l\'IA les plus représentées dans le corpus ? Donne-moi des exemples de récits pour chaque figure dominante.', ctx: 'corpus' },
  { label: 'Enjeux et risques', prompt: 'Quels enjeux et risques liés à l\'IA sont les plus fréquemment cités dans le corpus ? Y a-t-il des différences selon les types de récits ?', ctx: 'corpus' },
  { label: 'Couverture des questions guide', prompt: 'Quelles questions guide sont les mieux couvertes par le corpus ? Et lesquelles semblent peu ou pas abordées ?', ctx: 'corpus' },
  { label: 'Récits citoyens', prompt: 'Décris les caractéristiques principales des récits citoyens dans le corpus. Quels imaginaires de l\'IA y sont mis en avant ?', ctx: 'general' },
  { label: 'Récits scientifiques', prompt: 'Comment les récits scientifiques représentent-ils l\'IA ? Comparaison avec les récits médiatiques.', ctx: 'general' },
];

// ─── Sidebar — liste des conversations ────────────────────────────────────────

type ChatQuota = NonNullable<ReturnType<typeof useCorpusChat>['quota']>;

interface ConversationListProps {
  conversations: ReturnType<typeof useCorpusChat>['conversations'];
  activeId: number | null;
  isLoading: boolean;
  collapsed: boolean;
  quota: ChatQuota | null;
  onToggleCollapsed: () => void;
  onOpen: (id: number) => void;
  onNew: () => void;
  onRequestRename: (conv: ConversationRef) => void;
  onRequestDelete: (conv: ConversationRef) => void;
}

function SidebarSection({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? (
        <h2 className='mb-3 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-c4'>{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

function ConversationList({
  conversations: conversationsProp,
  activeId,
  isLoading,
  collapsed,
  quota,
  onToggleCollapsed,
  onOpen,
  onNew,
  onRequestRename,
  onRequestDelete,
}: ConversationListProps) {
  const conversations = conversationsProp ?? [];
  const showConversationListSkeleton = isLoading && conversations.length === 0;
  const showEmptyConversations = !isLoading && conversations.length === 0;

  const sidebarToggle = (
    <Tooltip
      content={collapsed ? 'Historique des conversations' : 'Masquer l’historique'}
      placement='right'
      delay={0}
      closeDelay={0}
      classNames={sidebarCollapsedTooltipClassNames}
    >
      <div className='shrink-0'>
        <button
          type='button'
          onClick={onToggleCollapsed}
          aria-label={
            collapsed ? 'Afficher l’historique des conversations' : 'Masquer l’historique des conversations'
          }
          className={sidebarPanelToggleClass}
        >
          <Sidebar size={18} />
        </button>
      </div>
    </Tooltip>
  );

  return (
      <aside
        className={`shrink-0 ${
          collapsed
            ? 'w-auto self-start'
            : `h-full w-72 min-w-[16rem] self-stretch ${CHAT_AREA_BOTTOM_PAD}`
        }`}
      >
        <div
          className={`flex flex-col overflow-hidden rounded-2xl ${SIDEBAR_PANEL_INSET} ${
            collapsed
              ? 'gap-0 border-0 bg-transparent'
              : 'h-full min-h-0 gap-8 border border-c3/40 bg-c2/50'
          }`}
        >
          <div className='flex shrink-0 items-start'>{sidebarToggle}</div>

          {!collapsed && (
            <>

          <SidebarSection title='Actions' className='shrink-0'>
            <button
              type='button'
              onClick={onNew}
              className={`${outlineButtonClass} w-auto max-w-full shrink-0 !justify-start text-sm`}
            >
              <IconPlus size={15} className='shrink-0 text-c6' />
              <span className='truncate'>Nouveau Chat</span>
            </button>
          </SidebarSection>

          <SidebarSection title='Conversations' className='flex min-h-0 flex-1 flex-col'>
          <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden -mx-0.5 px-0.5'>
          {showConversationListSkeleton && <ConversationListSkeleton />}
          {showEmptyConversations && (
            <p className='mt-4 text-center text-xs text-c4'>Aucune conversation</p>
          )}
          {conversations.map((conv) => {
            const isActive = activeId === conv.id;
            const meta =
              conv.contextType === 'corpus'
                ? 'Corpus'
                : conv.contextType === 'item' && conv.itemTitle
                  ? conv.itemTitle
                  : 'Général';

            return (
              <div
                key={conv.id}
                role='button'
                tabIndex={0}
                onClick={() => onOpen(conv.id)}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(conv.id)}
                className={`group relative flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2.5 transition-all ${
                  isActive
                    ? 'border border-c3/70 bg-c3/50 ring-1 ring-c3/40'
                    : 'border border-transparent hover:bg-c2/70'
                }`}
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-c6'>{conv.title}</p>
                  <p className='text-xs text-c4'>
                    {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
                    {' · '}
                    {meta}
                  </p>
                </div>
                <ConversationActionsMenu
                  revealOnHover
                  onRename={() => onRequestRename({ id: conv.id, title: conv.title })}
                  onDelete={() => onRequestDelete({ id: conv.id, title: conv.title })}
                />
              </div>
            );
          })}
          </div>
          </SidebarSection>

          <SidebarSection title='Index sémantique' className='mt-auto shrink-0 pt-2'>
            <SidebarRagFooter />
          </SidebarSection>

          {quota && (
            <>
              <SidebarSection title='Quota' className='shrink-0 pt-2'>
                <SidebarQuotaFooter quota={quota} />
              </SidebarSection>
            </>
          )}
            </>
          )}
        </div>
      </aside>
  );
}

// ─── Index RAG Voyage (sidebar) ───────────────────────────────────────────────

function formatVoyageTokensCompact(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  }
  return String(n);
}

function SidebarRagFooter() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAndSync() {
      setLoadingStats(true);
      setSyncError(null);
      try {
        const synced = await syncEmbeddingIndex({
          onProgress: (done, total) => {
            if (!cancelled) {
              setSyncing(true);
              setSyncProgress({ done, total });
            }
          },
        });
        if (!cancelled) {
          setStats(synced);
        }
      } catch (e) {
        if (!cancelled) {
          setStats(null);
          setSyncError(e instanceof Error ? e.message : 'Index indisponible.');
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
          setSyncProgress(null);
          setLoadingStats(false);
        }
      }
    }

    void loadAndSync();
    return () => {
      cancelled = true;
    };
  }, []);

  const tokensTotal = stats?.voyageTokensTotal ?? 0;
  const vectors = stats?.indexedWithCurrentModel ?? stats?.indexed ?? 0;
  const syncPct =
    syncProgress && syncProgress.total > 0
      ? Math.min(100, (syncProgress.done / syncProgress.total) * 100)
      : 0;

  let statusLabel = 'Index…';
  let dotClass = 'bg-c4/50 animate-pulse';

  if (!loadingStats && stats) {
    if (!stats.voyageConfigured) {
      statusLabel = 'Voyage non configuré';
      dotClass = 'bg-c4/40';
    } else if (syncing && syncProgress) {
      statusLabel = `${syncProgress.done} / ${syncProgress.total}`;
      dotClass = 'bg-amber-400/80 animate-pulse';
    } else if (syncing) {
      statusLabel = 'Indexation…';
      dotClass = 'bg-amber-400/80 animate-pulse';
    } else if (stats.indexSyncComplete) {
      statusLabel = `${vectors} récit${vectors !== 1 ? 's' : ''}`;
      dotClass = 'bg-violet-400/70';
    } else if (stats.requiresIndexSync) {
      statusLabel = 'Synchronisation…';
      dotClass = 'bg-amber-400/70';
    } else {
      statusLabel = 'Index';
      dotClass = 'bg-c4/50';
    }
  }

  const tooltip =
    stats?.voyageConfigured && stats.indexModel
      ? `Recherche sémantique · ${stats.indexModel} / ${stats.queryModel ?? 'query'} · ${tokensTotal.toLocaleString('fr-CA')} tokens Voyage`
      : undefined;

  return (
    <div
      className='rounded-xl border border-c3/35 bg-c2/45 px-3 py-2.5'
      title={tooltip}
      role='status'
      aria-live='polite'
      aria-label={tooltip ?? statusLabel}
    >
      <div className='flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
          <span className='truncate text-[11px] font-medium text-c5'>{statusLabel}</span>
        </div>
        {stats?.voyageConfigured && !loadingStats ? (
          <span
            className='shrink-0 tabular-nums text-[10px] text-c4'
            title={`${tokensTotal.toLocaleString('fr-CA')} tokens Voyage (cumul)`}
          >
            {formatVoyageTokensCompact(tokensTotal)}
          </span>
        ) : null}
      </div>
      {syncing && syncProgress ? (
        <div
          className='mt-2 h-[2px] overflow-hidden rounded-full bg-c3/35'
          role='progressbar'
          aria-valuenow={syncProgress.done}
          aria-valuemin={0}
          aria-valuemax={syncProgress.total}
        >
          <div
            className='h-full rounded-full bg-action/55 transition-[width] duration-300 ease-out'
            style={{ width: `${syncPct}%` }}
          />
        </div>
      ) : null}
      {syncError ? <p className='mt-1.5 truncate text-[10px] text-amber-500/90'>{syncError}</p> : null}
    </div>
  );
}

// ─── Quota journalier (sidebar) ───────────────────────────────────────────────

function formatQuotaTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n);
}

function quotaBarFillClass(usedPct: number): string {
  if (usedPct > 85) return 'bg-red-400/80';
  if (usedPct > 65) return 'bg-amber-400/75';
  return 'bg-action/55';
}

function SidebarQuotaMiniBar({
  label,
  used,
  limit,
  formatValue = (n) => String(n),
}: {
  label: string;
  used: number;
  limit: number;
  formatValue?: (n: number) => string;
}) {
  const usedPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const fillClass = quotaBarFillClass(usedPct);

  return (
    <div className='space-y-2' role='group' aria-label={`${label} : ${formatValue(used)} sur ${formatValue(limit)}`}>
      <div className='flex items-baseline justify-between gap-2 text-[11px] leading-none'>
        <span className='text-c4'>{label}</span>
        <span className='tabular-nums text-c5'>
          {formatValue(used)}
          <span className='text-c4/80'> / {formatValue(limit)}</span>
        </span>
      </div>
      <div className='h-1.5 overflow-hidden rounded-full bg-c3/35'>
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${usedPct}%` }} />
      </div>
    </div>
  );
}

function SidebarQuotaFooter({ quota }: { quota: ChatQuota }) {
  const days = (quota as { periodDays?: number }).periodDays ?? 7;
  return (
    <div className='space-y-4'>
      <SidebarQuotaMiniBar
        label={`Messages (${days} j glissants)`}
        used={quota.messagesUsed}
        limit={quota.messagesLimit}
      />
      <SidebarQuotaMiniBar
        label={`Tokens (${days} j glissants)`}
        used={quota.tokensUsed}
        limit={quota.tokensLimit}
        formatValue={formatQuotaTokens}
      />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function CorpusChatPage() {
  const chat = useCorpusChat();
  const [input, setInput] = useState('');
  const [contextType] = useState<ChatContextType>('general');
  const [renameTarget, setRenameTarget] = useState<ConversationRef | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConversationRef | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | HTMLElement | null>(null);

  const getComposerTextarea = useCallback((): HTMLTextAreaElement | null => {
    const ref = textareaRef.current;
    if (!ref) return null;
    if (ref instanceof HTMLTextAreaElement) return ref;
    return ref.querySelector('textarea');
  }, []);

  const resetComposerHeight = useCallback(
    (el: HTMLTextAreaElement, wrapper: HTMLElement | null) => {
      el.style.removeProperty('height');
      el.style.overflowY = 'hidden';
      if (wrapper) {
        wrapper.style.removeProperty('height');
        wrapper.style.minHeight = `${CHAT_COMPOSER_MIN_H_PX}px`;
        wrapper.style.alignItems = 'center';
      }
    },
    [],
  );

  const syncChatInputHeight = useCallback(() => {
    const el = getComposerTextarea();
    if (!el) return;
    const wrapper =
      (el.closest('[data-slot="input-wrapper"]') as HTMLElement | null) ?? el.parentElement;

    if (el.value.length === 0) {
      resetComposerHeight(el, wrapper);
      return;
    }

    el.style.height = '0px';
    const scrollH = el.scrollHeight;
    const multiline = scrollH > 28;
    const wrapperH = Math.min(
      CHAT_COMPOSER_MAX_H_PX,
      Math.max(CHAT_COMPOSER_MIN_H_PX, scrollH + CHAT_COMPOSER_WRAPPER_Y_PAD_PX),
    );

    if (!multiline) {
      resetComposerHeight(el, wrapper);
      return;
    }

    el.style.height = `${scrollH}px`;
    el.style.overflowY = wrapperH >= CHAT_COMPOSER_MAX_H_PX ? 'auto' : 'hidden';
    if (wrapper) {
      wrapper.style.height = `${wrapperH}px`;
      wrapper.style.minHeight = `${CHAT_COMPOSER_MIN_H_PX}px`;
      wrapper.style.alignItems = 'flex-start';
    }
  }, [getComposerTextarea, resetComposerHeight]);

  useEffect(() => {
    syncChatInputHeight();
  }, [input, syncChatInputHeight]);

  // Scroll to bottom quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || chat.isSending) return;
    setInput('');
    await chat.sendMessage({ message: msg, contextType });
  }, [input, chat, contextType]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === 'Enter' && e.shiftKey) {
      requestAnimationFrame(() => {
        syncChatInputHeight();
      });
    }
  };

  const handleSuggestion = async (prompt: string, ctx: ChatContextType) => {
    if (chat.isSending) return;
    chat.newConversation();
    setInput('');
    await chat.sendMessage({ message: prompt, contextType: ctx });
  };

  const isEmptyThread = !chat.activeConversationId && chat.messages.length === 0;

  return (
    <Layouts fullWidth noPadding noFooter>
      <div className='flex h-[calc(100vh-80px)] overflow-hidden'>
        {/* Contrainte largeur identique à la navbar */}
        <div className='mx-auto flex w-full max-w-screen-2xl flex-1 overflow-hidden px-5'>

        {/* ── Sidebar ── */}
        <ConversationList
          conversations={chat.conversations}
          activeId={chat.activeConversationId}
          isLoading={chat.isLoadingConversations}
          collapsed={sidebarCollapsed}
          quota={chat.quota}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          onOpen={chat.openConversation}
          onNew={chat.newConversation}
          onRequestRename={setRenameTarget}
          onRequestDelete={setDeleteTarget}
        />

        {/* ── Zone chat ── */}
        <div className='flex min-w-0 flex-1 flex-col'>

          {/* Entête + fondu vers le fil de messages */}
          <div className='relative shrink-0 bg-c1'>
            <header className='flex items-center justify-between px-6 py-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-c2 border-2 border-c3 text-action'>
                  <IconBot size={18} />
                </div>
                <div className='min-w-0 flex-1'>
                  <h1 className='min-w-0 truncate text-sm font-semibold text-c6'>
                    {chat.activeConversation?.title ?? 'EdiSem IA'}
                  </h1>
                  <p className='text-xs text-c4'>
                    {chat.activeConversation
                      ? `${chat.activeConversation.contextType === 'corpus' ? 'Contexte corpus' : 'Contexte général'} · Claude Haiku`
                      : 'Assistant de recherche sur les imaginaires de l\'IA'}
                  </p>
                </div>
              </div>
            </header>
            <div
              aria-hidden
              className='pointer-events-none absolute left-0 right-0 top-full z-10 h-8 bg-gradient-to-b from-c1 to-transparent'
            />
          </div>

          {/* Thread */}
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            {chat.isLoadingMessages && <ConversationThreadSkeleton />}

            {/* Écran vide — suggestions (uniquement si pas en train d'envoyer) */}
            {isEmptyThread && !chat.isLoadingMessages && !chat.isSending && (
              <div className='flex h-full flex-col items-center justify-center gap-8 pb-12'>
                <div className='flex flex-col items-center gap-3 text-center'>
                  <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-c2 border-2 border-c3 text-action'>
                    <IconBot size={28} />
                  </div>
                  <h2 className='text-lg font-semibold text-c6'>EdiSem IA</h2>
                  <p className='max-w-sm text-sm text-c4 leading-relaxed'>
                    Posez des questions sur le corpus de récits, les imaginaires de l'IA,
                    les questions guide, les mots-clés et plus encore.
                  </p>
                </div>

                {/* Suggestions */}
                <div className='grid max-w-2xl grid-cols-2 gap-2 w-full'>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.prompt}
                      type='button'
                      disabled={chat.isSending}
                      onClick={() => void handleSuggestion(s.prompt, s.ctx)}
                      className={`${outlineButtonClass} h-auto min-h-11 w-full !justify-start py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className='text-left leading-snug text-c6'>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages (affiché dès qu'il y a des messages OU qu'un envoi est en cours) */}
            {!chat.isLoadingMessages && (chat.messages.length > 0 || chat.isSending) && (
              <div className='mx-auto max-w-3xl flex flex-col gap-4 pb-4'>
                {chat.messages.map((msg, i) => (
                  <MessageBubble
                    key={`${msg.createdAt}-${i}-${msg.role}`}
                    role={msg.role}
                    content={msg.content}
                    stream={i === chat.streamMessageIndex}
                    onStreamDone={chat.clearStreamAnimation}
                    modelLabel={msg.modelLabel}
                  />
                ))}

                {/* Indicateur de frappe — l'assistant réfléchit */}
                {chat.isSending && (
                  <div className='flex gap-3 items-start'>
                    <div className='mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-c2 border-2 border-c3 text-action'>
                      <IconBot size={16} />
                    </div>
                    <div className='rounded-2xl rounded-tl-sm bg-c2 border border-c3 px-4 py-3'>
                      <div className='flex gap-1 items-center h-5'>
                        {[0, 1, 2].map((dotIdx) => (
                          <span
                            key={dotIdx}
                            className='h-1.5 w-1.5 rounded-full bg-action/60 animate-bounce'
                            style={{ animationDelay: `${dotIdx * 150}ms`, animationDuration: '1s' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Erreur */}
          {chat.error && (
            <div className='mx-6 mb-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-500'>
              {chat.error}
            </div>
          )}

          {/* Input */}
          <div className={`shrink-0 px-6 pt-5 ${CHAT_AREA_BOTTOM_PAD}`}>
            <div className='mx-auto flex max-w-3xl items-end gap-2'>
              <Textarea
                ref={textareaRef}
                value={input}
                onValueChange={(v) => {
                  setInput(v);
                  requestAnimationFrame(() => {
                    requestAnimationFrame(syncChatInputHeight);
                  });
                }}
                onKeyDown={handleKeyDown}
                onInput={() => requestAnimationFrame(syncChatInputHeight)}
                placeholder='Votre question… · Entrée · Maj+Entrée'
                minRows={1}
                maxRows={8}
                classNames={chatComposerTextareaClassNames}
                isDisabled={chat.isSending}
              />
              <button
                type='button'
                onClick={() => void handleSend()}
                disabled={!input.trim() || chat.isSending}
                aria-label='Envoyer'
                className={`${outlineIconButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <IconArrowUp size={17} />
              </button>
            </div>
          </div>
        </div>

        </div>{/* /max-w-screen-2xl */}
      </div>

      <RenameConversationModal
        isOpen={renameTarget !== null}
        initialTitle={renameTarget?.title ?? ''}
        onClose={() => setRenameTarget(null)}
        onConfirm={async (title) => {
          if (renameTarget) {
            await chat.renameConversation(renameTarget.id, title);
          }
        }}
      />

      <AlertModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void chat.removeConversation(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        type='danger'
        title='Supprimer la conversation'
        description={
          <>
            La conversation <strong>&quot;{deleteTarget?.title}&quot;</strong> et tous ses messages seront
            définitivement supprimés.
          </>
        }
        confirmLabel='Supprimer'
        cancelLabel='Annuler'
      />
    </Layouts>
  );
}
