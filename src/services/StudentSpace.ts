/**
 * Service pour l'API de l'espace étudiant
 * Endpoints dédiés pour les ressources étudiantes (expérimentations, outils, feedbacks)
 */

import { TEMPLATE_ID_TO_TYPE, filterMonEspaceResources, isParentLinkedOnlyResourceType, resolveResourceTypeFromOmekaItem } from '@/config/resourceConfig';
import { getYouTubeThumbnail, isOmekaPlaceholderThumbnail, resolveOmekaThumbnail } from '@/lib/resourceUtils';
import { ApiProxy } from '@/services/ApiProxy';
import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=StudentSpace';

/** Propriétés Omeka susceptibles de contenir une URL vidéo ou image */
const MEDIA_URL_PROPERTIES = [
  'schema:url',
  'dcterms:identifier',
  'bibo:uri',
  'schema:associatedMedia',
  'schema:contentUrl',
  'oa:hasRelatedResource',
  'schema:embedUrl',
];

function normalizeOmekaMediaUrl(url: string | null | undefined): string | null {
  return resolveOmekaThumbnail(url);
}

function collectUrlsFromOmekaProperties(item: Record<string, any>): string[] {
  const urls: string[] = [];

  for (const prop of MEDIA_URL_PROPERTIES) {
    const values = item[prop];
    if (!Array.isArray(values)) continue;

    for (const v of values) {
      if (v?.type === 'uri' && typeof v['@id'] === 'string') {
        urls.push(v['@id']);
      }
      if (typeof v?.['@value'] === 'string' && v['@value'].startsWith('http')) {
        urls.push(v['@value']);
      }
      if (typeof v?.url === 'string' && v.url.startsWith('http')) {
        urls.push(v.url);
      }
    }
  }

  return urls;
}

/**
 * Extrait la meilleure miniature disponible depuis un item Omeka S (liste ou détail)
 */
function extractThumbnailFromOmekaItem(item: Record<string, any>): string | null {
  const displayUrls = item['thumbnail_display_urls'];
  const fromDisplay = normalizeOmekaMediaUrl(
    displayUrls?.square || displayUrls?.medium || displayUrls?.large,
  );
  if (fromDisplay) return fromDisplay;

  const primaryMedia = item['o:primary_media'];
  const fromPrimary = normalizeOmekaMediaUrl(
    primaryMedia?.['thumbnail_display_urls']?.square ||
      primaryMedia?.['thumbnail_display_urls']?.medium ||
      primaryMedia?.['thumbnail_display_urls']?.large,
  );
  if (fromPrimary) return fromPrimary;

  for (const url of collectUrlsFromOmekaProperties(item)) {
    const ytThumb = getYouTubeThumbnail(url);
    if (ytThumb) return ytThumb;
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) return url;
  }

  return null;
}

function extractExternalUrlFromOmekaItem(item: Record<string, any>): string | null {
  for (const url of collectUrlsFromOmekaProperties(item)) {
    if (getYouTubeThumbnail(url)) return url;
  }
  return collectUrlsFromOmekaProperties(item)[0] ?? null;
}

/**
 * Charge la miniature depuis le premier média attaché (o:media) si absent de la réponse liste
 */
