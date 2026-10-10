import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import * as Items from '@/services/Items';
import { fetchEditionHeaderMeta } from '@/services/editionHeaderMeta';
import { getResourceThumbnail, getYouTubeThumbnail } from '@/lib/resourceUtils';
import { formatEditionTypeLabel } from '@/config/editionConfig';
import { EditionPageHeader, EditionPageHeaderSkeleton } from '@/components/features/shared/corpus/EditionMetaPills';
import { ResourceCard, ResourceCardSkeleton } from '@/components/features/shared/corpus/ResourceCard';
import { motion, Variants } from 'framer-motion';
import { Layouts } from '@/components/layout/Layouts';
import { Conference, Edition as EditionType } from '@/types/ui';
import { BackgroundEllipse } from '@/assets/svg/BackgroundEllipse';
import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';

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
  const mediaList: any[] | null = await fetch(omekaApiUrl(`${OMEKA_API_BASE}media?item_id=${conferenceId}`))
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

  if (currentThumbnail && !isOmekaDerivative(currentThumbnail)) return currentThumbnail;

  const item: any | null = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${conferenceId}`))
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  return item ? getResourceThumbnail(item) : (currentThumbnail ?? '');
}

async function enrichConferenceThumbnails(conferences: Conference[]): Promise<Conference[]> {
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

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: index * 0.1 },
  }),
};

function editionSubtitle(edition: EditionType | null, pathname: string): string {
  if (!edition) return '';
  const typeLabel = formatEditionTypeLabel(edition.editionType, pathname);
  const seasonPart = edition.season?.trim();
  const yearPart = edition.year?.trim();

  if (seasonPart && yearPart) return `${typeLabel} — Édition ${seasonPart} ${yearPart}`;
  if (seasonPart) return `${typeLabel} — Édition ${seasonPart}`;
  if (yearPart) return `${typeLabel} — Édition ${yearPart}`;
  return typeLabel;
}

export const Edition: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [edition, setEdition] = useState<EditionType | null>(null);
  const [loading, setLoading] = useState(true);
  const reEnrichingRef = useRef(false);

  const subtitle = useMemo(() => editionSubtitle(edition, pathname), [edition, pathname]);

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
    setEdition(null);

    const fetchData = async () => {
      try {
        const [data, headerMeta] = await Promise.all([
          Items.getEditionDetails(id),
          fetchEditionHeaderMeta(id),
        ]);
        if (data) {
          setEdition({
            ...data.edition,
            season: data.edition.season?.trim() || headerMeta.season || '',
            hostInstitutions: headerMeta.hostInstitutions,
            organizers: headerMeta.organizers,
          });
          const raw: Conference[] = data.conferences || [];
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

  const hostInstitutions = edition?.hostInstitutions ?? [];
  const organizers = edition?.organizers ?? [];

  return (
    <Layouts className='col-span-10 flex flex-col gap-12'>
      <div className='relative pt-8 md:pt-10'>
        {loading ? (
          <EditionPageHeaderSkeleton />
        ) : (
          <EditionPageHeader
            subtitle={subtitle}
            title={edition?.title}
            institutions={hostInstitutions}
            organizers={organizers}
          />
        )}

        {!loading ? (
          <motion.div
            className='pointer-events-none absolute left-1/2 top-[-50px] z-[-1] -translate-x-1/2'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeIn' }}
          >
            <div className='opacity-20 dark:opacity-30'>
              <BackgroundEllipse />
            </div>
          </motion.div>
        ) : null}
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
