import { DatavisCorpusLoading } from '@/components/features/pages/visualisation/DatavisCorpusLoading';

/** Fallback léger pour React.lazy (routes et vues dataviz). */
export function RouteSuspenseFallback({ label = 'Chargement…' }: { label?: string }) {
  return (
    <DatavisCorpusLoading
      label={label}
      className='min-h-[min(50vh,420px)] w-full'
    />
  );
}
