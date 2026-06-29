import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IntervenantCard } from '@/components/features/pages/intervenants/IntervenantCards';
import { getRandomActants } from '@/services/Items';
import { BGPattern } from '@/components/ui/bg-pattern';

// Table for dynamic placement mapping
const CARD_LAYOUTS = [
  "top-1/2 left-1/2 -translate-x-[40%] -translate-y-[50%] z-30 opacity-100",  // Card 1: Main Center Large
  "top-[15%] left-[-15%] z-10 scale-[0.75] origin-top-left opacity-70",       // Card 2: Top Left, behind
  "top-[40%] left-[0%] z-40 scale-[0.85] opacity-95",                         // Card 3: Middle Left, front
  "top-[6%] right-[-5%] z-0 scale-[0.75] origin-top-right opacity-70",        // Card 4: Top Right, far behind
  "bottom-[5%] right-[0%] z-50 scale-[0.95] origin-bottom-right opacity-100", // Card 5: Bottom Right, over edge
  "top-[-2%] left-[20%] z-0 scale-[0.65] origin-top opacity-70"               // Card 6: Top Center, furthest behind
];

export const IntervenantsSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [actants, setActants] = useState<any[]>([]);

  useEffect(() => {
    const fetchActants = async () => {
      setLoading(true);
      try {
        const data = await getRandomActants(6);
        setActants(data);
      } catch (error) {
        console.error("Erreur lors du chargement des intervenants", error);
      } finally {
        setLoading(false);
      }
    };
    fetchActants();
  }, []);

  return (
    <section className="flex gap-12 h-[600px] items-center">
      {/* Left side - Title and description */}
      <div className="flex-1 flex flex-col justify-center gap-5 max-w-md relative z-50">
        <h2 className="text-c6 text-6xl transition-all ease-in-out duration-200 leading-[1.1]"> 
          Intervenants & <br/> Conférenciers 
        </h2>
        <p className="text-c5 text-base transition-all ease-in-out duration-200">
          Découvrez les chercheur·e·s, artistes et invité·e·s ayant contribué aux séminaires, colloques, journées d'études et œuvres d'EdiSem.
        </p>
        <Link 
          to="/intervenants" 
          className="hover:bg-c3 bg-c2 border-c3 shadow-[inset_0_0px_10px_rgba(255,255,255,0.05)] w-fit cursor-pointer px-4 py-2.5 text-base gap-2.5 text-c6 rounded-lg border-2 transition-all ease-in-out duration-200"
        >
          <div className="font-medium">Voir plus</div>
        </Link>
      </div>

      {/* Right side - Abstract overlapping grid layout */}
      <div className="flex-1 h-full relative flex items-center justify-center rounded-3xl group ml-1.5">
        
        {/* Background Dot Pattern */}
        <BGPattern 
            variant="dots" 
            mask="fade-edges" 
            fill="rgba(255,255,255,0.15)"
            size={24}
        />

        {loading ? (
          <div className="relative w-full h-[500px] flex items-center justify-center">
             <div className="w-[260px] h-[320px] animate-pulse bg-c3/20 rounded-4xl border border-c3/50 shadow-2xl" />
          </div>
        ) : (
          <div className="relative w-[600px] h-[500px] flex items-center justify-center">
            {actants.slice(0, 6).map((actant, index) => (
              <IntervenantCard 
                key={actant.id}
                {...actant}
                disableClick
                className={`absolute w-[260px] !h-fit p-10 transition-all duration-300 ${CARD_LAYOUTS[index] || ''}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};