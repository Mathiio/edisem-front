/** État de chargement corpus / récits — texte + trait pulsé, sans chrome. */
export function DatavisCorpusLoading({
  label = 'Chargement du corpus…',
  hint,
  className = 'flex flex-1 min-h-[min(40vh,360px)]',
}: {
  label?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`${className} flex items-center justify-center px-6`}
      role='status'
      aria-live='polite'
      aria-label={label}>
      <div className='flex max-w-sm flex-col items-center gap-3 text-center'>
        <div className='h-px w-20 overflow-hidden rounded-full bg-c3' aria-hidden>
          <div
            className='h-full w-full animate-pulse bg-gradient-to-r from-c3 via-action/45 to-c3'
            style={{ animationDuration: '1.6s' }}
          />
        </div>
        <p className='text-sm font-medium tracking-tight text-c6'>{label}</p>
        {hint ? <p className='text-xs leading-relaxed text-c4'>{hint}</p> : null}
      </div>
    </div>
  );
}
