import React from 'react';

const PULSE = 'animate-pulse bg-c3';

const STAT_WIDTHS_PX = [132, 118, 126, 108] as const;

function PulseBlock({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`rounded-xl ${PULSE} ${className}`} style={style} />;
}

/** Tableau de bord — 3 cartes + bandeaux secondaires */
export function DashboardViewSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-5 overflow-auto bg-c1 py-6'>
      <div className='grid grid-cols-3 gap-5'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='rounded-xl border-2 border-c3 bg-c2 p-5'>
            <div className='mb-4 flex items-center justify-between'>
              <PulseBlock className='h-10 w-10 rounded-lg' />
              <PulseBlock className='h-4 w-4 rounded-md' />
            </div>
            <PulseBlock className='mb-3 h-9' style={{ width: `${48 + i * 12}%` }} />
            <PulseBlock className='h-3 w-[70%]' />
            <PulseBlock className='mt-4 h-2 w-full rounded-full' />
          </div>
        ))}
      </div>
      <div className='grid grid-cols-2 gap-5'>
        <PulseBlock className='h-48 border-2 border-c3 bg-c2/50' />
        <PulseBlock className='h-48 border-2 border-c3 bg-c2/50' />
      </div>
    </div>
  );
}

function MatrixPulseBlock({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`${PULSE} ${className}`} style={style} />;
}

/** Matrice de couverture — pleine largeur, angles droits (grille), rounded-lg sur le conteneur scroll comme la vue réelle */
export function CoverageMatrixViewSkeleton() {
  const colCount = 16;
  const rowCount = 8;

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-c1'>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden py-6'>
        <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border-2 border-c3'>
          <div className='flex w-full shrink-0 border-b-2 border-c3 bg-c2'>
            <MatrixPulseBlock className='h-[180px] w-40 shrink-0 border-r-2 border-c3' />
            <div className='flex min-w-0 flex-1'>
              {Array.from({ length: colCount }).map((_, i) => (
                <MatrixPulseBlock
                  key={`col-${i}`}
                  className='h-[180px] min-w-6 flex-1 border-r border-c3/40 last:border-r-0'
                  style={{ opacity: 0.35 + (i % 3) * 0.12 }}
                />
              ))}
            </div>
          </div>
          <div className='flex min-h-0 flex-1 flex-col'>
            {Array.from({ length: rowCount }).map((_, row) => (
              <div key={`row-${row}`} className='flex min-h-10 flex-1 w-full border-b border-c3/80 last:border-b-0'>
                <MatrixPulseBlock
                  className='h-full min-h-10 w-40 shrink-0 border-r-2 border-c3'
                  style={{ opacity: 0.5 + (row % 2) * 0.08 }}
                />
                <div className='flex min-w-0 flex-1'>
                  {Array.from({ length: colCount }).map((_, col) => (
                    <MatrixPulseBlock
                      key={`cell-${row}-${col}`}
                      className='min-h-10 min-w-6 flex-1 border-r border-c3/40 last:border-r-0'
                      style={{ opacity: 0.18 + ((row + col) % 5) * 0.1 }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className='flex shrink-0 items-center justify-between border-t-2 border-c3 bg-c2/50 px-6 py-5'>
        <MatrixPulseBlock className='h-4 w-64 max-w-[45%]' />
        <div className='flex items-center gap-3'>
          {Array.from({ length: 5 }).map((_, i) => (
            <MatrixPulseBlock key={i} className='h-4 w-4 rounded-xs' />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Calendrier d'activité — stats + mois */
export function ActivityHeatmapViewSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-6 overflow-hidden bg-c1'>
      <div className='border-b-2 border-c3 pb-5 pt-5'>
        <div className='grid grid-cols-4 gap-4'>
          {STAT_WIDTHS_PX.map((widthPx, i) => (
            <div key={i} className='flex items-center gap-3 rounded-xl border-2 border-c3 bg-c2 p-4'>
              <PulseBlock className='h-4 w-4 shrink-0 rounded-md' />
              <div className='min-w-0 flex-1 space-y-2'>
                <PulseBlock className='h-3' style={{ width: widthPx * 0.55 }} />
                <PulseBlock className='h-5' style={{ width: widthPx * 0.35 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='grid flex-1 grid-cols-4 gap-4 overflow-auto pb-6'>
        {Array.from({ length: 12 }).map((_, month) => (
          <div key={month} className='flex flex-col rounded-xl border-2 border-c3 bg-c2 p-4'>
            <PulseBlock className='mx-auto mb-3 h-4' style={{ width: 56 + (month % 3) * 12 }} />
            <div className='space-y-1'>
              {Array.from({ length: 7 }).map((_, row) => (
                <div key={row} className='flex items-center gap-1'>
                  <PulseBlock className='h-2 w-2 rounded-sm' />
                  {Array.from({ length: 6 }).map((_, col) => (
                    <PulseBlock
                      key={col}
                      className='h-1.5 w-1.5 rounded-sm'
                      style={{ opacity: 0.25 + ((month + row + col) % 4) * 0.18 }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
