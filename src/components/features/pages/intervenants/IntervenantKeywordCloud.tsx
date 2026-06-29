import React, { useEffect, useState, useRef, useMemo } from 'react';
import { SearchModal, SearchModalRef } from '@/components/features/shared/search/SearchModal';
import { Tooltip } from '@heroui/react';

interface IntervenantKeywordCloudProps {
  keywordStats: KeywordStats[];
}

interface KeywordStats {
  id: string;
  title: string;
  localCount: number;
  globalCount: number;
}

export const IntervenantKeywordCloud: React.FC<IntervenantKeywordCloudProps> = ({ keywordStats: rawStats }) => {
  const [keywordStats, setKeywordStats] = useState<KeywordStats[]>([]);
  const searchModalRef = useRef<SearchModalRef>(null);

  useEffect(() => {
    // Logic de présentation (filtrage, tri, buffers) conservée
    
    const activeWords = rawStats.filter(s => s.localCount > 0);
    const passiveWords = rawStats.filter(s => s.localCount === 0);

    // Take active words first.
    let finalSelection = [...activeWords];
    
    // Fill remaining slots with top passive words.
    const limitCount = 60;
    const slotsRemaining = limitCount - activeWords.length;
    if (slotsRemaining > 0) {
        finalSelection = [...finalSelection, ...passiveWords.slice(0, slotsRemaining)];
    } else {
        // Edge case: if user has > 60 distinctive words, we reduce active list to top 60 global.
        finalSelection = finalSelection.slice(0, limitCount);
    }

    // "Sandwich" Sorting for Safe Zones
    const activeInSelection = finalSelection.filter(s => s.localCount > 0);
    const passiveInSelection = finalSelection.filter(s => s.localCount === 0);

    // Randomize passive words to pick buffers.
    const shuffledPassive = passiveInSelection.sort(() => Math.random() - 0.5);
    
    const topBufferCount = 15;
    const bottomBufferCount = 15;
    
    const topBuffer = shuffledPassive.slice(0, topBufferCount);
    const bottomBuffer = shuffledPassive.slice(topBufferCount, topBufferCount + bottomBufferCount);
    const remainingPassive = shuffledPassive.slice(topBufferCount + bottomBufferCount);
    
    // Middle pool = All Active + Remaining Passive
    const middlePool = [...activeInSelection, ...remainingPassive].sort(() => Math.random() - 0.5);

    const orderedStats = [...topBuffer, ...middlePool, ...bottomBuffer];
    
    setKeywordStats(orderedStats);
  }, [rawStats]);

  // Max Global Count for Sizing Context
  const maxGlobalCount = useMemo(() => {
        return Math.max(...keywordStats.map(k => k.globalCount), 0);
  }, [keywordStats]);

  const getFontSize = (count: number, max: number) => {
      const minSize = 14; 
      const maxSize = 42;
      if (max === 0) return minSize;
      
      return minSize + ((count / max) * (maxSize - minSize));
  };

  if (keywordStats.length === 0) {
    return <p className="text-c5 italic">Aucun mot clé disponible pour cet intervenant.</p>;
  }

  return (
    <div className="relative w-full h-[300px] overflow-hidden group rounded-3xl bg-c1">
      {/* Gradient Masks */}
      <div className="absolute top-0 left-0 w-full h-14 bg-gradient-to-b from-c1 to-transparent z-[20] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-14 bg-gradient-to-t from-c1 to-transparent z-[20] pointer-events-none"></div>

      <div className="flex flex-col justify-center h-full w-full">
         <div className="block text-center px-5 py-4 w-full overflow-hidden leading-[0.9] select-none">
            {keywordStats.map((stat, index) => {
            const fontSize = getFontSize(stat.globalCount, maxGlobalCount);
            const isUsedByIntervenant = stat.localCount > 0;
            
            const zIndex = Math.floor(19 - (fontSize / 3));  
            
            const colorClass = isUsedByIntervenant 
                ? "text-action hover:text-action-focus" 
                : "text-c4/20 hover:text-c5/60 blur-[0.5px] hover:blur-none transition-all duration-300";

            return (
                <Tooltip 
                key={`${stat.id}-${index}`}
                content={
                    <div className="p-2 gap-2 flex flex-col pointer-events-none ">
                      <p className="text-base font-bold uppercase">{stat.title}</p>
                      <div className="flex flex-col gap-px">
                        {isUsedByIntervenant ? (
                            <p className="text-xs text-c5">Utilisé {stat.localCount} fois par cet intervenant</p>
                        ) : (
                            <p className="text-xs text-c5">Non utilisé par cet intervenant</p>
                        )}
                        <p className="text-xs text-c4">Total global: {stat.globalCount}</p>
                      </div>
                    </div>
                }
                className="bg-c2 text-c6 border-c3 border-2"
                delay={0}
                closeDelay={0}
                >
                <button
                    onClick={() => searchModalRef.current?.openWithSearch(stat.title)}
                    className={`
                        relative inline-block
                        font-medium uppercase tracking-tight 
                        transition-all duration-300 ease-out
                        mx-[6px] my-0 align-middle
                        ${colorClass}
                    `}
                    style={{ 
                        fontSize: `${fontSize}px`,
                        zIndex: zIndex
                    }}
                >
                    {stat.title}
                </button>
                </Tooltip>
            );
            })}
            <span className="inline-block w-full"></span>
        </div>
      </div>
      
      <SearchModal ref={searchModalRef} notrigger />
    </div>
  );
};
