import { useMemo } from 'react';



interface IntervenantsStatisticsProps {
  counts: {
    actants: string | number;
    universities: string | number;
    laboratories: string | number;
    countries: string | number;
    doctoralSchools: string | number;
  } | null;
  loading: boolean;
}

export default function IntervenantsStats({ counts, loading }: IntervenantsStatisticsProps) {
  const statistics = useMemo(() => {
    if (!counts) {
      return {
        intervenantsCount: '0+',
        universitiesCount: 0,
        laboratoriesCount: 0,
        countriesCount: 0
      };
    }

    // Round number of actants down to the nearest 10 if number (e.g., 93 -> "90+")
    // If it's came as string from PHP? DB returns string or int.
    const totalIntervenants = Number(counts.actants);
    const intervenantsRounded = Math.floor(totalIntervenants / 10) * 10;
    const intervenantsCount = intervenantsRounded === 0 ? totalIntervenants.toString() : `${intervenantsRounded}+`;

    return {
      intervenantsCount,
      universitiesCount: counts.universities,
      laboratoriesCount: counts.laboratories,
      countriesCount: counts.countries
    };
  }, [counts]);

  // Small card component for displaying one stat
  const StatCard = ({ title, value, description }: {
    title: string;
    value: string | number;
    description: string;
  }) => (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-6xl text-c6 font-bold">{loading ? '0' : value}</h3>
      <div className="py-1.5 px-2.5 flex bg-c2 w-fit rounded-lg">
        <p className="text-base font-medium text-c5">{title}</p>
      </div>
      <p className="text-base font-regular text-c5">{description}</p>
    </div>
  );

  return (
    <section className='grid grid-cols-2 gap-12'>
      {/* Left side – Title and description */}
      <div className='flex-1 flex flex-col justify-between'>
        <h2 className='text-c6 text-6xl transition-all ease-in-out duration-200'>
          Quelques <br/>
          Statistiques
        </h2>
        <p className='text-c5 text-base transition-all ease-in-out duration-200 max-w-md'>
          De Paris à Montréal, de Londres à Turin, en passant par Tokyo ou Boston, les intervenant·es explorent des thématiques aussi diverses que l’intelligence artificielle, les pratiques artistiques numériques, la sémiotique ou l’éthique des technologies.          
        </p>
      </div>
      {/* Right side – Grid of stat cards */}
      <div className="grid grid-cols-2 w-px/2 gap-10">
        <StatCard
          value={statistics.intervenantsCount}
          title="Intervenants identifiés"
          description="Profils issus de disciplines variées : artistes, chercheurs, philosophes, doctorants..."
        />
        <StatCard
          value={statistics.universitiesCount}
          title="Universités représentées"
          description="Université Paris 8, Laval, Montréal, Sorbonne, Utrecht, Turin, NYU, MIT..."
        />
        <StatCard
          value={statistics.laboratoriesCount}
          title="Laboratoires associés"
          description="Laboratoire Paragraphe, LaRSH, CRILCQ, LANTISS, IRCAM, CELSA..."
        />
        <StatCard
          value={statistics.countriesCount}
          title="Pays représentés"
          description="De Paris à Montréal, de Londres à Turin, en passant par Tokyo ou Boston..."
        />
      </div>
    </section>
  );
};