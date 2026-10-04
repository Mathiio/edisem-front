import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Items from '@/services/Items';
import { getResourceThumbnail, getYouTubeThumbnail } from '@/lib/resourceUtils';

const OMEKA_API = 'https://tests.arcanes.ca/omk/api';

/**
 * Résout la miniature d'une conférence quand le backend renvoie thumbnail: null.
 *
 * Priorité :
 *  1. Source YouTube du media ingéré (o:ingester='youtube') → maxresdefault.jpg (1280×720)
 *  2. getResourceThumbnail(item) — fallback pour items image ou autres
 *
 * Évite volontairement thumbnail_display_urls qui est une version Omeka retraitée
 * basse qualité (souvent 480×360 ou 200×200 carré).
 */
/** Détecte un thumbnail Omeka dérivé basse qualité (square / medium / large). */
const isOmekaDerivative = (url?: string) =>
  !!url && /\/omk\/files\/(?:square|medium|large)\//.test(url);

async function resolveConferenceThumbnail(
  conferenceId: string,
  currentThumbnail?: string,
): Promise<string> {
  // 1. Cherche un media YouTube ingéré → source YouTube → maxresdefault (1280×720)
  const mediaList: any[] | null = await fetch(`${OMEKA_API}/media?item_id=${conferenceId}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  if (mediaList) {
    const ytMedia = mediaList.find(
      (m: any) => m['o:ingester'] === 'youtube' && m['o:source'],
    );
    if (ytMedia) {
      const thumb = getYouTubeThumbnail(ytMedia['o:source'] as string);
      if (thumb) return thumb;
    }
  }

  // 2. Si pas de YouTube, garder le thumbnail existant s'il est correct (original/)
  if (currentThumbnail && !isOmekaDerivative(currentThumbnail)) return currentThumbnail;

  // 3. Dernier recours : item brut → getResourceThumbnail (image uploadée hors YouTube)
  const item: any | null = await fetch(`${OMEKA_API}/items/${conferenceId}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  return item ? getResourceThumbnail(item) : (currentThumbnail ?? '');
}

async function enrichConferenceThumbnails(conferences: Conference[]): Promise<Conference[]> {
  // Inclut les conférences sans thumbnail ET celles avec un dérivé Omeka pixelisé
  const without = conferences.filter(
    (c) => c.id && (!c.thumbnail || isOmekaDerivative(c.thumbnail)),
  );
  if (without.length === 0) return conferences;

  const resolved = await Promise.allSettled(
    without.map((c) => resolveConferenceThumbnail(String(c.id), c.thumbnail ?? undefined)),
  );

  const thumbMap = new Map<number, string>();
  resolved.forEach((result, idx) => {
    if (result.status !== 'fulfilled' || !result.value) return;
    thumbMap.set(Number(without[idx].id), result.value);
  });

  if (thumbMap.size === 0) return conferences;
  return conferences.map((c) =>
    thumbMap.has(Number(c.id)) ? { ...c, thumbnail: thumbMap.get(Number(c.id)) } : c,
  );
}
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import { motion, Variants } from 'framer-motion';
import { Layouts } from '@/components/layout/Layouts';
import { Conference, Edition as EditionType } from '@/types/ui';
import { BackgroundEllipse } from '@/assets/svg/BackgroundEllipse';
import { Skeleton } from '@heroui/react';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.1 },
  }),
};

export const Edition: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [edition, setEdition] = useState<EditionType | null>(null);
  const [loading, setLoading] = useState(true);
  const reEnrichingRef = useRef(false);

  // Second effect : détecte les thumbnails Omeka dégradés dans le state
  // (ex : state stale après HMR) et les remplace par YouTube maxresdefault.
  useEffect(() => {
    if (loading || reEnrichingRef.current) return;
    if (!conferences.some((c) => c.id && isOmekaDerivative(c.thumbnail))) return;

    reEnrichingRef.current = true;
    enrichConferenceThumbnails(conferences).then((enriched) => {
      setConferences(enriched);
    });
  }, [conferences, loading]);

  useEffect(() => {
    reEnrichingRef.current = false;
    if (!id) return;
    setLoading(true);
    setConferences([]);

    const fetchData = async () => {
      try {
        const data = await Items.getEditionDetails(id);
        if (data) {
          setEdition(data.edition);
          const raw: Conference[] = data.conferences || [];
          // Enrichissement AVANT le rendu : les thumbnails YouTube sont résolues
          // pendant le loading, pas après. Évite toute phase intermédiaire pixelisée.
          const enriched = await enrichConferenceThumbnails(raw);
          setConferences(enriched);
        } else {
          console.error('Aucune donnée trouvée pour cette édition');
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'édition:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  return (
    <Layouts className='col-span-10 flex flex-col gap-24'>
      <div className='pt-24 justify-center flex items-center flex-col gap-5 relative'>
        <div className='gap-5 justify-between flex items-center flex-col'>
          {loading ?
            <>
              <Skeleton className='w-[850px] h-14 rounded-lg' />
              <Skeleton className='w-[650px] h-14 rounded-lg' />
            </>
          : 
            <h1 className='z-[12] text-6xl text-c6 font-medium flex text-center flex-col items-center max-w-[850px]'>
            {edition?.title}
          </h1>
          }
          <p className='text-c5 text-base z-[12] text-center max-w-[600px]'>
            {edition?.editionType ? edition.editionType.charAt(0).toUpperCase() + edition.editionType.slice(1) : ''} Edisem - Édition {edition?.season} {edition?.year}
          </p>
          <motion.div
            className='top-[-50px] absolute z-[-1]'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeIn' }}
          >
            <div className='opacity-20 dark:opacity-30'>
              <BackgroundEllipse />
            </div>
          </motion.div>
        </div>
      </div>
      <div className='grid grid-cols-4 grid-rows-3 gap-6'>
        {loading
          ? Array.from({ length: 12 }).map((_, index) => <ResourceCardSkeleton key={index} />)
          : conferences.length > 0 ? (
              conferences.map((conference, index) => (
                <motion.div initial='hidden' animate='visible' variants={fadeIn} key={conference.id} custom={index}>
                  <ResourceCard item={conference} />
                </motion.div>
              ))
          ) : (
             <div className="col-span-4 text-center text-c5 py-5">Aucune conférence trouvée pour cette édition.</div>
          )
        }
      </div>
    </Layouts>
  );
};