/**
 * Export PDF professionnel pour les pages de récit (Edisem).
 * Page de couverture dédiée + contenu textuel/images (vidéos exclues) + pagination.
 */

import { jsPDF } from 'jspdf';
import { getRessourceLabel } from '@/config/resourceConfig';
import { isElementsPopupViewKey } from '@/config/linkedResourcePopupConfig';
import { formatFlexibleDateDisplay } from '@/lib/flexibleDate';
import { getResourceOwnerId } from '@/lib/resourceEditHelpers';
import { resolveResourceOwner } from '@/lib/resourceOwner';
import { getYouTubeVideoId, isValidYouTubeUrl } from '@/lib/utils';
import type { InternalFieldConfig, SimplifiedViewConfig, VocabGroupField } from '@/pages/generic/simplifiedConfig';
import { getAllOmekaValues, getOmekaValue, getResourceIds } from '@/pages/generic/simplifiedConfigAdapter';
import {
  fieldValue,
  flattenMediaUrls,
  getChildItem,
  viewCategoryEntries,
} from '@/services/itemPage';
import { OMEKA_API_BASE } from '@/utils/omekaApi';

const RECIT_PDF_RESOURCE_TYPES = new Set([
  'recit_scientifique',
  'recit_artistique',
  'recit_techno_industriel',
  'recit_citoyen',
  'recit_mediatique',
]);

const ENRICHED_REF_KEYS: Record<string, string> = {
  'dcterms:bibliographicCitation': 'bibliographicCitations',
  'dcterms:references': 'references',
  'dcterms:source': 'sources',
  'schema:review': 'reviews',
  'schema:documentation': 'documentations',
};

type RGB = [number, number, number];

const BRAND = {
  primary: [107, 83, 186] as RGB, // #6B53BA — couleur du logo Edisem
  primaryDark: [79, 59, 143] as RGB,
  text: [33, 32, 40] as RGB,
  muted: [110, 108, 122] as RGB,
  light: [243, 240, 250] as RGB,
  border: [225, 220, 238] as RGB,
  white: [255, 255, 255] as RGB,
};

const PAGE = {
  width: 210,
  height: 297,
  marginX: 18,
  marginTop: 26,
  footerY: 284,
};

const CONTENT_WIDTH = PAGE.width - PAGE.marginX * 2;
const CONTENT_BOTTOM_LIMIT = PAGE.footerY - 6;

/**
 * Logo Edisem/Arcanes (même icône que la navbar, `src/assets/svg/logo.svg`) reconstruit en SVG
 * "propre" (sans foreignObject/backdrop-filter — non rasterisable de façon fiable via canvas)
 * pour un rendu net dans le PDF. Rendu en haute résolution (512px) puis converti en PNG
 * (transparence + pas de compression avec perte) pour éviter tout flou/artefact JPEG sur les
 * traits fins du logo.
 */
const EDISEM_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 34 34">
<circle cx="17" cy="17" r="17" fill="#D9D9D9"/>
<circle cx="17" cy="17" r="14" fill="#6B53BA"/>
<path d="M18.1364 5.97727H15.8636L7.61365 24.5682H10.25L12.1818 20.0455H16.3182V25.7273H17.6818V20.0455H21.8182L23.75 24.5682H26.3864L18.1364 5.97727ZM17 8.75L19.5 14.6136H14.5L17 8.75ZM13.0455 18.0227L14.0227 15.75H16.3409V18.0227H13.0455ZM17.6818 18.0227V15.75H20L20.9773 18.0227H17.6818Z" fill="white"/>
</svg>`;

/**
 * Badge « lecture » superposé aux miniatures YouTube dans le PDF — même pictogramme caméra que
 * sur le site (`MovieIcon`). Pas de disque de fond, pas de contour : juste le picto blanc.
 */
const MOVIE_BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100">
<g transform="translate(22,22) scale(4.14)" fill="#ffffff">
<path fill-rule="evenodd" clip-rule="evenodd" d="M7 0C8.29165 0 9.33051 0 10.1781 0.0614808L7.76903 3.67502H4.48097L6.93098 0H7Z"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M1.02513 1.02513C1.90178 0.148469 3.23536 0.0215029 5.66696 0.00311427L3.21903 3.67502H0.0729258C0.176 2.44015 0.424762 1.62549 1.02513 1.02513Z"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M0 7C0 6.13428 0 5.38212 0.0185111 4.72502H13.9815C14 5.38212 14 6.13428 14 7C14 10.2998 14 11.9497 12.9749 12.9749C11.9497 14 10.2998 14 7 14C3.70017 14 2.05025 14 1.02513 12.9749C0 11.9497 0 10.2998 0 7ZM7.70977 7.40965C8.63659 8.00765 9.1 8.30665 9.1 8.75C9.1 9.19335 8.63659 9.49235 7.70978 10.0903C6.77031 10.6965 6.30056 10.9996 5.95028 10.7771C5.6 10.5545 5.6 9.95302 5.6 8.75C5.6 7.54698 5.6 6.94547 5.95028 6.72293C6.30056 6.50039 6.7703 6.80348 7.70977 7.40965Z"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M13.9271 3.67502C13.824 2.44015 13.5752 1.62549 12.9749 1.02513C12.5567 0.606999 12.0347 0.359418 11.3391 0.212819L9.03097 3.67502H13.9271Z"/>
</g>
</svg>`;

export interface RecitPdfExportInput {
  itemDetails: Record<string, unknown>;
  keywords: { id?: number; title: string }[];
  fields: InternalFieldConfig[];
  views: SimplifiedViewConfig[];
  resourceType?: string;
  resourceTypeLabel?: string | null;
  pageUrl?: string;
}

export function isRecitPdfResourceType(resourceType: string | undefined): boolean {
  return Boolean(resourceType && RECIT_PDF_RESOURCE_TYPES.has(resourceType));
}

// ============================================================================
// Helpers
// ============================================================================

function stripHtml(value: string): string {
  if (!value.includes('<')) return value;
  const el = document.createElement('div');
  el.innerHTML = value;
  return (el.textContent || el.innerText || '').replace(/\s+\n/g, '\n').trim();
}

function slugifyFilename(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'recit'
  );
}

