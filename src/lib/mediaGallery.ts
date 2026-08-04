import { isValidYouTubeUrl } from '@/lib/utils';

export interface MediaGalleryItem {
  key: string;
  omekaMediaId?: number | null;
  /** URL originale (fichier Omeka, URL YouTube, blob pour upload) */
  sourceUrl: string;
  preview: string;
  displayUrl: string;
  type: 'image' | 'video';
  name: string;
  file?: File;
  isYouTube?: boolean;
  /** Déjà persisté dans Omeka */
  isExisting?: boolean;
}

export interface MediaGalleryOrderEntry {
  key: string;
  omekaMediaId?: number | null;
  sourceUrl: string;
  isYouTube?: boolean;
  file?: File;
}

export interface MediaGallerySavePayload {
  mediaFiles: Array<{ file: File; key: string }>;
  youtubeUrls: string[];
  mediaToDelete: number[];
  mediaOrder: MediaGalleryOrderEntry[];
}

export function mediaUrlKey(url: string): string {
  return url.split('/').pop()?.split('?')[0]?.split('#')[0] ?? url;
}

function getYouTubeThumbnail(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match ? match[1] : null;
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
}

export function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match ? match[1] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}

function isVideoUrl(url: string): boolean {
  return url.includes('.mov') || url.includes('.mp4') || url.includes('.webm');
}

export function buildMediaGalleryFromAssociatedMedia(
  urls: string[],
  ids?: Array<number | null | undefined>,
): MediaGalleryItem[] {
  return urls.map((url, index) => {
    const isYouTube = isValidYouTubeUrl(url);
    const omekaMediaId = ids?.[index] ?? null;
    return {
      key: omekaMediaId != null ? `omeka-${omekaMediaId}` : `url-${mediaUrlKey(url)}-${index}`,
      omekaMediaId,
      sourceUrl: url,
      preview: isYouTube ? getYouTubeThumbnail(url) : url,
      displayUrl: isYouTube ? getYouTubeEmbedUrl(url) : url,
      type: isYouTube || isVideoUrl(url) ? 'video' : 'image',
      name: isYouTube ? `Vidéo YouTube ${index + 1}` : `Média ${index + 1}`,
      isYouTube,
      isExisting: true,
    };
  });
}

export function createUploadGalleryItem(file: File): MediaGalleryItem {
  const preview = URL.createObjectURL(file);
  return {
    key: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sourceUrl: preview,
    preview,
    displayUrl: preview,
    type: file.type.startsWith('video/') ? 'video' : 'image',
    name: file.name,
    file,
    isExisting: false,
  };
}

export function createYoutubeGalleryItem(url: string, index?: number): MediaGalleryItem {
  return {
    key: `youtube-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sourceUrl: url,
    preview: getYouTubeThumbnail(url),
    displayUrl: getYouTubeEmbedUrl(url),
    type: 'video',
    name: `Vidéo YouTube${index != null ? ` ${index + 1}` : ''}`,
    isYouTube: true,
    isExisting: false,
  };
}

export function buildMediaGallerySavePayload(
  items: MediaGalleryItem[],
  removedOmekaMediaIds: number[],
): MediaGallerySavePayload {
  const deletedSet = new Set(removedOmekaMediaIds);
  const activeItems = items.filter((item) => !item.omekaMediaId || !deletedSet.has(item.omekaMediaId));

  return {
    mediaFiles: activeItems.filter((item) => item.file).map((item) => ({ file: item.file!, key: item.key })),
    youtubeUrls: activeItems.filter((item) => item.isYouTube && !item.isExisting).map((item) => item.sourceUrl),
    mediaToDelete: [...removedOmekaMediaIds],
    mediaOrder: activeItems.map((item) => ({
      key: item.key,
      omekaMediaId: item.omekaMediaId,
      sourceUrl: item.sourceUrl,
      isYouTube: item.isYouTube,
      file: item.file,
    })),
  };
}

export function getMediaGalleryOrderSignature(items: MediaGalleryItem[]): string {
  return items.map((item) => item.key).join('|');
}