async function enrichThumbnailFromMedia(item: Record<string, any>): Promise<string | null> {
  const mediaRef = item['o:media']?.[0];
  const mediaId = mediaRef?.['o:id'] ?? mediaRef?.value_resource_id;
  if (!mediaId) return null;

  try {
    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}media/${mediaId}`));
    if (!response.ok) return null;

    const media = await response.json();

    const originalUrl = media['o:original_url'];
    if (typeof originalUrl === 'string') {
      const fromOriginal = normalizeOmekaMediaUrl(originalUrl);
      if (fromOriginal) return fromOriginal;
    }

    const fromThumb = normalizeOmekaMediaUrl(
      media['o:thumbnail_urls']?.square ||
        media['o:thumbnail_urls']?.medium ||
        media['o:thumbnail_urls']?.large,
    );
    if (fromThumb) return fromThumb;

    const source =
      media['o:source'] ||
      media['dcterms:identifier']?.[0]?.['@value'] ||
      media['bibo:uri']?.[0]?.['@id'];
    if (typeof source === 'string') {
      const yt = getYouTubeThumbnail(source);
      if (yt) return yt;
      if (source.includes('/') || source.startsWith('http')) {
        return normalizeOmekaMediaUrl(source);
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function normalizeStudentResourceCard(card: StudentResourceCard): StudentResourceCard {
  const thumbnail =
    normalizeOmekaMediaUrl(card.thumbnail) ||
    (card.url ? getYouTubeThumbnail(card.url) || null : null);

  return {
    ...card,
    thumbnail,
    actants: card.actants?.map((a) => ({
      ...a,
      name: a.name || (a as { title?: string }).title,
      picture: normalizeOmekaMediaUrl(a.picture),
    })),
  };
}

/**
 * Types pour les ressources étudiantes
 */
export interface StudentResourceCard {
  id: number | string;
  title: string;
  thumbnail: string | null;
  /** URL externe (YouTube, etc.) — fallback miniature dans MySpaceResourceCard */
  url?: string | null;
  type:
    | 'experimentation_etudiant'
    | 'outil_etudiant'
    | 'retour_experience_etudiant'
    | 'experimentation'
    | 'retour_experience'
    | 'outil'
    | 'seminaire'
    | 'colloque'
    | 'journee_etudes'
    | 'personne'
    | 'organisation'
    | 'recit_scientifique'
    | 'recit_artistique'
    | 'recit_techno_industriel'
    | 'recit_citoyen'
    | 'recit_mediatique'
    | 'annotation'
    | 'element_esthetique'
    | 'element_narratif'
    | 'bibliographie'
    | 'mediagraphie';
  actants: {
    id: number | string;
    title: string;
    name?: string;
    picture: string | null;
  }[];
  /** Date métier (dcterms:issued, dcterms:date, etc.) */
  date?: string | null;
  created?: string;
}

export interface AllStudentResources {
  experimentations: StudentResourceCard[];
  tools: StudentResourceCard[];
  feedbacks: StudentResourceCard[];
  total: number;
}

export interface StudentResourceDetails {
  id: number;
  title: string;
  type: 'experimentation_etudiant' | 'outil_etudiant' | 'retour_experience_etudiant';
  resource_template_id: number;
  created: string;
  modified: string;
  owner_id: number;
  values: Record<string, any[]>;
  media: {
    id: number;
    storage_id: string;
    media_type: string;
    source: string;
    url: string;
    thumbnail: string;
  }[];
  actants: {
    id: number;
    title: string;
    picture: string | null;
    role: string;
  }[];
}

export interface TemplateProperty {
  property_id: number;
  term: string;
  local_name: string;
  is_required: boolean;
  alternate_label: string | null;
  alternate_comment: string | null;
}

/**
 * Type pour un étudiant avec son ID utilisateur Omeka S
 */
export interface Student {
  id: number;
  firstname: string;
  lastname: string;
  title: string;
  mail: string;
  studentNumber: string; // Numéro étudiant (dcterms:identifier)
  classNumber: string; // Numéro de classe (schema:courseCode)
  picture: string | null;
  omekaUserId: number | null; // ID utilisateur Omeka S (table user)
  type: 'student';
}

/**
 * Récupère toutes les ressources étudiantes (expérimentations, outils, feedbacks)
 * Format simplifié pour les cards
 */
export async function getAllStudentResources(): Promise<AllStudentResources> {
  try {
    const response = await fetch(`${API_BASE}&action=getAllResources&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student resources:', error);
    throw error;
  }
}

/**
 * Extrait les actants affichés sur une card depuis les propriétés Omeka S
 */