function isVideoMediaUrl(url: string): boolean {
  if (!url) return true;
  if (isValidYouTubeUrl(url)) return true;
  return /\.(mp4|mov|webm|m4v|avi)(\?|#|$)/i.test(url);
}

function isImageMediaUrl(url: string): boolean {
  if (!url || isVideoMediaUrl(url)) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(url) || url.startsWith('data:image/');
}

/** Média affichable dans le PDF : image classique, ou vidéo YouTube représentée par sa miniature. */
type DisplayableMedia =
  | { kind: 'image'; url: string }
  | { kind: 'youtube'; thumbnailUrl: string; videoUrl: string; title?: string | null };

function getYouTubeHqThumbnail(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

/**
 * Récupère le titre d'une vidéo YouTube via l'API oEmbed. On reconstruit une URL canonique
 * (`watch?v=ID`) à partir de l'ID extrait, plutôt que de renvoyer l'URL brute telle que stockée
 * (qui peut contenir des paramètres additionnels ou un format `embed/` mal supporté par certains
 * proxys), et on tente deux endpoints en cascade (noembed.com, puis l'oEmbed officiel YouTube —
 * les deux supportent le CORS cross-origin) pour rester robuste si l'un des deux est indisponible.
 */
async function fetchYouTubeTitle(videoUrl: string): Promise<string | null> {
  const videoId = getYouTubeVideoId(videoUrl);
  const canonicalUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl;
  const endpoints = [
    `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`,
    `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      const data = await response.json();
      if (data?.error) continue; // noembed renvoie parfois {error: "..."} avec un statut 200
      if (typeof data?.title === 'string' && data.title.trim()) return data.title.trim();
    } catch {
      // on tente l'endpoint suivant
    }
  }
  console.warn(`[recitPdfExport] Impossible de récupérer le titre YouTube pour ${canonicalUrl}`);
  return null;
}

function classifyMediaUrl(url: string): DisplayableMedia | null {
  if (!url) return null;
  if (isValidYouTubeUrl(url)) {
    const thumbnailUrl = getYouTubeHqThumbnail(url);
    return thumbnailUrl ? { kind: 'youtube', thumbnailUrl, videoUrl: url } : null;
  }
  if (isImageMediaUrl(url)) return { kind: 'image', url };
  return null; // fichiers vidéo natifs (mp4/mov...) — non représentables sans lecteur, exclus
}

function getDisplayableMedias(urls: unknown): DisplayableMedia[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
    .map(classifyMediaUrl)
    .filter((m): m is DisplayableMedia => m !== null);
}

/** Enrichit les médias YouTube avec le titre réel de la vidéo (récupéré en parallèle). */
async function enrichYouTubeTitles(medias: DisplayableMedia[]): Promise<DisplayableMedia[]> {
  return Promise.all(
    medias.map(async (media) => {
      if (media.kind !== 'youtube') return media;
      const title = await fetchYouTubeTitle(media.videoUrl);
      return { ...media, title };
    }),
  );
}

function countNativeVideoFiles(urls: unknown): number {
  if (!Array.isArray(urls)) return 0;
  return urls.filter((u): u is string => typeof u === 'string' && isVideoMediaUrl(u) && !isValidYouTubeUrl(u)).length;
}

function truncateUrl(url: string, maxLength: number): string {
  return url.length > maxLength ? `${url.slice(0, maxLength - 1)}…` : url;
}

function formatAuthorsPlain(creators: { first_name?: string; last_name?: string }[]): string {
  return creators
    .filter((c) => c.last_name?.trim())
    .map((c) => {
      const last = c.last_name!.trim();
      const initial = c.first_name?.trim() ? `${c.first_name.trim()[0]}.` : '';
      return initial ? `${last}, ${initial}` : last;
    })
    .join(', ');
}

/** URL externe explicite d'une référence (source publiée hors plateforme). */
function getExternalReferenceUrl(ref: Record<string, unknown>): string | null {
  const raw = ref.externalLink ?? ref.uri;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/**
 * URL de la fiche interne Edisem associée à la référence. Quand la référence pointe vers une
 * ressource du corpus (bibliographie, médiagraphie...), `ref.url` contient une route RELATIVE de
 * l'app (ex. `/corpus/bibliographie/123`, via `getResourceUrl`) — il faut la résoudre en URL
 * absolue pour qu'elle soit utilisable comme lien cliquable dans le PDF.
 */
function getInternalReferenceUrl(ref: Record<string, unknown>): string | null {
  const raw = ref.url;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${trimmed}`;
  }
  return null;
}

function extractReferenceUrl(ref: Record<string, unknown>): string | null {
  return getExternalReferenceUrl(ref) ?? getInternalReferenceUrl(ref);
}

function formatReferencePlain(ref: Record<string, unknown>): string {
  const parts: string[] = [];
  const creator = ref.creator as { first_name?: string; last_name?: string }[] | undefined;
  if (Array.isArray(creator) && creator.length > 0) {
    parts.push(formatAuthorsPlain(creator));
  }
  if (ref.date) parts.push(`(${String(ref.date)})`);
  if (ref.title) parts.push(`${String(ref.title)}.`);
  if (ref.editor) parts.push(`Dans ${String(ref.editor)} (dir.).`);
  if (ref.publisher) parts.push(`${String(ref.publisher)}.`);
  if (ref.source) parts.push(String(ref.source));
  if (ref.pages) parts.push(`(${String(ref.pages)}).`);
  // Seule l'URL externe (source publiée) est affichée en texte — le lien interne vers la fiche
  // Edisem, lui, ne sert qu'à rendre la ligne cliquable (voir `addBulletList`).
  const externalUrl = getExternalReferenceUrl(ref);
  if (externalUrl) parts.push(truncateUrl(externalUrl, 70));
  return parts.filter(Boolean).join(' ').trim();
}

/** Texte d'une référence + son lien associé (le cas échéant), pour un rendu cliquable dans le PDF. */
function formatReferenceEntry(ref: Record<string, unknown>): { text: string; url: string | null } {
  const text = formatReferencePlain(ref) || String(ref.title || '');
  return { text, url: extractReferenceUrl(ref) };
}

async function loadImageDataUrl(
  url: string,
): Promise<{ dataUrl: string; format: 'JPEG'; width: number; height: number } | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx || !width || !height) return null;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      return { dataUrl, format: 'JPEG', width, height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

/**
 * Charge une image et la recadre façon CSS `object-fit: cover` pour remplir exactement un ratio
 * cible (rogne les côtés ou le haut/bas de l'image source selon son ratio d'origine) — utilisé
 * pour le bandeau plein cadre de la nouvelle page de couverture.
 */
async function loadImageDataUrlCover(
  url: string,
  targetRatio: number,
): Promise<{ dataUrl: string; format: 'JPEG' } | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });

      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      if (!naturalW || !naturalH) return null;

      const naturalRatio = naturalW / naturalH;
      let cropW = naturalW;
      let cropH = naturalH;
      if (naturalRatio > targetRatio) {
        cropW = naturalH * targetRatio;
      } else {
        cropH = naturalW / targetRatio;
      }
      const cropX = (naturalW - cropW) / 2;
      const cropY = (naturalH - cropH) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      return { dataUrl, format: 'JPEG' };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

/**
 * Dégradé vertical semi-transparent (PNG avec alpha) posé sur la photo de couverture pour
 * garantir la lisibilité du titre en blanc, plus sombre vers le bas.
 */
