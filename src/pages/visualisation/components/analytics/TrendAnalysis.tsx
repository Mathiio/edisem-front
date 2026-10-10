import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { getKeywordTrends, KeywordTrendsData } from '@/services/Analytics';
import { Slider } from '@heroui/react';
import { TrendingUp, Layers, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ViewLoader } from './ViewLoader';

// Palette de couleurs pour les keywords
const KEYWORD_COLORS = [
  '#c2410c', // datavisOrange
  '#0284c7', // datavisBlue
  '#84cc16', // datavisGreen
  '#eab308', // datavisYellow
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
];

interface TrendAnalysisProps {
  onKeywordClick?: (keywordId: number, keywordTitle: string) => void;
}

// Calcul de la tendance d'un keyword
function calculateTrend(timeline: KeywordTrendsData['timeline'], key: string): 'up' | 'down' | 'stable' {
  if (timeline.length < 2) return 'stable';

  const firstHalf = timeline.slice(0, Math.ceil(timeline.length / 2));
  const secondHalf = timeline.slice(Math.floor(timeline.length / 2));

  const avgFirst = firstHalf.reduce((sum, d) => sum + ((d[key] as number) || 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, d) => sum + ((d[key] as number) || 0), 0) / secondHalf.length;

  if (avgFirst === 0) return avgSecond > 0 ? 'up' : 'stable';

  const change = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (Math.abs(change) < 10) return 'stable';
  return change > 0 ? 'up' : 'down';
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ onKeywordClick }) => {
  const [data, setData] = useState<KeywordTrendsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywordLimit, setKeywordLimit] = useState(8);
  const [visibleKeywords, setVisibleKeywords] = useState<Set<number>>(new Set());
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getKeywordTrends(keywordLimit);
        setData(result);
        setVisibleKeywords(new Set(result.keywords.map((kw) => kw.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [keywordLimit]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: width - 20, height: Math.max(300, height - 20) });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Données filtrées selon les keywords visibles
  const filteredData = useMemo(() => {
    if (!data) return null;

    const filteredKeywords = data.keywords.filter((kw) => visibleKeywords.has(kw.id));

    return {
      keywords: filteredKeywords,
      timeline: data.timeline,
    };
  }, [data, visibleKeywords]);

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || !filteredData || filteredData.keywords.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    const g = svg.attr('width', width).attr('height', height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Échelles
    const years = filteredData.timeline.map((d) => d.year);
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(years) || 2020, d3.max(years) || 2024])
      .range([0, innerWidth]);

    // Calculer le max pour l'axe Y
    let maxValue = 0;
    if (chartType === 'area') {
      filteredData.timeline.forEach((point) => {
        let sum = 0;
        filteredData.keywords.forEach((kw) => {
          sum += (point[kw.key] as number) || 0;
        });
        if (sum > maxValue) maxValue = sum;
      });
    } else {
      filteredData.timeline.forEach((point) => {
        filteredData.keywords.forEach((kw) => {
          const value = (point[kw.key] as number) || 0;
          if (value > maxValue) maxValue = value;
        });
      });
    }

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([innerHeight, 0]);

    // Couleurs
    const colorScale = d3
      .scaleOrdinal<number, string>()
      .domain(filteredData.keywords.map((kw) => kw.id))
      .range(KEYWORD_COLORS);

    // Grille horizontale
    g.append('g')
      .attr('class', 'grid-y')
      .attr('opacity', 0.2)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      )
      .selectAll('line')
      .attr('stroke', 'currentColor');

    g.selectAll('.grid-y .domain').remove();

    // Axe X
    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => String(d))
          .ticks(years.length),
      );

    xAxis.selectAll('text').attr('fill', 'currentColor').attr('font-size', '12px');
    xAxis.selectAll('line, .domain').attr('stroke', 'currentColor').attr('opacity', 0.3);

    // Label axe X
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('opacity', 0.6)
      .attr('font-size', '12px')
      .text('Année');

    // Axe Y
    const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(5));
    yAxis.selectAll('text').attr('fill', 'currentColor').attr('font-size', '12px');
    yAxis.selectAll('line, .domain').attr('stroke', 'currentColor').attr('opacity', 0.3);

    // Label axe Y
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('opacity', 0.6)
      .attr('font-size', '12px')
      .text('Nombre de ressources');

    // Dessiner les courbes
    if (chartType === 'area') {
      const stack = d3
        .stack<(typeof filteredData.timeline)[0]>()
        .keys(filteredData.keywords.map((kw) => kw.key))
        .value((d, key) => (d[key] as number) || 0);

      const stackedData = stack(filteredData.timeline);

      const area = d3
        .area<d3.SeriesPoint<(typeof filteredData.timeline)[0]>>()
        .x((d) => xScale(d.data.year))
        .y0((d) => yScale(d[0]))
        .y1((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      g.selectAll('.area')
        .data(stackedData)
        .join('path')
        .attr('class', 'area')
        .attr('fill', (d) => {
          const kw = filteredData.keywords.find((k) => k.key === d.key);
          return kw ? colorScale(kw.id) : '#666';
        })
        .attr('fill-opacity', 0.8)
        .attr('stroke', (d) => {
          const kw = filteredData.keywords.find((k) => k.key === d.key);
          return kw ? colorScale(kw.id) : '#666';
        })
        .attr('stroke-width', 1.5)
        .attr('d', area)
        .style('cursor', 'pointer')
        .on('click', (_, d) => {
          const kw = filteredData.keywords.find((k) => k.key === d.key);
          if (kw && onKeywordClick) {
            onKeywordClick(kw.id, kw.title);
          }
        });
    } else {
      const line = d3
        .line<(typeof filteredData.timeline)[0]>()
        .x((d) => xScale(d.year))
        .curve(d3.curveMonotoneX);

      filteredData.keywords.forEach((kw) => {
        line.y((d) => yScale((d[kw.key] as number) || 0));

        g.append('path')
          .datum(filteredData.timeline)
          .attr('fill', 'none')
          .attr('stroke', colorScale(kw.id))
          .attr('stroke-width', 3)
          .attr('d', line)
          .style('cursor', 'pointer')
          .on('click', () => {
            if (onKeywordClick) {
              onKeywordClick(kw.id, kw.title);
            }
          });

        // Points
        g.selectAll(`.dot-${kw.id}`)
          .data(filteredData.timeline)
          .join('circle')
          .attr('class', `dot-${kw.id}`)
          .attr('cx', (d) => xScale(d.year))
          .attr('cy', (d) => yScale((d[kw.key] as number) || 0))
          .attr('r', 5)
          .attr('fill', colorScale(kw.id))
          .attr('stroke', 'white')
          .attr('stroke-width', 2);
      });
    }
  }, [filteredData, dimensions, chartType, onKeywordClick]);

  // Toggle keyword visibility
  const toggleKeyword = (keywordId: number) => {
    setVisibleKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keywordId)) {
        next.delete(keywordId);
      } else {
        next.add(keywordId);
      }
      return next;
    });
  };

  return (
    <ViewLoader
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.keywords.length === 0}
      icon={<TrendingUp />}
      title='Aucune donnée'
      emptyMessage='Pas de données de tendances disponibles.'

      >
      <div className='flex-1 w-full h-full bg-c1 overflow-hidden flex flex-col'>
        {/* Header avec titre et contrôles */}
        <div className='p-4 border-b border-c3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <TrendingUp size={20} className='text-c5' />
            <div>
              <h2 className='text-c6 font-medium'>Évolution des mots-clés par année</h2>
              <p className='text-c4 text-xs mt-2'>
                Visualisez comment les thématiques évoluent dans le temps ({data?.timeline[0]?.year} - {data?.timeline[data?.timeline.length - 1]?.year})
              </p>
            </div>
          </div>

          <div className='flex items-center gap-5'>
            {/* Type de graphique */}
            <div className='flex items-center gap-4 bg-c2 rounded-lg p-4'>
              <button
                onClick={() => setChartType('area')}
                className={`px-12 py-6 rounded-md text-xs font-medium transition-colors flex items-center gap-6 ${chartType === 'area' ? 'bg-c3 text-c6' : 'text-c4 hover:text-c5'}`}>
                <Layers size={14} />
                Aires
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-12 py-6 rounded-md text-xs font-medium transition-colors flex items-center gap-6 ${chartType === 'line' ? 'bg-c3 text-c6' : 'text-c4 hover:text-c5'}`}>
                <TrendingUp size={14} />
                Lignes
              </button>
            </div>

            {/* Slider nombre de keywords */}
            <div className='flex items-center gap-2.5'>
              <span className='text-c4 text-xs'>Mots-clés:</span>
              <Slider size='md' step={2} minValue={4} maxValue={15} defaultValue={keywordLimit} onChangeEnd={(val) => setKeywordLimit(val as number)} className='w-24' />
              <span className='text-c6 text-sm font-medium'>{keywordLimit}</span>
            </div>
          </div>
        </div>

        {/* Corps: Graphique + Légende */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Graphique */}
          <div ref={containerRef} className='flex-1 overflow-hidden p-4'>
            <svg ref={svgRef} className='w-full h-full text-c5' />
          </div>

          {/* Légende à droite */}
          <div className='w-56 border-l border-c3 p-4 overflow-y-auto'>
            <h3 className='text-c6 font-medium text-sm mb-4'>Légende</h3>
            <p className='text-c4 text-xs mb-12'>Cliquez pour afficher/masquer un mot-clé</p>

            <div className='flex flex-col gap-6'>
              {data?.keywords.map((kw, idx) => {
                const trend = calculateTrend(data?.timeline || [], kw.key);
                const color = KEYWORD_COLORS[idx % KEYWORD_COLORS.length];
                const isVisible = visibleKeywords.has(kw.id);

                return (
                  <button
                    key={kw.id}
                    onClick={() => toggleKeyword(kw.id)}
                    className={`flex items-center gap-8 p-8 rounded-lg transition-all text-left ${isVisible ? 'bg-c2' : 'bg-transparent opacity-40'}`}>
                    {/* Pastille couleur */}
                    <div className='w-12 h-12 rounded-4 flex-shrink-0' style={{ backgroundColor: color }} />

                    {/* Infos */}
                    <div className='flex-1 min-w-0'>
                      <p className={`text-xs font-medium truncate ${isVisible ? 'text-c6' : 'text-c4'}`}>{kw.title}</p>
                      <p className='text-c4 text-[10px]'>{kw.total} ressources</p>
                    </div>

                    {/* Tendance */}
                    <div className='flex-shrink-0'>
                      {trend === 'up' && <ArrowUp size={14} className='text-datavisGreen' />}
                      {trend === 'down' && <ArrowDown size={14} className='text-datavisOrange' />}
                      {trend === 'stable' && <Minus size={14} className='text-c4' />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explication tendances */}
            <div className='mt-4 pt-4 border-t border-c3'>
              <h4 className='text-c5 text-xs font-medium mb-8'>Indicateurs de tendance</h4>
              <div className='flex flex-col gap-4 text-xs'>
                <div className='flex items-center gap-6'>
                  <ArrowUp size={12} className='text-datavisGreen' />
                  <span className='text-c4'>En hausse (+10%)</span>
                </div>
                <div className='flex items-center gap-6'>
                  <ArrowDown size={12} className='text-datavisOrange' />
                  <span className='text-c4'>En baisse (-10%)</span>
                </div>
                <div className='flex items-center gap-6'>
                  <Minus size={12} className='text-c4' />
                  <span className='text-c4'>Stable (±10%)</span>
                </div>
              </div>
            </div>

            {/* Mode d'affichage */}
            <div className='mt-4 pt-4 border-t border-c3'>
              <h4 className='text-c5 text-xs font-medium mb-8'>Mode d'affichage</h4>
              <div className='flex flex-col gap-4 text-xs text-c4'>
                <p>
                  <span className='font-medium text-c5'>Aires:</span> Les zones sont empilées, montrant la contribution de chaque mot-clé au total.
                </p>
                <p>
                  <span className='font-medium text-c5'>Lignes:</span> Chaque mot-clé est affiché séparément pour comparer les évolutions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ViewLoader>
  );
};

export default TrendAnalysis;