function extractActantsFromOmekaItem(item: Record<string, any>): StudentResourceCard['actants'] {
  const actants: StudentResourceCard['actants'] = [];
  const seen = new Set<string>();

  for (const prop of ['dcterms:creator', 'schema:contributor', 'schema:agent']) {
    const values = item[prop];
    if (!Array.isArray(values)) continue;

    for (const v of values) {
      if (v?.type !== 'resource') continue;
      const id = v.value_resource_id ?? v['o:id'];
      if (id == null || seen.has(String(id))) continue;
      seen.add(String(id));
      actants.push({
        id,
        title: v.display_title || `Item ${id}`,
        name: v.display_title || `Item ${id}`,
        picture: normalizeOmekaMediaUrl(v.thumbnail_url),
      });
    }
  }

  return actants;
}

const OMEKA_DATE_PROPERTIES = ['dcterms:issued', 'dcterms:date', 'schema:eventDate'];

function extractDateFromOmekaItem(item: Record<string, any>): string | null {
  for (const prop of OMEKA_DATE_PROPERTIES) {
    const values = item[prop];
    if (!Array.isArray(values) || values.length === 0) continue;
    const value = values[0]?.['@value'];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Convertit un item Omeka S en StudentResourceCard (ignore les templates inconnus)
 */
function mapOmekaItemToStudentCard(item: Record<string, any>): StudentResourceCard | null {
  const templateId = item['o:resource_template']?.['o:id'];
  if (!templateId) return null;

  const type =
    resolveResourceTypeFromOmekaItem(item) ??
    TEMPLATE_ID_TO_TYPE[Number(templateId)];
  if (!type || isParentLinkedOnlyResourceType(type)) return null;

  return {
    id: item['o:id'],
    title: item['o:title'] || item['dcterms:title']?.[0]?.['@value'] || 'Sans titre',
    thumbnail: extractThumbnailFromOmekaItem(item),
    url: extractExternalUrlFromOmekaItem(item),
    type: type as StudentResourceCard['type'],
    actants: extractActantsFromOmekaItem(item),
    date: extractDateFromOmekaItem(item),
    created: item['o:modified']?.['@value'] || item['o:created']?.['@value'],
  };
}

/**
 * Récupère toutes les ressources dont l'utilisateur Omeka S est propriétaire (o:owner).
 * Optimisations :
 * - Première page chargée en priorité → résultats rapides
 * - Pages suivantes en parallèle (via totalResults dans le header Omeka S)
 * - Enrichissement des thumbnails limité à 5 requêtes simultanées
 */
export async function fetchUserResourcesByOwnerFromOmeka(omekaUserId: number): Promise<StudentResourceCard[]> {
  const perPage = 100;
  const baseUrl = `${OMEKA_API_BASE}items?owner_id=${omekaUserId}&per_page=${perPage}&sort_by=modified&sort_order=desc`;

  // Première page pour déterminer le total
  const firstUrl = omekaApiUrl(`${baseUrl}&page=1`);
  const firstResponse = await fetch(firstUrl);
  if (!firstResponse.ok) {
    throw new Error(`Erreur Omeka S (${firstResponse.status}) lors de la récupération des ressources par owner`);
  }
  const firstData = await firstResponse.json();
  if (!Array.isArray(firstData) || firstData.length === 0) return [];

  let allItems: Record<string, any>[] = [...firstData];

  // Si la première page est pleine, charger les suivantes en parallèle
  if (firstData.length === perPage) {
    const totalHeader = firstResponse.headers.get('Omeka-S-Total-Results');
    const total = totalHeader ? parseInt(totalHeader, 10) : null;
    const maxPages = total ? Math.min(Math.ceil(total / perPage), 10) : 10;

    if (maxPages > 1) {
      const pageNumbers = Array.from({ length: maxPages - 1 }, (_, i) => i + 2);
      const pageResults = await Promise.all(
        pageNumbers.map(async (page) => {
          try {
            const r = await fetch(omekaApiUrl(`${baseUrl}&page=${page}`));
            if (!r.ok) return [];
            const d = await r.json();
            return Array.isArray(d) ? d : [];
          } catch {
            return [];
          }
        }),
      );
      for (const pageData of pageResults) {
        allItems.push(...pageData);
        if (pageData.length < perPage) break; // Dernière page réelle
      }
    }
  }

  const cards = allItems
    .map(mapOmekaItemToStudentCard)
    .filter((card): card is StudentResourceCard => card !== null);

  // Enrichissement des thumbnails manquants — max 5 requêtes simultanées
  const needsEnrichment = cards
    .map((card, index) => {
      const rawItem = allItems.find((i) => i['o:id'] === card.id);
      return (!card.thumbnail || isOmekaPlaceholderThumbnail(card.thumbnail)) && rawItem?.['o:media']?.length
        ? { card, index, rawItem }
        : null;
    })
    .filter(Boolean) as { card: StudentResourceCard; index: number; rawItem: any }[];

  const CONCURRENCY = 5;
  for (let i = 0; i < needsEnrichment.length; i += CONCURRENCY) {
    const batch = needsEnrichment.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ index, rawItem }) => {
        const enriched = await enrichThumbnailFromMedia(rawItem);
        if (enriched) cards[index] = { ...cards[index], thumbnail: enriched };
      }),
    );
  }

  return cards.map(normalizeStudentResourceCard);
}