function createVerticalGradientPng(color: RGB, topAlpha: number, bottomAlpha: number): string {
  const w = 40;
  const h = 120;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${topAlpha})`);
  gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},${bottomAlpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  return canvas.toDataURL('image/png');
}

/**
 * Fond abstrait (dégradé diagonal + touches circulaires translucides) utilisé pour le bandeau de
 * couverture quand la fiche n'a pas d'image représentative — garde la couverture « designée »
 * même sans photo.
 */
function createHeroFallbackBackgroundPng(): string {
  const w = 240;
  const h = 190;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#8973D6');
  gradient.addColorStop(0.55, `rgb(${BRAND.primary.join(',')})`);
  gradient.addColorStop(1, `rgb(${BRAND.primaryDark.join(',')})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const blobs: [number, number, number, string][] = [
    [w * 0.84, h * 0.24, h * 0.5, 'rgba(255,255,255,0.08)'],
    [w * 0.1, h * 0.82, h * 0.34, 'rgba(255,255,255,0.07)'],
    [w * 0.55, h * 0.92, h * 0.6, 'rgba(0,0,0,0.12)'],
  ];
  blobs.forEach(([cx, cy, r, fill]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  });

  return canvas.toDataURL('image/png');
}

/**
 * Charge un SVG inline et le rasterise en PNG haute résolution (transparence préservée).
 * Utilisé pour le logo : le JPEG (avec perte, sans alpha) produit des artefacts de compression
 * visibles sur les traits fins d'une icône, contrairement au PNG.
 */
