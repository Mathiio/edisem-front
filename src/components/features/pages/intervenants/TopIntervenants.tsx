import { TopIcon } from '@/components/ui/icons';
import { Actant } from '@/types/ui';

// Props for main component
interface TopIntervenantsProps {
  actants: Actant[];
}

// Props for individual speaker cards
interface IntervenantCardProps {
  intervenant: Actant;
  position: 'first' | 'second' | 'third';
}

// Individual speaker card component
const IntervenantCard = ({ intervenant, position }: IntervenantCardProps) => {
  // Position-specific styles
  const positionStyles = {
    first: { container: 'transform -translate-y-5 z-10' },
    second: { container: 'transform translate-y-2.5 z-5' },
    third: { container: 'transform translate-y-2.5 z-5' },
  };

  const currentStyle = positionStyles[position];

  return (
    <a
      href={`/intervenant/${intervenant.id}`}
      className={`${currentStyle.container} flex flex-col items-center justify-center gap-5 p-10 rounded-2xl border-2 border-c3 w-64 hover:border-c4 transition-all duration-300`}>
      {/* Speaker stats */}
      <div className='flex flex-col items-center justify-center gap-2.5'>
        <h3 className={`text-6xl text-c6 font-bold`}>{intervenant.interventions}</h3>
        <p className='text-base text-c5 uppercase font-bold'>
          {intervenant.firstname} {intervenant.lastname}
        </p>
        {/* University affiliations */}
        <div className='flex flex-wrap items-center justify-center gap-2.5 mt-2.5'>
          {intervenant.universities?.map((university, index) => (
            <div key={index} className='flex items-center gap-1.5'>
              <img src={university.logo} alt={university.shortName} className='w-1.5 h-1.5 object-cover rounded-full' />
              {index === 0 && <p className='text-xs text-c5 font-normal'>{university.shortName}</p>}
            </div>
          ))}
        </div>
      </div>
    </a>
  );
};

// Main component
export default function TopIntervenants({ actants }: TopIntervenantsProps) {
  // Use the pre-sorted actants directly
  const topIntervenants = actants;

  return (
    <section className='flex flex-col items-center justify-center gap-10 p-5'>
      {/* Section header */}
      <div className='flex flex-col items-center justify-center gap-5'>
        <TopIcon size={40} className='text-c6' />
        <h2 className='text-2xl font-medium text-c6'>Top 3 des intervenants</h2>
      </div>

      {/* Podium layout */}
      {topIntervenants.length > 0 ? (
        <div className='flex items-end justify-center gap-5 p-5 w-full max-w-5xl'>
          {/* Second place */}
          {topIntervenants[1] && <IntervenantCard intervenant={topIntervenants[1]} position='second' />}
          {/* First place - center */}
          {topIntervenants[0] && <IntervenantCard intervenant={topIntervenants[0]} position='first' />}
          {/* Third place */}
          {topIntervenants[2] && <IntervenantCard intervenant={topIntervenants[2]} position='third' />}
        </div>
      ) : (
        <p className='text-c5 text-base'>Aucun intervenant trouvé</p>
      )}
    </section>
  );
}
