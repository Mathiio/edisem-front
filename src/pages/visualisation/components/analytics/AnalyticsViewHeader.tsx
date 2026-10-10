import type { ReactNode } from 'react';

export function AnalyticsViewHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
}) {
  return (
    <header className='shrink-0 border-b-2 border-c3 bg-c1 py-4'>
      <div className='flex items-start gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-c3 bg-c2 text-c5'>
          {icon}
        </div>
        <div className='min-w-0 pt-0.5'>
          <h1 className='text-lg font-medium leading-tight text-c6'>{title}</h1>
          {description ? <p className='mt-1 text-sm leading-snug text-c5'>{description}</p> : null}
        </div>
      </div>
    </header>
  );
}