async function loadIconAsPngDataUrl(svgMarkup: string, size = 256): Promise<string | null> {
  try {
    const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUri;
    });

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function fetchChildItemFallbackText(resourceId: string | number, viewKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${OMEKA_API_BASE}items/${resourceId}`);
    if (!response.ok) return null;
    const data = await response.json();

    if (viewKey === 'AnalyseCritique') {
      return data['dcterms:description']?.[0]?.['@value'] ?? null;
    }
    if (isElementsPopupViewKey(viewKey)) {
      return (
        data['dcterms:description']?.[0]?.['@value'] ??
        data['fiafcore:hasImageCharacteristic']?.[0]?.['@value'] ??
        null
      );
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchLinkedItemContent(
  resourceId: number,
  viewKey: string,
  fallbackTitle: string,
): Promise<{ title: string; paragraphs: string[]; medias: DisplayableMedia[] }> {
  const child = await getChildItem(resourceId);
  const paragraphs: string[] = [];
  const medias = child ? await enrichYouTubeTitles(getDisplayableMedias(flattenMediaUrls(child.associatedMedia))) : [];

  if (!child) {
    return { title: fallbackTitle, paragraphs, medias };
  }

  const title = child.title || fallbackTitle;

  if (viewKey === 'AnalyseCritique') {
    const text = fieldValue(child.fields.argument) ?? (await fetchChildItemFallbackText(resourceId, viewKey));
    if (text?.trim()) paragraphs.push(stripHtml(text));
    return { title, paragraphs, medias };
  }

  if (isElementsPopupViewKey(viewKey)) {
    const description = fieldValue(child.fields.description) ?? (await fetchChildItemFallbackText(resourceId, viewKey));
    if (description?.trim()) paragraphs.push(stripHtml(description));
    viewCategoryEntries(child.views.Analyse).forEach((entry) => {
      if (entry.values.length > 0) {
        paragraphs.push(`${entry.label}\n${entry.values.join(', ')}`);
      }
    });
    return { title, paragraphs, medias };
  }

  const categories = viewCategoryEntries(child.views.Analyse);
  if (categories.length > 0) {
    categories.forEach((entry) => {
      if (entry.values.length > 0) {
        paragraphs.push(`${entry.label}\n${entry.values.join(', ')}`);
      }
    });
    return { title, paragraphs, medias };
  }

  const fallback = await fetchChildItemFallbackText(resourceId, viewKey);
  if (fallback?.trim()) paragraphs.push(stripHtml(fallback));

  return { title, paragraphs, medias };
}

function getPersonDisplayName(person: Record<string, unknown>): string {
  if (person.title && String(person.title).trim()) return String(person.title);
  if (person.name && String(person.name).trim()) return String(person.name);
  const first = String(person.firstname || person.firstName || '').trim();
  const last = String(person.lastname || person.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || 'Contributeur';
}

function resolveContributors(itemDetails: Record<string, unknown>, contributorProperties?: string[]): string[] {
  const resourceCache = (itemDetails.resourceCache || {}) as Record<number, Record<string, unknown>>;
  const seen = new Set<number>();
  const names: string[] = [];

  const addFromProperty = (property: string) => {
    getResourceIds(itemDetails, property).forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      const cached = resourceCache[id];
      if (cached) names.push(getPersonDisplayName(cached));
    });
  };

  if (contributorProperties?.length) {
    contributorProperties.forEach(addFromProperty);
  } else {
    ['schema:agent', 'dcterms:creator'].forEach(addFromProperty);
  }

  return names;
}

/** Nom d'affichage du créateur (o:owner) de la fiche — déjà résolu par l'enrichissement de la
 * page (`itemDetails.resourceOwner`) dans le cas courant, avec un fallback qui résout via l'API
 * si jamais l'export était appelé avant que cet enrichissement n'ait eu lieu. */
async function resolveOwnerDisplayName(itemDetails: Record<string, unknown>): Promise<string | null> {
  const cached = itemDetails.resourceOwner as { displayName?: string } | undefined;
  if (cached?.displayName?.trim()) return cached.displayName.trim();

  const ownerId = getResourceOwnerId(itemDetails);
  if (ownerId == null) return null;
  const resolved = await resolveResourceOwner(ownerId, itemDetails['o:owner']);
  return resolved?.displayName?.trim() || null;
}

function getVocabValues(itemDetails: Record<string, unknown>, property: string): string[] {
  const raw = itemDetails[property];
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === 'string' ? v : v?.['@value'] ?? null))
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  }
  return [];
}

function getDetailFields(fields: InternalFieldConfig[]): InternalFieldConfig[] {
  return fields.filter((f) => f.zone === 'details' && f.editable !== false);
}

// ============================================================================
// PDF Builder
// ============================================================================

class RecitPdfBuilder {
  private doc: jsPDF;
  private y = PAGE.marginTop;
  private logoDataUrl: string | null = null;
  private playBadgeDataUrl: string | null = null;
  private readonly pageUrl: string;
  private readonly resourceTypeLabel: string;
  private readonly generatedAt: string;

  constructor(pageUrl: string, resourceTypeLabel: string) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    this.pageUrl = pageUrl;
    this.resourceTypeLabel = resourceTypeLabel;
    this.generatedAt = new Date().toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async init(title: string): Promise<void> {
    this.logoDataUrl = await loadIconAsPngDataUrl(EDISEM_LOGO_SVG, 256);
    this.playBadgeDataUrl = await loadIconAsPngDataUrl(MOVIE_BADGE_SVG, 200);
    this.doc.setProperties({
      title,
      subject: this.resourceTypeLabel,
      author: 'EDISEM — ARCANES',
      creator: 'EDISEM',
    });
  }

  private drawLogoBadge(x: number, yTop: number, size: number): void {
    if (this.logoDataUrl) {
      // Logo transparent (déjà pourvu de son propre anneau/disque) — posé directement sur la
      // bande de couleur, comme dans la navbar. Pas de fond blanc superflu.
      this.doc.addImage(this.logoDataUrl, 'PNG', x, yTop, size, size);
    } else {
      const cx = x + size / 2;
      const cy = yTop + size / 2;
      this.doc.setFillColor(...BRAND.white);
      this.doc.circle(cx, cy, size / 2, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(size * 0.5);
      this.doc.setTextColor(...BRAND.primary);
      this.doc.text('E', cx, cy + size * 0.17, { align: 'center' });
    }
  }

  /** Superpose le badge « lecture » (caméra) au centre d'une image, pour signaler une vidéo YouTube. */
  private overlayPlayBadge(x: number, yTop: number, w: number, h: number): void {
    if (!this.playBadgeDataUrl) return;
    const size = Math.min(w, h, 16);
    const bx = x + (w - size) / 2;
    const by = yTop + (h - size) / 2;
    this.doc.addImage(this.playBadgeDataUrl, 'PNG', bx, by, size, size);
  }

  // --------------------------------------------------------------------------
  // Cover page
  // --------------------------------------------------------------------------

  async buildCoverPage(opts: {
    title: string;
    typeLabel: string;
    dateDisplay: string;
    contributors: string[];
    addedByLabel: string | null;
    externalLink: { label: string; value: string } | null;
    pageUrl: string;
    heroMedia: DisplayableMedia | null;
  }): Promise<void> {
    const { title, typeLabel, dateDisplay, contributors, addedByLabel, externalLink, pageUrl, heroMedia } = opts;

    const heroHeight = 156;

    await this.renderCoverHeroHeader(heroMedia, heroHeight);
    this.renderCoverTitleOverlay(title, typeLabel, heroHeight);
    this.renderCoverHeroBottomAccent(heroHeight);

    // Contenu sous le bandeau, en page blanche épurée (avertissement et mots-clés sont renvoyés
    // dans « Informations générales », juste après).
    this.y = heroHeight + 16;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text('Plateforme de recherche ARCANES — Corpus des récits', PAGE.marginX, this.y);
    this.y += 12;

    const metaItems: { label: string; value: string }[] = [];
    if (dateDisplay.trim()) metaItems.push({ label: 'Date', value: dateDisplay });
    if (contributors.join(', ').trim()) metaItems.push({ label: 'Contributeur(s)', value: contributors.join(', ') });
    if (addedByLabel) metaItems.push({ label: 'Ajouté par', value: addedByLabel });
    if (externalLink) metaItems.push({ label: externalLink.label, value: externalLink.value });

    this.renderCoverMetaBar(metaItems);
    this.y += 6;

    this.renderCoverCta(pageUrl);
  }

  /** Bandeau plein cadre en tête de couverture : photo recadrée + dégradé, ou fond abstrait si
   * la fiche n'a pas d'image représentative — avec logo/wordmark et date de génération. */
  private async renderCoverHeroHeader(heroMedia: DisplayableMedia | null, heroHeight: number): Promise<void> {
    const w = PAGE.width;
    let usedPhoto = false;

    if (heroMedia) {
      const sourceUrl = heroMedia.kind === 'youtube' ? heroMedia.thumbnailUrl : heroMedia.url;
      const cropped = await loadImageDataUrlCover(sourceUrl, w / heroHeight);
      if (cropped) {
        this.doc.addImage(cropped.dataUrl, cropped.format, 0, 0, w, heroHeight);
        const overlay = createVerticalGradientPng(BRAND.primaryDark, 0.22, 0.86);
        if (overlay) this.doc.addImage(overlay, 'PNG', 0, 0, w, heroHeight);
        usedPhoto = true;
      }
    }

    if (!usedPhoto) {
      const bg = createHeroFallbackBackgroundPng();
      if (bg) this.doc.addImage(bg, 'PNG', 0, 0, w, heroHeight);
    }

    if (usedPhoto && heroMedia?.kind === 'youtube') {
      this.doc.link(0, 0, w, heroHeight, { url: heroMedia.videoUrl });
      this.overlayPlayBadge(w - 32, heroHeight - 32, 16, 16);
    }

    // Logo + wordmark, coin supérieur gauche — alignés dans la hauteur avec la date à droite.
    const headerBaseline = 17.5;
    this.drawLogoBadge(PAGE.marginX, headerBaseline - 6.5, 8.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(...BRAND.white);
    this.doc.text('EDISEM', PAGE.marginX + 11.5, headerBaseline);

    // Date de génération, coin supérieur droit
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...BRAND.white);
    this.doc.text(`Fiche générée le ${this.generatedAt}`, w - PAGE.marginX, headerBaseline, { align: 'right' });
  }

  /** Badge de type + titre, ancrés en bas du bandeau héros (traitement « couverture de magazine »). */
  private renderCoverTitleOverlay(title: string, typeLabel: string, heroHeight: number): void {
    const maxTextWidth = PAGE.width - PAGE.marginX * 2;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(27);
    const titleLines = this.doc.splitTextToSize(title, maxTextWidth) as string[];
    const titleLineHeight = 11;
    const lastBaselineY = heroHeight - 18;
    const firstBaselineY = lastBaselineY - (titleLines.length - 1) * titleLineHeight;

    const badgeLabel = typeLabel.toUpperCase();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    const badgeTextWidth = this.doc.getTextWidth(badgeLabel);
    const badgeWidth = badgeTextWidth + 8;
    const badgeY = firstBaselineY - titleLineHeight - 3;
    this.doc.setFillColor(...BRAND.white);
    this.doc.roundedRect(PAGE.marginX, badgeY - 5.5, badgeWidth, 8, 4, 4, 'F');
    this.doc.setTextColor(...BRAND.primaryDark);
    this.doc.text(badgeLabel, PAGE.marginX + badgeWidth / 2, badgeY, { align: 'center' });

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(27);
    this.doc.setTextColor(...BRAND.white);
    this.doc.text(titleLines, PAGE.marginX, firstBaselineY);
  }

  /** Fin nette et droite du bandeau héros — simple liseré d'accent, pas de découpe diagonale. */
  private renderCoverHeroBottomAccent(heroHeight: number): void {
    this.doc.setFillColor(...BRAND.primaryDark);
    this.doc.rect(0, heroHeight - 2, PAGE.width, 2, 'F');
  }

  /** Barre de métadonnées façon « fiche technique » : colonnes égales séparées par un filet fin. */
  private renderCoverMetaBar(items: { label: string; value: string }[]): void {
    if (items.length === 0) return;
    const cols = items.length > 3 ? Math.ceil(items.length / 2) : items.length;
    const gap = 8;
    const colWidth = (CONTENT_WIDTH - gap * (cols - 1)) / cols;

    const rows: { label: string; value: string }[][] = [];
    for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));

    rows.forEach((row) => {
      const valueLines = row.map((item) => this.doc.splitTextToSize(item.value, colWidth) as string[]);
      const rowHeight = Math.max(...valueLines.map((l) => l.length)) * 4.6 + 11;

      row.forEach((item, idx) => {
        const x = PAGE.marginX + idx * (colWidth + gap);
        if (idx > 0) {
          this.doc.setDrawColor(...BRAND.border);
          this.doc.setLineWidth(0.3);
          this.doc.line(x - gap / 2, this.y - 3, x - gap / 2, this.y + rowHeight - 7);
        }
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(...BRAND.primary);
        this.doc.text(item.label.toUpperCase(), x, this.y);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(10.5);
        this.doc.setTextColor(...BRAND.text);
        this.doc.text(valueLines[idx], x, this.y + 6);
      });

      this.y += rowHeight;
    });
  }

  /** Bouton d'appel à l'action « Consulter la fiche » — sobre et compact, largeur toujours
   * bornée pour ne jamais risquer de dépasser la page quel que soit le contenu du texte. */
  private renderCoverCta(pageUrl: string): void {
    const label = 'CONSULTER LA FICHE SUR EDISEM';
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    const textWidth = this.doc.getTextWidth(label);
    const paddingX = 6;
    const btnWidth = Math.min(textWidth + paddingX * 2, CONTENT_WIDTH, 95);
    const btnHeight = 9;

    this.doc.setFillColor(...BRAND.primary);
    this.doc.roundedRect(PAGE.marginX, this.y, btnWidth, btnHeight, 1.8, 1.8, 'F');
    this.doc.setTextColor(...BRAND.white);
    this.doc.text(label, PAGE.marginX + btnWidth / 2, this.y + btnHeight / 2 + 1, { align: 'center' });
    this.doc.link(PAGE.marginX, this.y, btnWidth, btnHeight, { url: pageUrl });

    this.y += btnHeight + 5;

    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text(truncateUrl(pageUrl, 95), PAGE.marginX, this.y);
  }

  // --------------------------------------------------------------------------
  // Content pages
  // --------------------------------------------------------------------------

  private ensureSpace(heightMm: number): void {
    if (this.y + heightMm <= CONTENT_BOTTOM_LIMIT) return;
    this.doc.addPage();
    this.y = PAGE.marginTop;
  }

  addSectionTitle(title: string): void {
    // Chaque grande partie (« Informations générales », « Analyse critique », « Éléments
    // esthétiques »...) démarre systématiquement en haut d'une page dédiée, pour une lecture
    // « chapitrée » claire — sauf si on s'y trouve déjà (ex. juste après la couverture).
    if (this.y > PAGE.marginTop) {
      this.doc.addPage();
      this.y = PAGE.marginTop;
    }
    this.doc.setFillColor(...BRAND.light);
    this.doc.roundedRect(PAGE.marginX, this.y - 5.5, CONTENT_WIDTH, 9, 1.5, 1.5, 'F');
    this.doc.setFillColor(...BRAND.primary);
    this.doc.rect(PAGE.marginX, this.y - 5.5, 1.4, 9, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11.5);
    this.doc.setTextColor(...BRAND.primary);
    this.doc.text(title, PAGE.marginX + 4.5, this.y + 0.7);
    this.y += 10.5;
  }

  /**
   * `keepWithNextHeight` réserve un minimum d'espace après le titre pour éviter qu'il ne se
   * retrouve seul, orphelin, sur la dernière ligne d'une page. La pagination du contenu qui suit
   * (paragraphes, images) est gérée indépendamment et correctement par `renderWrappedLines` /
   * `addMedia`, donc cette réserve n'a plus besoin d'englober tout le contenu à venir.
   */
  addSubsectionTitle(title: string, keepWithNextHeight = 14): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10.5);
    const lines = this.doc.splitTextToSize(title, CONTENT_WIDTH) as string[];
    const titleHeight = lines.length * 5.2;
    this.ensureSpace(titleHeight + keepWithNextHeight);
    this.doc.setTextColor(...BRAND.text);
    this.doc.text(lines, PAGE.marginX, this.y);
    this.y += titleHeight + 1.5;
  }

  addSpacer(height = 4): void {
    this.y += height;
  }

  /**
   * Calcule combien de lignes (parmi les `remaining` qui restent à poser) peuvent tenir sur la
   * page courante, avec gestion des veuves/orphelines : jamais une seule ligne isolée en bas de
   * la page courante (orpheline) ni une seule ligne isolée seule en haut de la page suivante
   * (veuve, ex. « réelle dans ses effets. » plantée juste sous l'en-tête) — on préfère dans les
   * deux cas regrouper au moins 2 lignes ensemble, en faisant sauter la page si besoin.
   */
  private computeSafeChunkSize(remaining: number, lineHeight: number): number {
    let availableLines = Math.max(0, Math.floor((CONTENT_BOTTOM_LIMIT - this.y) / lineHeight));

    if (availableLines === 0 || (availableLines === 1 && remaining > 1)) {
      this.doc.addPage();
      this.y = PAGE.marginTop;
      availableLines = Math.max(1, Math.floor((CONTENT_BOTTOM_LIMIT - this.y) / lineHeight));
    }

    let chunkSize = Math.min(availableLines, remaining);
    // Éviterait de laisser 1 seule ligne pour la page suivante (veuve) : on en garde une de plus
    // ici, sauf si ça ferait retomber ce bloc à 1 ligne (même problème, mais en bas de page).
    if (chunkSize > 2 && remaining - chunkSize === 1) {
      chunkSize -= 1;
    }
    return chunkSize;
  }

  /**
   * Dessine des lignes déjà « wrappées » en paginant automatiquement si elles dépassent la page
   * courante — un bloc de texte long (ex. une analyse critique complète) doit pouvoir continuer
   * sur la/les page(s) suivante(s) au lieu d'être traité comme un bloc atomique poussé en entier
   * vers une nouvelle page (ce qui laissait un grand vide sous le titre resté sur la page précédente).
   */
  private renderWrappedLines(lines: string[], x: number, lineHeight: number): void {
    let index = 0;
    while (index < lines.length) {
      const chunkSize = this.computeSafeChunkSize(lines.length - index, lineHeight);
      const chunk = lines.slice(index, index + chunkSize);
      this.doc.text(chunk, x, this.y);
      this.y += chunk.length * lineHeight;
      index += chunk.length;
    }
  }

  addParagraph(text: string, indent = 0): void {
    const clean = stripHtml(text).trim();
    if (!clean) return;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...BRAND.text);
    const lines = this.doc.splitTextToSize(clean, CONTENT_WIDTH - indent) as string[];
    this.renderWrappedLines(lines, PAGE.marginX + indent, 4.6);
    this.y += 2.5;
  }

  /**
   * `items` peut être une simple liste de textes, ou des entrées `{ text, url }` — quand une URL
   * est fournie, toute la ligne de la référence devient cliquable (ouvre le lien associé) et est
   * mise en évidence dans la couleur Edisem, comme les autres liens du document.
   */
  addBulletList(items: (string | { text: string; url?: string | null })[]): void {
    const filtered = items
      .map((i) => (typeof i === 'string' ? { text: i, url: null } : { text: i.text, url: i.url ?? null }))
      .map((i) => ({ text: stripHtml(i.text).trim(), url: i.url }))
      .filter((i) => i.text);
    if (filtered.length === 0) return;

    this.doc.setFontSize(10);
    const lineHeight = 4.6;

    filtered.forEach(({ text, url }) => {
      this.doc.setFont('helvetica', 'normal');
      const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - 8) as string[];
      let index = 0;
      let isFirstLine = true;
      while (index < lines.length) {
        const chunkSize = this.computeSafeChunkSize(lines.length - index, lineHeight);
        const chunk = lines.slice(index, index + chunkSize);
        if (isFirstLine) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setTextColor(...BRAND.primary);
          this.doc.text('•', PAGE.marginX + 1, this.y);
          isFirstLine = false;
        }
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...(url ? BRAND.primaryDark : BRAND.text));
        this.doc.text(chunk, PAGE.marginX + 6, this.y);
        if (url) {
          this.doc.link(PAGE.marginX + 6, this.y - 3.6, CONTENT_WIDTH - 8, chunk.length * lineHeight, { url });
        }
        this.y += chunk.length * lineHeight;
        index += chunk.length;
      }
      this.y += 1.5;
    });
    this.y += 1.5;
  }

  addNote(text: string): void {
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(9);
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - 8);
    const boxHeight = lines.length * 4.3 + 6;
    this.ensureSpace(boxHeight + 2);
    this.doc.setFillColor(...BRAND.light);
    this.doc.roundedRect(PAGE.marginX, this.y - 4, CONTENT_WIDTH, boxHeight, 2, 2, 'F');
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text(lines, PAGE.marginX + 4, this.y);
    this.y += boxHeight + 3;
  }

  /**
   * Dessine un média affichable (image, ou miniature YouTube). Pour une vidéo YouTube, superpose
   * le badge « lecture » et rend l'image entière cliquable vers l'URL de la vidéo.
   */
  async addMedia(media: DisplayableMedia, caption?: string): Promise<void> {
    const sourceUrl = media.kind === 'youtube' ? media.thumbnailUrl : media.url;
    const loaded = await loadImageDataUrl(sourceUrl);
    if (!loaded) return;

    const maxWidth = CONTENT_WIDTH;
    const maxHeight = 85;
    const ratio = loaded.width / loaded.height || 16 / 9;
    let drawWidth = maxWidth;
    let drawHeight = drawWidth / ratio;
    if (drawHeight > maxHeight) {
      drawHeight = maxHeight;
      drawWidth = drawHeight * ratio;
    }

    const finalCaption =
      media.kind === 'youtube'
        ? `${media.title?.trim() || caption || 'Vidéo YouTube'} — cliquez sur la miniature pour la visionner en ligne.`
        : caption;

    this.ensureSpace(drawHeight + (finalCaption ? 9 : 2));
    const x = PAGE.marginX + (CONTENT_WIDTH - drawWidth) / 2;
    this.doc.setDrawColor(...BRAND.border);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x - 1, this.y - 1, drawWidth + 2, drawHeight + 2, 1.5, 1.5, 'S');
    this.doc.addImage(loaded.dataUrl, loaded.format, x, this.y, drawWidth, drawHeight);

    if (media.kind === 'youtube') {
      this.overlayPlayBadge(x, this.y, drawWidth, drawHeight);
      this.doc.link(x, this.y, drawWidth, drawHeight, { url: media.videoUrl });
    }

    this.y += drawHeight + 2;

    if (finalCaption) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(...BRAND.muted);
      // Alignée avec l'image (x/largeur réelle), pas avec la marge de page — l'image peut être
      // centrée et donc plus étroite que la largeur de contenu totale.
      const capLines = this.doc.splitTextToSize(finalCaption, drawWidth);
      this.doc.text(capLines, x, this.y + 3);
      this.y += capLines.length * 4 + 5;
    } else {
      this.y += 3;
    }
  }

  private static readonly GRID_GAP = 5;
  private static readonly GRID_MAX_HEIGHT = 60;

  /**
   * Dessine une rangée de 1 ou 2 médias en grille 2 colonnes, pour « Autres illustrations » :
   * par paire quand il y a plusieurs éléments, la dernière rangée d'un nombre impair ne
   * contenant qu'un seul média placé dans la colonne de gauche (plutôt qu'un grand bloc centré).
   */
  async addMediaGridRow(items: { media: DisplayableMedia; caption?: string }[]): Promise<void> {
    const colWidth = (CONTENT_WIDTH - RecitPdfBuilder.GRID_GAP) / 2;
    const maxHeight = RecitPdfBuilder.GRID_MAX_HEIGHT;

    const prepared = await Promise.all(
      items.map(async (item) => {
        const sourceUrl = item.media.kind === 'youtube' ? item.media.thumbnailUrl : item.media.url;
        const loaded = await loadImageDataUrl(sourceUrl);
        if (!loaded) return null;

        const ratio = loaded.width / loaded.height || 16 / 9;
        let drawWidth = colWidth;
        let drawHeight = drawWidth / ratio;
        if (drawHeight > maxHeight) {
          drawHeight = maxHeight;
          drawWidth = drawHeight * ratio;
        }

        const finalCaption =
          item.media.kind === 'youtube'
            ? `${item.media.title?.trim() || item.caption || 'Vidéo YouTube'} — cliquez pour visionner en ligne.`
            : item.caption;

        return { loaded, drawWidth, drawHeight, finalCaption, media: item.media };
      }),
    );

    const valid = prepared.filter((p): p is NonNullable<typeof p> => p !== null);
    if (valid.length === 0) return;

    const captionHeights = valid.map((p) => {
      if (!p.finalCaption) return 0;
      const lines = this.doc.splitTextToSize(p.finalCaption, p.drawWidth) as string[];
      return lines.length * 4 + 5;
    });
    const rowImageHeight = Math.max(...valid.map((p) => p.drawHeight));
    const rowHeight = rowImageHeight + Math.max(...captionHeights) + 2;

    this.ensureSpace(rowHeight);
    const rowTop = this.y;

    valid.forEach((p, colIndex) => {
      const colX = PAGE.marginX + colIndex * (colWidth + RecitPdfBuilder.GRID_GAP);
      // Centre l'image dans sa colonne si son ratio la rend plus étroite que colWidth.
      const x = colX + (colWidth - p.drawWidth) / 2;

      this.doc.setDrawColor(...BRAND.border);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x - 1, rowTop - 1, p.drawWidth + 2, p.drawHeight + 2, 1.5, 1.5, 'S');
      this.doc.addImage(p.loaded.dataUrl, p.loaded.format, x, rowTop, p.drawWidth, p.drawHeight);

      if (p.media.kind === 'youtube') {
        this.overlayPlayBadge(x, rowTop, p.drawWidth, p.drawHeight);
        this.doc.link(x, rowTop, p.drawWidth, p.drawHeight, { url: p.media.videoUrl });
      }

      if (p.finalCaption) {
        this.doc.setFont('helvetica', 'italic');
        this.doc.setFontSize(8.5);
        this.doc.setTextColor(...BRAND.muted);
        const lines = this.doc.splitTextToSize(p.finalCaption, p.drawWidth) as string[];
        this.doc.text(lines, x, rowTop + rowImageHeight + 5);
      }
    });

    this.y = rowTop + rowHeight + 4;
  }

  startNewPageIfNeeded(): void {
    // Force le contenu principal sur une page dédiée après la couverture.
    this.doc.addPage();
    this.y = PAGE.marginTop;
  }

  // --------------------------------------------------------------------------
  // Header / Footer (appliqués une fois le document complet, sur pages 2..N)
  // --------------------------------------------------------------------------

  private drawContentHeader(): void {
    this.doc.setFillColor(...BRAND.primary);
    this.doc.rect(0, 0, PAGE.width, 1.6, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...BRAND.primary);
    this.doc.text('EDISEM', PAGE.marginX, 13);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text(this.resourceTypeLabel, PAGE.width - PAGE.marginX, 13, { align: 'right' });

    this.doc.setDrawColor(...BRAND.border);
    this.doc.setLineWidth(0.25);
    this.doc.line(PAGE.marginX, 17, PAGE.width - PAGE.marginX, 17);
  }

  private drawContentFooter(pageLabel: string): void {
    this.doc.setDrawColor(...BRAND.border);
    this.doc.setLineWidth(0.25);
    this.doc.line(PAGE.marginX, PAGE.footerY - 4, PAGE.width - PAGE.marginX, PAGE.footerY - 4);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text('edisem.arcanes.ca', PAGE.marginX, PAGE.footerY);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...BRAND.primary);
    this.doc.text(pageLabel, PAGE.width / 2, PAGE.footerY, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...BRAND.muted);
    const shortUrl = truncateUrl(this.pageUrl, 48);
    this.doc.textWithLink(shortUrl, PAGE.width - PAGE.marginX, PAGE.footerY, { url: this.pageUrl, align: 'right' });
  }

  private drawCoverFooter(): void {
    this.doc.setDrawColor(...BRAND.border);
    this.doc.setLineWidth(0.25);
    this.doc.line(PAGE.marginX, PAGE.footerY - 4, PAGE.width - PAGE.marginX, PAGE.footerY - 4);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text('edisem.arcanes.ca', PAGE.marginX, PAGE.footerY);
    this.doc.text('Document généré automatiquement', PAGE.width - PAGE.marginX, PAGE.footerY, { align: 'right' });
  }

  save(filename: string): void {
    const total = this.doc.getNumberOfPages();
    for (let i = 2; i <= total; i += 1) {
      this.doc.setPage(i);
      this.drawContentHeader();
      this.drawContentFooter(`Page ${i - 1} / ${Math.max(total - 1, 1)}`);
    }
    this.doc.setPage(1);
    this.drawCoverFooter();
    this.doc.save(filename);
  }
}

// ============================================================================
// View section rendering
// ============================================================================

async function buildViewSection(
  builder: RecitPdfBuilder,
  view: SimplifiedViewConfig,
  itemDetails: Record<string, unknown>,
): Promise<void> {
  const resourceCache = (itemDetails.resourceCache || {}) as Record<number, Record<string, unknown>>;

  switch (view.renderType) {
    case 'items': {
      const ids = getResourceIds(itemDetails, view.property || '');
      if (ids.length === 0) return;

      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        const cached = resourceCache[id];
        const fallbackTitle = cached?.title ? String(cached.title) : `Élément #${id}`;
        const content = await fetchLinkedItemContent(id, view.key, fallbackTitle);

        // Réserve assez d'espace après le titre pour qu'il ne se retrouve jamais seul en bas de
        // page : la taille max. d'un média (85mm) s'il y en a, sinon quelques lignes de texte.
        const keepWithNext = content.medias.length > 0 ? 92 : content.paragraphs.length > 0 ? 14 : 8;
        builder.addSubsectionTitle(content.title, keepWithNext);

        // Média(s) placé(s) entre le titre et le texte de description — grille si plusieurs.
        await renderMediaCollection(builder, content.medias.slice(0, 3));

        content.paragraphs.forEach((p) => builder.addParagraph(p));

        if (content.paragraphs.length === 0 && content.medias.length === 0) {
          builder.addParagraph('(Contenu non disponible pour export — consultez la version en ligne.)');
        }

        if (i < ids.length - 1) builder.addSpacer(4);
      }
      break;
    }

    case 'references': {
      const enrichedKey = ENRICHED_REF_KEYS[view.property || ''] ?? view.property;
      const refs = itemDetails[enrichedKey ?? ''];
      if (!Array.isArray(refs) || refs.length === 0) return;

      const mediagraphies = refs.filter((ref) => ref?.type === 'mediagraphie' || ref?.mediagraphyType);
      const bibliographies = refs.filter((ref) => !mediagraphies.includes(ref));

      if (mediagraphies.length > 0) {
        builder.addSubsectionTitle('Médias');
        builder.addBulletList(mediagraphies.map((ref) => formatReferenceEntry(ref as Record<string, unknown>)));
      }

      if (bibliographies.length > 0) {
        builder.addSubsectionTitle('Bibliographies');
        builder.addBulletList(bibliographies.map((ref) => formatReferenceEntry(ref as Record<string, unknown>)));
      }
      break;
    }

    case 'text': {
      const text = getOmekaValue(itemDetails, view.property || '');
      if (typeof text === 'string' && text.trim()) {
        builder.addParagraph(text);
      }
      break;
    }

    case 'vocabGroup': {
      (view.vocabFields ?? []).forEach((field: VocabGroupField) => {
        if (field.type === 'textarea') {
          const text = getOmekaValue(itemDetails, field.property);
          if (typeof text === 'string' && text.trim()) {
            builder.addSubsectionTitle(field.label);
            builder.addParagraph(text);
          }
        } else if (field.type === 'customVocab') {
          const values = getVocabValues(itemDetails, field.property);
          if (values.length > 0) {
            builder.addSubsectionTitle(field.label);
            builder.addParagraph(values.join(', '));
          }
        }
      });
      break;
    }

    case 'categories': {
      (view.categories ?? []).forEach((category) => {
        let categoryHasContent = false;
        category.subcategories.forEach((sub) => {
          const values = getAllOmekaValues(itemDetails, sub.property).filter((v) => v.trim());
          if (values.length === 0) return;
          if (!categoryHasContent && view.categories && view.categories.length > 1) {
            builder.addSubsectionTitle(category.title);
            categoryHasContent = true;
          }
          builder.addSubsectionTitle(sub.label);
          values.forEach((val) => builder.addParagraph(val));
        });
      });
      break;
    }

    default:
      break;
  }
}

