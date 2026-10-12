import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab } from '@/theme/components';
import { FlaskConical, GitBranch, Network } from 'lucide-react';

import { AnalyticsViewHeader } from '../components/analytics/AnalyticsViewHeader';
import { DatavisCorpusLoading } from '@/components/features/pages/visualisation/DatavisCorpusLoading';
import { BipartiteGraphCanvas } from '../components/corpusLab/BipartiteGraphCanvas';
import { useRecitsData, type RecitType } from '../hooks/useRecitsData';
import { useQuestionsGuideData } from '../hooks/useQuestionsGuideData';
import { RecitTypesFilterSelect } from '../components/RecitTypesFilterSelect';
import { ALL_TYPES, TYPE_CONFIG } from '../recitTypeConfig';
import { PromesseRisquePanel } from './corpusLab/PromesseRisquePanel';
import { TypeEnjeuxSankey } from './guideInsights/TypeEnjeuxSankey';
import {
  buildRecitsKeywordsBipartite,
  buildQuestionsRecitsBipartite,
  buildPromesseRisqueOppositions,
  computeHubScores,
} from '../utils/corpusLabData';

const CONTROLS_BAR_CLASS =
  'flex items-center gap-3 px-4 py-3 flex-shrink-0 flex-wrap rounded-2xl border-2 border-c3 bg-transparent';

const TAB_CLASS_NAMES = {
  base: 'w-auto flex-none',
  tabList:
    'inline-flex w-auto max-w-full overflow-x-auto bg-c2 border-2 border-c3 rounded-xl p-1 gap-1 min-h-11 h-11',
  cursor: 'bg-action rounded-lg shadow-none',
  tab: 'px-2.5 text-sm text-c5 data-[selected=true]:text-white justify-center rounded-lg whitespace-nowrap',
  tabContent: 'group-data-[selected=true]:text-white text-sm',
  panel: 'hidden p-0 m-0 h-0 min-h-0',
};

type LabTab = 'bipartiteKw' | 'questionsGraph' | 'sankeyEnjeux' | 'promesseRisque' | 'hubScore';