/**
 * Récupère les ressources créées par un utilisateur
 * Priorité : filtre par o:owner (omekaUserId) via l'API Omeka S
 * Fallback : endpoint PHP legacy (userId = item étudiant)
 */
export async function getUserResources(userId: number, omekaUserId?: number | null): Promise<StudentResourceCard[]> {
  if (omekaUserId && omekaUserId > 0) {
    try {
      return await fetchUserResourcesByOwnerFromOmeka(omekaUserId);
    } catch (error) {
      console.error('Error fetching user resources by o:owner from Omeka:', error);
    }
  }

  if (!userId) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      action: 'getUserResources',
      userId: String(userId),
      json: '1',
    });
    if (omekaUserId && omekaUserId > 0) {
      params.set('ownerId', String(omekaUserId));
    }

    const response = await fetch(`${API_BASE}&${params.toString()}`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources utilisateur');
    }

    return normalizeLegacyResourceCards(await response.json());
  } catch (error) {
    console.error('Error fetching user resources:', error);
    throw error;
  }
}

function normalizeLegacyResourceCards(cards: StudentResourceCard[]): StudentResourceCard[] {
  if (!Array.isArray(cards)) return [];
  return filterMonEspaceResources(cards.map(normalizeStudentResourceCard));
}

/**
 * Récupère les expérimentations étudiantes (format card)
 */
export async function getStudentExperimentations(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getExperimentations&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des expérimentations');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student experimentations:', error);
    throw error;
  }
}

/**
 * Récupère les outils (format card)
 */
export async function getStudentTools(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getTools&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des outils');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student tools:', error);
    throw error;
  }
}

/**
 * Récupère les feedbacks (format card)
 */
export async function getStudentFeedbacks(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getFeedbacks&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des feedbacks');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student feedbacks:', error);
    throw error;
  }
}

/**
 * Récupère les détails complets d'une ressource
 */
export async function getStudentResourceDetails(id: number): Promise<StudentResourceDetails> {
  try {
    const response = await fetch(`${API_BASE}&action=getResourceDetails&id=${id}&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des détails');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching resource details:', error);
    throw error;
  }
}

/**
 * Récupère les propriétés d'un template (pour les formulaires de création/édition)
 */
export async function getStudentTemplateProperties(templateId: number): Promise<{
  templateId: number;
  properties: TemplateProperty[];
}> {
  try {
    const response = await fetch(`${API_BASE}&action=getTemplateProperties&templateId=${templateId}&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des propriétés');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching template properties:', error);
    throw error;
  }
}

/**
 * Récupère les étudiants avec leur ID utilisateur Omeka S
 * Utilisé pour le login et pour déterminer le owner lors de la création de ressources
 */
export async function getStudentsForLogin(): Promise<Student[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getStudents&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des étudiants');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
}

// ========== COURSE TYPES & FUNCTIONS ==========