/**
 * Affiche une collection de médias avec le système de grille utilisé partout dans le document :
 * un seul média reste en grand format centré, plusieurs médias sont posés par paires en grille
 * 2 colonnes (la dernière rangée d'un nombre impair ne contenant qu'un média, à gauche).
 */
async function renderMediaCollection(
  builder: RecitPdfBuilder,
  medias: DisplayableMedia[],
  captionFor?: (media: DisplayableMedia, index: number) => string | undefined,
): Promise<void> {
  if (medias.length === 0) return;

  if (medias.length === 1) {
    await builder.addMedia(medias[0], captionFor?.(medias[0], 0));
    return;
  }

  let i = 0;
  while (i < medias.length) {
    const isLastSingle = i === medias.length - 1;
    const rowMedias = isLastSingle ? [medias[i]] : [medias[i], medias[i + 1]];
    const rowItems = rowMedias.map((media, idx) => ({
      media,
      caption: captionFor?.(media, i + idx),
    }));
    await builder.addMediaGridRow(rowItems);
    i += rowMedias.length;
  }
}

function viewHasExportableContent(view: SimplifiedViewConfig, itemDetails: Record<string, unknown>): boolean {
  switch (view.renderType) {
    case 'items':
      return getResourceIds(itemDetails, view.property || '').length > 0;
    case 'references': {
      const enrichedKey = ENRICHED_REF_KEYS[view.property || ''] ?? view.property;
      const refs = itemDetails[enrichedKey ?? ''];
      return Array.isArray(refs) && refs.length > 0;
    }
    case 'text': {
      const text = getOmekaValue(itemDetails, view.property || '');
      return typeof text === 'string' && text.trim() !== '';
    }
    case 'vocabGroup':
      return (view.vocabFields ?? []).some((field) => {
        if (field.type === 'textarea') {
          const text = getOmekaValue(itemDetails, field.property);
          return typeof text === 'string' && text.trim() !== '';
        }
        return getVocabValues(itemDetails, field.property).length > 0;
      });
    case 'categories':
      return (view.categories ?? []).some((cat) =>
        cat.subcategories.some((sub) => getAllOmekaValues(itemDetails, sub.property).some((v) => v.trim())),
      );
    default:
      return false;
  }
}

