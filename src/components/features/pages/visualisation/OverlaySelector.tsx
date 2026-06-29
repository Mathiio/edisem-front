import { FilterGroup } from './FilterPopup';

export type PredefinedFilter = {
  groups: FilterGroup[]; // Changé de group à groups (tableau)
  label: string;
};

type OverlaySelectorProps = {
  filters: PredefinedFilter[];
  onSelect: (groups: FilterGroup[]) => void; // Changé pour accepter un tableau
};

export default function OverlaySelector({ filters, onSelect }: OverlaySelectorProps) {
  return (
    <div className='absolute z-[9] left-0 w-full h-full bg-c1 flex flex-col items-center justify-center gap-5'>
      <div className='flex flex-col gap-1.5 justify-center items-center'>
        <p className='text-sm text-c4'>Edisem - Datavisualisation</p>
        <h1 className='text-3xl text-c6'>Que recherchez vous ?</h1>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 py-5 px-24 rounded-full  max-w-xl'>
        {filters.map((filter, index) => (
          <button
            key={index}
            className='p-5 text-base rounded-xl border-2 border-c3 bg-white text-c6 font-medium hover:bg-c2 transition cursor-pointer text-left'
            onClick={() => onSelect(filter.groups)}>
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
