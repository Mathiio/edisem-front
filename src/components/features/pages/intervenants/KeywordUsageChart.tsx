import React from 'react';
import { motion } from 'framer-motion';

interface KeywordsStats {
    keyword_id: string;
    keyword_label: string;
    count: number;
}

interface KeywordUsageChartProps {
    keywordsStats: KeywordsStats[] | null;
}

const KeywordUsageChart: React.FC<KeywordUsageChartProps> = ({ keywordsStats }) => {
    // Chart logic
    // Transform backend data to chart format
    // If stats are empty, use empty array
    const data = (keywordsStats || []).map(d => ({ 
        label: d.keyword_label || d.keyword_id, 
        value: Number(d.count) // ensure number
    }));

    const maxHeight = 400;

    // Find max value to normalize bars + buffer
    const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) * 1.2 : 10;
  
    // Y-axis ticks
    const step = 10;
    const ticks: number[] = [];
    for (let i = 0; i <= maxValue; i += step) {
        ticks.push(i);
    }

  return (
    <section className="w-full flex flex-col gap-5 items-center">
      <h2 className='text-2xl font-medium text-c6 text-center mb-2'>Mots clés les plus utilisés par nos intervenants</h2>
      
      <div className="w-fit h-[400px]">
        <div className="w-full flex gap-5 items-end justify-center" style={{ height: maxHeight }}>
          
          {/* Y Axis Labels */}
          <div className="flex flex-col justify-between h-full items-end pb-[55px] text-c5 text-sm font-normal">
             {[...ticks].reverse().map(tick => (
                 <span key={tick}>{tick}</span>
             ))}
          </div>

          {/* Chart Area */}
          <div className="flex-1 flex gap-10 justify-center items-end h-full relative pl-5 border-l-2 border-dashed border-c3/30 text-c6">
            
            {data.map((item, index) => {
                 const heightPercent = ticks.length > 0 ? (item.value / ticks[ticks.length - 1]) * 100 : 0;
                 
                 return (
                     <div key={index} className="flex flex-col items-center gap-4 w-80 max-w-[60px] h-full group">
                         {/* Bar Container */}
                         <div className="relative w-full flex-1 bg-c2 border-2 border-c3 rounded-2xl overflow-hidden">
                             {/* Filled Bar */}
                             <motion.div 
                                 initial={{ height: 0 }}
                                 animate={{ height: `${heightPercent}%` }}
                                 transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
                                 className="absolute bottom-0 left-0 right-0 w-full rounded-xl"
                                 style={{
                                     background: 'linear-gradient(to top, #291964 0%, #B4A4E5 100%)'
                                 }}
                             />
                         </div>
                         
                         {/* Label */}
                         <span className="text-center text-xs text-c6 font-medium leading-tight h-2.5 flex items-start justify-center">
                             {item.label}
                         </span>
                     </div>
                 );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default KeywordUsageChart;