// ============================================================================
// Entry point
// ============================================================================

export async function exportRecitToPdf(input: RecitPdfExportInput): Promise<void> {
  const {
    itemDetails,
    keywords,
    fields,
    views,
    resourceType,
    resourceTypeLabel,
    pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://edisem.arcanes.ca',
  } = input;

  const titleField = fields.find((f) => f.type === 'title');
  const title = String(
    (titleField ? getOmekaValue(itemDetails, titleField.property) : null) ||
      itemDetails.title ||
      itemDetails['o:title'] ||
      'Récit',
  );

  const typeLabel = resourceTypeLabel || (resourceType ? getRessourceLabel(resourceType) : null) || 'Récit';

  const builder = new RecitPdfBuilder(pageUrl, typeLabel);
  await builder.init(title);

  const dateField = fields.find((f) => f.type === 'date');
  const dateRaw = dateField ? getOmekaValue(itemDetails, dateField.property) : null;
  const contributors = resolveContributors(itemDetails);
  const keywordLabels = keywords.map((k) => k.title).filter(Boolean);
  const urlField = fields.find((f) => f.type === 'url');
  const externalUrlValue = urlField ? getOmekaValue(itemDetails, urlField.property) : null;
  const externalLink =
    typeof externalUrlValue === 'string' && externalUrlValue.trim()
      ? { label: urlField?.label || 'Site web associé', value: externalUrlValue }
      : null;

  const displayableMedias = await enrichYouTubeTitles(getDisplayableMedias(itemDetails.associatedMedia));
  const [heroMedia, ...remainingMedias] = displayableMedias;
  const nativeVideoCount = countNativeVideoFiles(itemDetails.associatedMedia);
  const addedByLabel = await resolveOwnerDisplayName(itemDetails);

  await builder.buildCoverPage({
    title,
    typeLabel,
    dateDisplay: typeof dateRaw === 'string' ? formatFlexibleDateDisplay(dateRaw) : '',
    contributors,
    addedByLabel,
    externalLink,
    pageUrl,
    heroMedia: heroMedia ?? null,
  });

  builder.startNewPageIfNeeded();

  const detailFields = getDetailFields(fields);
  const textareaFields = detailFields.filter((f) => f.type === 'textarea');
  const otherDetailFields = detailFields.filter(
    (f) => f.type !== 'textarea' && f.type !== 'url' && f.type !== 'date' && f.type !== 'resource',
  );

  const hasDetails =
    textareaFields.some((f) => {
      const val = getOmekaValue(itemDetails, f.property);
      return typeof val === 'string' && val.trim();
    }) ||
    otherDetailFields.some((f) => {
      if (f.type === 'itemset') {
        return getResourceIds(itemDetails, f.property).length > 0;
      }
      const val = getOmekaValue(itemDetails, f.property);
      return val != null && String(val).trim() !== '';
    });

  // « Informations générales » regroupe l'avertissement sur la nature de l'export, les mots-clés
  // et les champs de détail — elle est toujours affichée en tout premier, juste après la
  // couverture (gardée volontairement épurée), et existe donc dès qu'il y a l'un ou l'autre.
  if (hasDetails || nativeVideoCount > 0 || keywordLabels.length > 0) {
    builder.addSectionTitle('Informations générales');
    builder.addNote(
      "Ce document a été généré automatiquement depuis la plateforme EDISEM (Arcanes). Il reprend le contenu disponible au moment de l'export et peut ne pas inclure certains médias dynamiques ou contenus interactifs — consultez la fiche en ligne pour l'expérience complète.",
    );

    if (nativeVideoCount > 0) {
      builder.addNote(
        `${nativeVideoCount} fichier vidéo${nativeVideoCount > 1 ? 's' : ''} associé${nativeVideoCount > 1 ? 's' : ''} à ce récit — non inclus dans l'export PDF (format non lisible dans un document). Les vidéos YouTube, elles, sont représentées ci-dessous par leur miniature cliquable.`,
      );
    }

    if (keywordLabels.length > 0) {
      builder.addSubsectionTitle('Mots-clés');
      builder.addParagraph(keywordLabels.join(' · '));
    }

    textareaFields.forEach((field) => {
      const val = getOmekaValue(itemDetails, field.property);
      if (typeof val === 'string' && val.trim()) {
        builder.addSubsectionTitle(field.label || field.key);
        builder.addParagraph(val);
      }
    });

    otherDetailFields.forEach((field) => {
      if (field.type === 'itemset') {
        const resourceCache = (itemDetails.resourceCache || {}) as Record<number, Record<string, unknown>>;
        const labels = getResourceIds(itemDetails, field.property)
          .map((id) => resourceCache[id]?.title || resourceCache[id]?.name)
          .filter(Boolean)
          .map(String);
        if (labels.length > 0) {
          builder.addSubsectionTitle(field.label || field.key);
          builder.addParagraph(labels.join(', '));
        }
        return;
      }
      const val = getOmekaValue(itemDetails, field.property);
      if (val != null && String(val).trim()) {
        builder.addSubsectionTitle(field.label || field.key);
        builder.addParagraph(String(val));
      }
    });
  }

  if (remainingMedias.length > 0) {
    builder.addSectionTitle('Autres illustrations');
    await renderMediaCollection(
      builder,
      remainingMedias,
      (media, idx) => (media.kind === 'youtube' ? `Vidéo ${idx + 2}` : `Illustration ${idx + 2}`),
    );
  }

  for (const view of views) {
    if (!viewHasExportableContent(view, itemDetails)) continue;
    builder.addSectionTitle(view.title);
    await buildViewSection(builder, view, itemDetails);
  }

  const filename = `${slugifyFilename(title)}-edisem.pdf`;
  builder.save(filename);
}