/**
 * Type pour un cours
 */
export interface Course {
  id: number;
  title: string;
  description: string;
  code: string; // Code du cours (ex: ART2030)
  level: string; // Niveau (Baccalauréat, Maîtrise, etc.)
  session: string; // Session (Automne, Hiver, Été)
  year: string; // Année
  studentCount: number; // Nombre d'étudiants inscrits
  created?: string;
  modified?: string;
}

/**
 * Type pour les données de création/modification d'un cours
 */
export interface CourseFormData {
  title: string;
  description?: string;
  code?: string;
  level?: string;
  session?: string;
  year?: string;
}

/**
 * Récupère tous les cours
 */
export async function getCourses(): Promise<Course[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getCourses&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des cours');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

/**
 * Créer un cours
 */
export async function createCourse(data: CourseFormData): Promise<{ success: boolean; id: number }> {
  const params = new URLSearchParams({
    title: data.title,
    description: data.description || '',
    code: data.code || '',
    level: data.level || '',
    session: data.session || '',
    year: data.year || '',
  });

  const response = await fetch(`${API_BASE}&action=createCourse&json=1&${params.toString()}`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Mettre à jour un cours
 */
export async function updateCourse(id: number, data: Partial<CourseFormData>): Promise<{ success: boolean; id: number }> {
  const params = new URLSearchParams({ id: String(id) });

  if (data.title !== undefined) params.append('title', data.title);
  if (data.description !== undefined) params.append('description', data.description);
  if (data.code !== undefined) params.append('code', data.code);
  if (data.level !== undefined) params.append('level', data.level);
  if (data.session !== undefined) params.append('session', data.session);
  if (data.year !== undefined) params.append('year', data.year);

  const response = await fetch(`${API_BASE}&action=updateCourse&json=1&${params.toString()}`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Supprimer un cours
 */
export async function deleteCourse(id: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=deleteCourse&id=${id}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

async function isOmekaItemDeleted(itemId: number): Promise<boolean> {
  try {
    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${itemId}`));
    return response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Supprime définitivement une ressource Omeka S (DELETE via ApiProxy).
 * Le backend peut renvoyer une 500 Doctrine après suppression réussie : on vérifie l'absence de l'item.
 */
export async function deleteUserResource(id: string | number): Promise<{ success: boolean; message?: string }> {
  const itemId = Number(id);
  if (!itemId) {
    throw new Error('ID de ressource invalide');
  }

  let proxyError: string | undefined;

  try {
    const result = await ApiProxy.deleteItem(itemId);

    if (result?.error) {
      proxyError = typeof result.error === 'string' ? result.error : 'Erreur lors de la suppression';
    } else if (result?.success === false) {
      proxyError = typeof result.message === 'string' ? result.message : 'Erreur lors de la suppression';
    } else {
      return {
        success: true,
        message: typeof result?.message === 'string' ? result.message : undefined,
      };
    }
  } catch (error) {
    proxyError = error instanceof Error ? error.message : 'Erreur lors de la suppression';
  }

  if (await isOmekaItemDeleted(itemId)) {
    return { success: true };
  }

  throw new Error(proxyError || 'Erreur lors de la suppression');
}

/**
 * Inscrire un étudiant à un cours
 */
export async function enrollStudent(studentId: number, courseId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=enrollStudent&studentId=${studentId}&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Désinscrire un étudiant d'un cours
 */
export async function unenrollStudent(studentId: number, courseId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=unenrollStudent&studentId=${studentId}&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les cours d'un étudiant
 */
export async function getStudentCourses(studentId: number): Promise<Course[]> {
  const response = await fetch(`${API_BASE}&action=getStudentCourses&studentId=${studentId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les étudiants d'un cours
 */
export async function getCourseStudents(courseId: number): Promise<Student[]> {
  const response = await fetch(`${API_BASE}&action=getCourseStudents&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les ressources filtrées par cours
 */
export async function getResourcesByCourse(courseId: number): Promise<AllStudentResources> {
  const response = await fetch(`${API_BASE}&action=getResourcesByCourse&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les expérimentations du même cours qu'une expérimentation donnée
 * Pour les recommandations "Expérimentations similaires"
 */
export async function getSameCourseExperimentations(experimentationId: number, limit: number = 4): Promise<StudentResourceCard[]> {
  const response = await fetch(`${API_BASE}&action=getSameCourseExperimentations&experimentationId=${experimentationId}&limit=${limit}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return Array.isArray(result) ? result : [];
}

// ========== RESEARCH PROJECT (SAVED SEARCHES) ==========

/**
 * Template ID pour les projets de recherche (recherches sauvegardées)
 */
export const RESEARCH_TEMPLATE_ID = 102;

/**
 * Property IDs pour le template ResearchProject
 */
const RESEARCH_PROPERTIES = {
  title: 1, // dcterms:title
  creator: 2, // dcterms:creator
  codeRepository: 551, // schema:codeRepository (stocke le JSON des filtres)
} as const;

/**
 * Type pour une recherche sauvegardée
 */
export interface SavedResearch {
  id: number;
  title: string;
  config: string; // JSON stringifié des FilterGroup[]
  created: string;
  creatorId?: number;
}

/**
 * Convertit un dataURL en File
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Sauvegarde une recherche dans Omeka S
 * Crée un item ResearchProject avec la configuration de recherche et l'image de la visualisation
 */
export async function saveResearch(title: string, filterGroups: any, imageDataUrl?: string): Promise<{ success: boolean; id: number }> {
  // Récupérer les IDs utilisateur depuis localStorage
  const userId = localStorage.getItem('userId');
  const omekaUserId = localStorage.getItem('omekaUserId');

  if (!userId || !omekaUserId) {
    throw new Error('Utilisateur non connecté. Veuillez vous connecter pour sauvegarder une recherche.');
  }

  const configJson = JSON.stringify(filterGroups);

  // Construire l'objet pour l'API Omeka S
  const itemData: Record<string, any> = {
    'o:resource_template': { 'o:id': RESEARCH_TEMPLATE_ID },
    'o:owner': { 'o:id': parseInt(omekaUserId, 10) },
    'dcterms:title': [
      {
        type: 'literal',
        property_id: RESEARCH_PROPERTIES.title,
        '@value': title,
        is_public: true,
      },
    ],
    'dcterms:creator': [
      {
        type: 'resource',
        property_id: RESEARCH_PROPERTIES.creator,
        value_resource_id: parseInt(userId, 10),
        is_public: true,
      },
    ],
    'schema:codeRepository': [
      {
        type: 'literal',
        property_id: RESEARCH_PROPERTIES.codeRepository,
        '@value': configJson,
        is_public: true,
      },
    ],
  };

  // Utiliser les credentials depuis les variables d'environnement
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const createUrl = `https://tests.arcanes.ca/omk/api/items?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Erreur création recherche:', errorData);
    throw new Error(errorData['o:errors']?.join(', ') || 'Erreur lors de la sauvegarde de la recherche');
  }

  const result = await response.json();
  const newItemId = result['o:id'];

  // Upload de l'image comme média si fournie
  if (imageDataUrl && newItemId) {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const filename = `recherche_${timestamp}.png`;
      const imageFile = dataURLtoFile(imageDataUrl, filename);

      const formData = new FormData();
      formData.append(
        'data',
        JSON.stringify({
          'o:ingester': 'upload',
          'o:item': { 'o:id': newItemId },
          file_index: '0',
        }),
      );
      formData.append('file[0]', imageFile);

      const mediaUrl = `https://tests.arcanes.ca/omk/api/media?key_identity=${API_IDENT}&key_credential=${API_KEY}`;
      const mediaResponse = await fetch(mediaUrl, {
        method: 'POST',
        body: formData,
      });

      if (!mediaResponse.ok) {
        console.error('Erreur upload média:', await mediaResponse.text());
      } else {
        console.log('Image de recherche uploadée avec succès');
      }
    } catch (err) {
      console.error('Erreur upload média:', err);
    }
  }

  return { success: true, id: newItemId };
}

/**
 * Récupère les recherches sauvegardées de l'utilisateur connecté
 */
export async function getUserSavedResearches(): Promise<SavedResearch[]> {
  const omekaUserId = localStorage.getItem('omekaUserId');

  if (!omekaUserId) {
    return [];
  }

  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const url = `https://tests.arcanes.ca/omk/api/items?resource_template_id=${RESEARCH_TEMPLATE_ID}&owner_id=${omekaUserId}&key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Erreur récupération recherches:', response.statusText);
      return [];
    }

    const items = await response.json();

    return items.map((item: any) => ({
      id: item['o:id'],
      title: item['o:title'] || 'Sans titre',
      config: item['schema:codeRepository']?.[0]?.['@value'] || '[]',
      created: item['o:created']?.['@value'] || '',
      creatorId: item['dcterms:creator']?.[0]?.['value_resource_id'],
    }));
  } catch (error) {
    console.error('Erreur récupération recherches:', error);
    return [];
  }
}

/**
 * Supprime une recherche sauvegardée
 */
export async function deleteResearch(id: number): Promise<{ success: boolean }> {
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const url = `https://tests.arcanes.ca/omk/api/items/${id}?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error('Erreur lors de la suppression de la recherche');
  }

  return { success: true };
}

// ========== ACTANT TYPES & FUNCTIONS ==========

/**
 * Type pour un actant (item template 72) avec sa liaison utilisateur Omeka S
 */
export interface Actant {
  id: number; // ID de l'item actant (template 72)
  omekaUserId: number | null; // ID utilisateur Omeka S (null si non lié)
  omekaUserName: string | null; // Nom de l'utilisateur Omeka S
  omekaUserRole: string | null; // Rôle de l'utilisateur Omeka S
  mail: string;
  firstname: string;
  lastname: string;
  title: string;
  picture: string | null;
  created?: string;
  type: 'actant';
}

/**
 * Récupère les actants avec leur omekaUserId
 * Les actants sont les utilisateurs avec un rôle admin/author dans Omeka S
 */
export async function getActantsForLogin(): Promise<Actant[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getActants&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des actants');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching actants:', error);
    throw error;
  }
}

/**
 * Lier un actant (item) à un utilisateur Omeka S
 */
export async function linkActantToUser(actantId: number, userId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=linkActantToUser&actantId=${actantId}&userId=${userId}&json=1`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Créer un utilisateur Omeka S pour un actant et le lier automatiquement
 */
export async function createOmekaUserForActant(
  actantId: number,
  email: string,
  name: string,
  role: string = 'author',
): Promise<{ success: boolean; userId: number; actantId: number }> {
  const params = new URLSearchParams({
    actantId: String(actantId),
    email,
    name,
    role,
  });

  const response = await fetch(`${API_BASE}&action=createOmekaUserForActant&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Supprimer un actant (et optionnellement son utilisateur Omeka S)
 */
export async function deleteActant(actantId: number, deleteUser: boolean = false): Promise<{ success: boolean; actantId: number; actantTitle: string; userDeleted: boolean }> {
  const params = new URLSearchParams({
    actantId: String(actantId),
    deleteUser: String(deleteUser),
  });

  const response = await fetch(`${API_BASE}&action=deleteActant&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Créer un actant avec son utilisateur Omeka S (pour import batch)
 */
export async function createActantWithUser(
  email: string,
  name: string,
  role: string = 'author',
): Promise<{ success: boolean; userId: number; actantId: number; email: string; name: string; role: string }> {
  const params = new URLSearchParams({
    email,
    name,
    role,
  });

  const response = await fetch(`${API_BASE}&action=createActantWithUser&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les ressources enseignantes (créées par les actants, visibles par tous)
 */
export async function getTeacherResources(): Promise<AllStudentResources> {
  try {
    const response = await fetch(`${API_BASE}&action=getTeacherResources&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources enseignantes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching teacher resources:', error);
    throw error;
  }
}