export const CorpusLabView: React.FC = () => {
  const navigate = useNavigate();
  const { nodes, links, loading, error } = useRecitsData(1);
  const { coverage, loading: qLoading, error: qError } = useQuestionsGuideData();
  const [activeTypes, setActiveTypes] = useState<Set<RecitType>>(() => new Set(ALL_TYPES));
  const [tab, setTab] = useState<LabTab>('bipartiteKw');

  const [topKw, setTopKw] = useState(18);
  const [maxRecitsGraph, setMaxRecitsGraph] = useState(32);
  const [topEnjeux, setTopEnjeux] = useState(14);

  const kwGraph = useMemo(
    () => buildRecitsKeywordsBipartite(nodes, activeTypes, topKw, maxRecitsGraph),
    [nodes, activeTypes, topKw, maxRecitsGraph],
  );
  const qGraph = useMemo(
    () => buildQuestionsRecitsBipartite(coverage, activeTypes),
    [coverage, activeTypes],
  );

  const opposition = useMemo(
    () => buildPromesseRisqueOppositions(nodes, activeTypes),
    [nodes, activeTypes],
  );
  const hubs = useMemo(() => computeHubScores(nodes, links, activeTypes), [nodes, links, activeTypes]);
  const topHubs = hubs.slice(0, 25);

  if (loading || qLoading) {
    return (
      <DatavisCorpusLoading
        label='Chargement du corpus…'
        hint='Récits, questions guide et graphes analytiques'
      />
    );
  }

  if (error || qError) {
    return (
      <div className='flex flex-1 items-center justify-center p-6 text-sm text-red-400'>
        Erreur : {error ?? qError}
      </div>
    );
  }

  return (
    <div className='flex flex-1 min-h-0 flex-col gap-4 overflow-hidden'>
      <AnalyticsViewHeader
        title='Lab corpus'
        description='Graphes bipartites, flux type → enjeux Imaginaire, tensions promesses/risques et hubs du réseau de proximité.'
        icon={<FlaskConical size={20} className='text-datavisBlue' />}
      />

      <div className={CONTROLS_BAR_CLASS}>
        <Tabs
          aria-label='Outils lab corpus'
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k as LabTab)}
          classNames={TAB_CLASS_NAMES}>
          <Tab key='bipartiteKw' title='Récits ↔ mots-clés' />
          <Tab key='questionsGraph' title='Questions ↔ récits' />
          <Tab key='sankeyEnjeux' title='Sankey enjeux' />
          <Tab key='promesseRisque' title='Promesses/risques' />
          <Tab key='hubScore' title='Hub score' />
        </Tabs>
        <RecitTypesFilterSelect activeTypes={activeTypes} onChange={setActiveTypes} />

        {tab === 'sankeyEnjeux' ? (
          <label className='flex items-center gap-2 text-sm text-c5'>
            Top enjeux
            <input
              type='number'
              min={6}
              max={24}
              value={topEnjeux}
              onChange={(e) => setTopEnjeux(Number(e.target.value) || 14)}
              className='w-14 rounded-md border border-c3 bg-c1 px-2 py-1 text-c6'
            />
          </label>
        ) : null}
      </div>

      <div className='flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-c3 bg-c2 p-4 overflow-hidden'>
        {tab === 'bipartiteKw' && (
          <>
            <div className='flex flex-wrap items-center gap-3 mb-3 shrink-0 text-sm text-c5'>
              <label className='flex items-center gap-2'>
                Top mots-clés
                <input
                  type='number'
                  min={6}
                  max={30}
                  value={topKw}
                  onChange={(e) => setTopKw(Number(e.target.value) || 18)}
                  className='w-14 rounded-md border border-c3 bg-c1 px-2 py-1 text-c6'
                />
              </label>
              <label className='flex items-center gap-2'>
                Max récits
                <input
                  type='number'
                  min={12}
                  max={60}
                  value={maxRecitsGraph}
                  onChange={(e) => setMaxRecitsGraph(Number(e.target.value) || 32)}
                  className='w-14 rounded-md border border-c3 bg-c1 px-2 py-1 text-c6'
                />
              </label>
              <span className='text-c4'>{kwGraph.links.length} liens</span>
            </div>
            <BipartiteGraphCanvas
              model={kwGraph}
              leftLabel='Récits'
              rightLabel='Mots-clés (thésaurus)'
            />
          </>
        )}

        {tab === 'questionsGraph' && (
          <>
            <p className='text-sm text-c5 mb-3 shrink-0'>
              Questions avec ≥1 récit (types actifs), triées par couverture · max 40 questions
            </p>
            <BipartiteGraphCanvas model={qGraph} leftLabel='Questions guide' rightLabel='Récits' />
          </>
        )}

        {tab === 'sankeyEnjeux' && (
          <>
            <div className='flex items-center gap-2 text-sm text-c6 mb-3 shrink-0'>
              <GitBranch size={16} className='text-c4' />
              Type de récit → enjeux (storyline:hasTheme)
            </div>
            <TypeEnjeuxSankey nodes={nodes} activeTypes={activeTypes} topEnjeux={topEnjeux} />
          </>
        )}

        {tab === 'promesseRisque' && (
          <PromesseRisquePanel
            promesses={opposition.promesses}
            risques={opposition.risques}
            cells={opposition.cells}
            max={opposition.max}
          />
        )}

        {tab === 'hubScore' && (
          <div className='grid min-h-0 flex-1 gap-4 lg:grid-cols-2'>
            <div className='overflow-auto rounded-xl border border-c3 min-h-0'>
              <table className='w-full text-sm'>
                <thead className='sticky top-0 z-[1] bg-c2 text-xs text-c5'>
                  <tr>
                    <th className='p-2 text-left'>Récit</th>
                    <th className='p-2 w-14'>Deg.</th>
                    <th className='p-2 w-14'>Σ w</th>
                    <th className='p-2 w-14'>Hub</th>
                  </tr>
                </thead>
                <tbody>
                  {topHubs.map((h) => (
                    <tr key={h.recit.id} className='border-t border-c3/40 hover:bg-c3/30'>
                      <td className='p-2'>
                        <button
                          type='button'
                          className='cursor-pointer text-left text-c6 hover:text-action'
                          onClick={() => navigate(h.recit.url)}>
                          <span
                            className='inline-block w-2 h-2 rounded-full me-2'
                            style={{ background: TYPE_CONFIG[h.recit.type].color }}
                          />
                          {h.recit.title}
                        </button>
                      </td>
                      <td className='p-2 tabular-nums text-c5'>{h.degree}</td>
                      <td className='p-2 tabular-nums text-c5'>{h.weightedDegree}</td>
                      <td className='p-2 tabular-nums font-semibold text-datavisBlue'>
                        {h.betweennessApprox}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className='flex flex-col gap-2 text-sm text-c5 min-h-0 overflow-auto'>
              <div className='flex items-center gap-2 text-c6'>
                <Network size={16} />
                Graphe global = réseau de proximité (6 dims Imaginaire, sans mots-clés)
              </div>
              <p className='text-c4 text-xs leading-relaxed'>
                <strong className='text-c5'>Degré</strong> : nombre de voisins dans le graphe filtré.
                <strong className='text-c5'> Σ w</strong> : somme des poids de proximité (0–6).
                <strong className='text-c5'> Hub</strong> : produit approximatif (priorise les nœuds à
                la fois connectés et fortement liés).
              </p>
              <ul className='space-y-2'>
                {topHubs.slice(0, 8).map((h) => (
                  <li
                    key={h.recit.id}
                    className='rounded-lg border border-c3 bg-c1/80 px-3 py-2'
                    style={{
                      borderLeftWidth: 4,
                      borderLeftColor: TYPE_CONFIG[h.recit.type].color,
                    }}>
                    <p className='text-c6 font-medium leading-snug'>{h.recit.title}</p>
                    <p className='text-xs text-c4 mt-1'>
                      {TYPE_CONFIG[h.recit.type].short} · {h.degree} voisins · hub {h.betweennessApprox}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
