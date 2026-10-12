import { useMemo, useState, useRef, useCallback } from 'react';

import type { PromesseRisqueCell } from '../../utils/corpusLabData';

interface PromesseRisquePanelProps {
  promesses: string[];
  risques: string[];
  cells: PromesseRisqueCell[];
  max: number;
}

const HOVER_CLEAR_MS = 100;

function cellStyle(count: number, max: number, lit: boolean): React.CSSProperties {
  if (!lit) return { backgroundColor: 'rgba(30, 41, 59, 0.5)', opacity: 0.45 };
  if (count === 0) return { backgroundColor: 'rgba(51, 65, 85, 0.45)' };
  const t = count / max;
  return { backgroundColor: `rgba(168, 85, 247, ${0.28 + t * 0.72})` };
}

export function PromesseRisquePanel({ promesses, risques, cells, max }: PromesseRisquePanelProps) {
  const [hoverP, setHoverP] = useState<string | null>(null);
  const [hoverR, setHoverR] = useState<string | null>(null);
  const [pinned, setPinned] = useState<PromesseRisqueCell | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPairs = useMemo(() => cells.filter((c) => c.count > 0).slice(0, 12), [cells]);

  const countAt = (p: string, r: string) =>
    cells.find((c) => c.promesse === p && c.risque === r)?.count ?? 0;

  const cancelClear = useCallback(() => {
    if (clearRef.current) {
      clearTimeout(clearRef.current);
      clearRef.current = null;
    }
  }, []);

  const scheduleClear = useCallback(() => {
    if (pinned) return;
    cancelClear();
    clearRef.current = setTimeout(() => {
      setHoverP(null);
      setHoverR(null);
      clearRef.current = null;
    }, HOVER_CLEAR_MS);
  }, [pinned, cancelClear]);

  const setHover = useCallback(
    (p: string | null, r: string | null) => {
      cancelClear();
      setHoverP(p);
      setHoverR(r);
    },
    [cancelClear],
  );

  const pinCell = useCallback(
    (c: PromesseRisqueCell) => {
      cancelClear();
      setPinned((prev) =>
        prev?.promesse === c.promesse && prev?.risque === c.risque ? null : c,
      );
      setHoverP(c.promesse);
      setHoverR(c.risque);
    },
    [cancelClear],
  );

  const activeP = pinned?.promesse ?? hoverP;
  const activeR = pinned?.risque ?? hoverR;
  const activeCount =
    activeP && activeR ? countAt(activeP, activeR) : pinned?.count ?? null;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-hidden'>
      <p className='text-sm text-c5 shrink-0'>
        Matrice promesse × risque · survol ou clic pour le détail (panneau fixe en bas)
      </p>

      <div className='shrink-0 max-h-28 overflow-y-auto rounded-lg border border-c3/80 divide-y divide-c3/50'>
        {topPairs.map((c) => (
          <button
            key={`${c.promesse}-${c.risque}`}
            type='button'
            onClick={() => pinCell(c)}
            onMouseEnter={() => setHover(c.promesse, c.risque)}
            onMouseLeave={scheduleClear}
            className={`cursor-pointer w-full px-3 py-1.5 text-left text-xs hover:bg-c3/40 ${
              pinned?.promesse === c.promesse && pinned?.risque === c.risque ? 'bg-c3/50' : ''
            }`}>
            <span className='text-c6 line-clamp-1'>{c.promesse}</span>
            <span className='text-c4 mx-1'>×</span>
            <span className='text-c5 line-clamp-1'>{c.risque}</span>
            <span className='float-right tabular-nums font-semibold text-datavisBlue'>{c.count}</span>
          </button>
        ))}
      </div>

      <div
        className='overflow-auto min-h-0 flex-1 rounded-xl border border-c3'
        onMouseEnter={cancelClear}
        onMouseLeave={() => {
          if (!pinned) {
            setHoverP(null);
            setHoverR(null);
          }
        }}>
        <table className='border-collapse text-sm min-w-max'>
          <thead>
            <tr>
              <th className='sticky left-0 top-0 z-[3] bg-c2 p-2 border-b border-r border-c3 min-w-[200px] max-w-[280px] text-left text-xs text-c5'>
                Promesse ↓ / Risque →
              </th>
              {risques.map((r) => {
                const colLit = !activeR || activeR === r;
                return (
                  <th
                    key={r}
                    onMouseEnter={() => setHover(hoverP, r)}
                    onMouseLeave={scheduleClear}
                    className={`sticky top-0 z-[2] border-b border-c3 p-2 text-left font-normal min-w-[100px] max-w-[140px] align-bottom cursor-default ${
                      colLit ? 'bg-c2 text-c6' : 'bg-c2/60 text-c4/50'
                    } ${activeR === r ? 'ring-1 ring-inset ring-action/40' : ''}`}>
                    <span className='text-[11px] leading-snug line-clamp-4' title={r}>
                      {r}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {promesses.map((p) => {
              const rowLit = !activeP || activeP === p;
              return (
                <tr key={p}>
                  <th
                    onMouseEnter={() => setHover(p, hoverR)}
                    onMouseLeave={scheduleClear}
                    className={`sticky left-0 z-[1] border-b border-r border-c3 p-2 text-left font-medium min-w-[200px] max-w-[280px] cursor-default ${
                      rowLit ? 'bg-c1 text-c6' : 'bg-c1/50 text-c4/50'
                    } ${activeP === p ? 'ring-1 ring-inset ring-action/40' : ''}`}>
                    <span className='text-xs leading-snug line-clamp-3' title={p}>
                      {p}
                    </span>
                  </th>
                  {risques.map((r) => {
                    const count = countAt(p, r);
                    const cellLit =
                      rowLit && (!activeR || activeR === r) && (!activeP || activeP === p);
                    const isCross = activeP === p && activeR === r;
                    return (
                      <td
                        key={r}
                        onMouseEnter={() => setHover(p, r)}
                        onMouseLeave={scheduleClear}
                        onClick={() => pinCell({ promesse: p, risque: r, count })}
                        className={`border-b border-c3/50 p-0 text-center tabular-nums cursor-pointer min-w-[2.5rem] ${
                          isCross ? 'ring-2 ring-action/60 ring-inset' : ''
                        }`}
                        style={cellStyle(count, max, cellLit)}
                        title={`${p} × ${r} : ${count} récit(s)`}>
                        <span
                          className={`inline-block py-2.5 px-1 text-sm ${
                            count > 0 && cellLit ? 'font-semibold text-white' : 'text-c4'
                          }`}>
                          {count > 0 ? count : '·'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className='shrink-0 h-[5.25rem] overflow-hidden rounded-xl border border-c3 bg-c2/90 px-4 py-2.5'>
        {activeP && activeR ? (
          <>
            <p className='text-[10px] uppercase tracking-wide text-c4'>Tension</p>
            <p className='text-sm text-c6 font-medium leading-snug line-clamp-1 mt-0.5'>{activeP}</p>
            <p className='text-sm text-c6 font-medium leading-snug line-clamp-1'>{activeR}</p>
            <p className='text-datavisBlue tabular-nums text-sm mt-1'>
              <strong>{activeCount ?? 0}</strong> récit(s)
              {pinned ? (
                <button
                  type='button'
                  className='cursor-pointer ms-3 text-xs text-action'
                  onClick={() => {
                    setPinned(null);
                    setHoverP(null);
                    setHoverR(null);
                  }}>
                  Désépingler
                </button>
              ) : (
                <span className='text-c4 text-xs ms-2'>· clic cellule pour épingler</span>
              )}
            </p>
          </>
        ) : activeP || activeR ? (
          <p className='text-sm text-c5 leading-snug line-clamp-3'>
            {activeP ? (
              <>
                <span className='text-c4'>Promesse · </span>
                {activeP}
              </>
            ) : null}
            {activeR ? (
              <>
                <span className='text-c4'>{activeP ? ' — ' : 'Risque · '}</span>
                {activeR}
              </>
            ) : null}
            <span className='block text-xs text-c4 mt-1'>Croisez avec une ligne ou colonne pour la paire complète.</span>
          </p>
        ) : (
          <p className='text-xs text-c4 leading-relaxed'>
            Survolez la matrice ou une paire dans la liste. Le détail s&apos;affiche ici sans déplacer le
            tableau.
          </p>
        )}
      </div>
    </div>
  );
}
