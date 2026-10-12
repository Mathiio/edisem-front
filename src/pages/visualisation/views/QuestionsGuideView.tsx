import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Checkbox, Select, SelectItem } from '@/theme/components';
import { HelpCircle } from 'lucide-react';

import { AnalyticsViewHeader } from '../components/analytics/AnalyticsViewHeader';
import { DatavisCorpusLoading } from '@/components/features/pages/visualisation/DatavisCorpusLoading';
import { useQuestionsGuideData, type QuestionGuideCoverage } from '../hooks/useQuestionsGuideData';
import { TYPE_CONFIG } from '../recitTypeConfig';
import { RecitTypesFilterSelect } from '../components/RecitTypesFilterSelect';
import type { RecitType } from '../hooks/useRecitsData';
import { ALL_TYPES } from '../recitTypeConfig';

const CONTROLS_BAR_CLASS =
  'flex items-center gap-3 px-4 py-3 flex-shrink-0 flex-wrap rounded-2xl border-2 border-c3 bg-transparent';

export const QuestionsGuideView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { coverage, loading, error, domains } = useQuestionsGuideData();
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [onlyUncovered, setOnlyUncovered] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<RecitType>>(() => new Set(ALL_TYPES));
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const q = searchParams.get('question');
    if (!q) return;
    const id = Number.parseInt(q, 10);
    if (Number.isFinite(id)) setSelectedId(id);
  }, [searchParams]);

  const filtered = useMemo(() => {
    return coverage.filter(({ question, recits }) => {
      if (domainFilter !== 'all' && question.domain !== domainFilter) return false;
      const typedRecits = recits.filter((r) => activeTypes.has(r.type));
      if (onlyUncovered && typedRecits.length > 0) return false;
      return true;
    });
  }, [coverage, domainFilter, onlyUncovered, activeTypes]);

  const stats = useMemo(() => {
    const totalQuestions = coverage.length;
    const withRecit = coverage.filter((c) => c.recits.some((r) => activeTypes.has(r.type))).length;
    const recitsWithQuestion = new Set<number>();
    coverage.forEach((c) => {
      c.recits.forEach((r) => {
        if (activeTypes.has(r.type)) recitsWithQuestion.add(r.id);
      });
    });
    return {
      totalQuestions,
      covered: withRecit,
      uncovered: totalQuestions - withRecit,
      recitsTagged: recitsWithQuestion.size,
    };
  }, [coverage, activeTypes]);

  const selected: QuestionGuideCoverage | null = useMemo(() => {
    if (selectedId == null) return filtered[0] ?? null;
    return filtered.find((c) => c.question.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  const selectedRecits = useMemo(
    () => (selected ? selected.recits.filter((r) => activeTypes.has(r.type)) : []),
    [selected, activeTypes],
  );

  const domainSelectItems = useMemo(
    () => [{ key: 'all', label: 'Tous les domaines' }, ...domains.map((d) => ({ key: d, label: d }))],
    [domains],
  );

  if (loading) {
    return (
      <DatavisCorpusLoading
        label='Chargement des questions guide…'
        hint='Référentiel et couverture par récit'
      />
    );
  }

  if (error) {
    return (
      <div className='flex flex-1 items-center justify-center p-6'>
        <p className='text-sm text-red-400'>Erreur : {error}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-1 min-h-0 flex-col gap-4 overflow-hidden'>
      <AnalyticsViewHeader
        title='Questions guide'
        description='Couverture du référentiel EdiSem (template Questions guide) sur les récits via cito:discusses.'
        icon={<HelpCircle size={20} className='text-datavisBlue' />}
      />

      <div className='flex flex-wrap gap-2 text-sm'>
        <span className='rounded-xl border-2 border-c3 bg-c2 px-3 py-1.5 text-c6'>
          <strong>{stats.totalQuestions}</strong> questions
        </span>
        <span className='rounded-xl border-2 border-c3 bg-c2 px-3 py-1.5 text-c6'>
          <strong>{stats.covered}</strong> avec ≥1 récit
        </span>
        <span className='rounded-xl border-2 border-datavisOrange/40 bg-datavisOrange/10 px-3 py-1.5 text-c6'>
          <strong>{stats.uncovered}</strong> sans récit
        </span>
        <span className='rounded-xl border-2 border-c3 bg-c2 px-3 py-1.5 text-c6'>
          <strong>{stats.recitsTagged}</strong> récits annotés
        </span>
      </div>

      <div className={CONTROLS_BAR_CLASS}>
        <Select
          size='sm'
          aria-label='Filtrer par domaine'
          selectedKeys={new Set([domainFilter])}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0];
            setDomainFilter(k != null ? String(k) : 'all');
          }}
          className='min-w-[200px] max-w-xs'>
          {domainSelectItems.map((item) => (
            <SelectItem key={item.key} textValue={item.label}>
              {item.label}
            </SelectItem>
          ))}
        </Select>

        <RecitTypesFilterSelect activeTypes={activeTypes} onChange={setActiveTypes} />

        <Checkbox isSelected={onlyUncovered} onValueChange={setOnlyUncovered} size='sm'>
          <span className='text-sm text-c5'>Questions sans récit</span>
        </Checkbox>
      </div>

      <div className='grid min-h-0 flex-1 gap-4 lg:grid-cols-5'>
        <div className='lg:col-span-2 flex min-h-0 flex-col rounded-2xl border-2 border-c3 bg-c2 overflow-hidden'>
          <div className='border-b border-c3 px-4 py-3 text-sm font-medium text-c6'>
            Référentiel ({filtered.length})
          </div>
          <ul className='flex-1 overflow-y-auto divide-y divide-c3'>
            {filtered.length === 0 ? (
              <li className='p-4 text-sm text-c4'>Aucune question pour ces filtres.</li>
            ) : (
              filtered.map(({ question, recits }) => {
                const count = recits.filter((r) => activeTypes.has(r.type)).length;
                const isActive = selected?.question.id === question.id;
                return (
                  <li key={question.id}>
                    <button
                      type='button'
                      onClick={() => setSelectedId(question.id)}
                      className={`cursor-pointer w-full text-left px-4 py-3 transition-colors hover:bg-c3/50 ${
                        isActive ? 'bg-c3/60' : ''
                      }`}>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0 flex-1'>
                          {question.identifier ? (
                            <span className='text-xs font-mono text-c4'>{question.identifier}</span>
                          ) : null}
                          <p className='text-sm font-medium text-c6 leading-snug mt-0.5'>{question.title}</p>
                          {question.domain ? (
                            <p className='text-xs text-c4 mt-1'>{question.domain}</p>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md ${
                            count === 0 ? 'bg-datavisOrange/15 text-datavisOrange' : 'bg-c3 text-c5'
                          }`}>
                          {count}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className='lg:col-span-3 flex min-h-0 flex-col rounded-2xl border-2 border-c3 bg-c2 overflow-hidden'>
          {selected ? (
            <>
              <div className='border-b border-c3 px-5 py-4'>
                {selected.question.identifier ? (
                  <p className='text-xs font-mono text-c4 mb-1'>{selected.question.identifier}</p>
                ) : null}
                <h2 className='text-lg font-semibold text-c6 leading-snug'>{selected.question.title}</h2>
                {selected.question.description ? (
                  <p className='text-sm text-c5 mt-2 leading-relaxed'>{selected.question.description}</p>
                ) : null}
              </div>
              <div className='flex-1 overflow-y-auto px-5 py-4'>
                <h3 className='text-sm font-medium text-c6 mb-3'>
                  Récits associés ({selectedRecits.length})
                </h3>
                {selectedRecits.length === 0 ? (
                  <p className='text-sm text-c4'>
                    Aucun récit ne référence cette question pour les types sélectionnés. Vous pouvez
                    l&apos;ajouter dans la section « Imaginaire de l&apos;IA » en édition de récit.
                  </p>
                ) : (
                  <ul className='flex flex-col gap-2'>
                    {selectedRecits.map((recit) => {
                      const cfg = TYPE_CONFIG[recit.type];
                      return (
                        <li key={recit.id}>
                          <button
                            type='button'
                            onClick={() => navigate(recit.url)}
                            className='cursor-pointer w-full rounded-xl border-2 border-c3 bg-c1 px-4 py-3 text-left hover:border-action/40 transition-colors'>
                            <div className='flex items-center gap-2'>
                              <span
                                className='w-2.5 h-2.5 rounded-full shrink-0'
                                style={{ backgroundColor: cfg.color }}
                              />
                              <span className='text-sm font-medium text-c6'>{recit.title}</span>
                            </div>
                            <p className='text-xs text-c4 mt-1 ps-4'>{cfg.label}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className='flex flex-1 items-center justify-center p-6 text-sm text-c4'>
              Sélectionnez une question dans la liste.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
