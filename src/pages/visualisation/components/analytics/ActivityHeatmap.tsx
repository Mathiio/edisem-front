import React, { useEffect, useState, useMemo } from 'react';
import { getActivityByDay, ActivityByDayData } from '@/services/Analytics';
import { Tooltip } from '@heroui/react';
import { TrendingUp, Activity, Calendar } from 'lucide-react';
import { AnalyticsViewHeader } from './AnalyticsViewHeader';
import { ActivityHeatmapViewSkeleton } from './AnalyticsViewSkeletons';
import { ViewLoader } from './ViewLoader';

// Fonction pour calculer l'opacité en fonction du count - retourne un style inline
function getActivityStyle(count: number, maxActivity: number): React.CSSProperties {
  if (count === 0) return { backgroundColor: 'rgba(100, 116, 139, 0.2)' }; // slate-500/20

  // Normaliser par rapport au max (entre 30% et 100%)
  const ratio = count / maxActivity;
  const baseColor = { r: 16, g: 185, b: 129 }; // emerald-500

  let opacity = 0.3;
  if (ratio > 0.1) opacity = 0.45;
  if (ratio > 0.25) opacity = 0.6;
  if (ratio > 0.5) opacity = 0.8;
  if (ratio > 0.75) opacity = 1;

  return { backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${opacity})` };
}

// Couleurs pour la légende
const LEGEND_COLORS = [
  'rgba(100, 116, 139, 0.2)', // 0
  'rgba(16, 185, 129, 0.3)', // faible
  'rgba(16, 185, 129, 0.5)', // moyen
  'rgba(16, 185, 129, 0.75)', // fort
  'rgba(16, 185, 129, 1)', // max
];

const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

interface DayData {
  date: string;
  count: number;
  weekday: number;
  week: number;
}

interface MonthData {
  month: number;
  name: string;
  weeks: Array<Array<DayData | null>>;
}

interface ActivityHeatmapProps {
  onDayClick?: (date: string, count: number) => void;
  selectedYear?: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ onDayClick, selectedYear: externalYear }) => {
  const [data, setData] = useState<ActivityByDayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utiliser la prop externe si fournie, sinon année courante
  const selectedYear = externalYear ?? new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getActivityByDay(selectedYear);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Organiser les données par mois avec semaines en colonnes
  const monthsData = useMemo(() => {
    if (!data) return [];

    const months: MonthData[] = [];

    // Créer une map pour accès rapide aux données
    const dayMap = new Map<string, DayData>();
    data.days.forEach((day) => {
      dayMap.set(day.date, day);
    });

    // Pour chaque mois de l'année
    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(selectedYear, month, 1);
      const lastDay = new Date(selectedYear, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const firstDayOfWeek = firstDay.getDay(); // 0 = Dimanche

      // Calculer le nombre de semaines nécessaires
      const totalCells = firstDayOfWeek + daysInMonth;
      const numWeeks = Math.ceil(totalCells / 7);

      // Créer les semaines (colonnes)
      const weeks: Array<Array<DayData | null>> = [];

      for (let week = 0; week < numWeeks; week++) {
        const weekData: Array<DayData | null> = [];

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          const dayNumber = week * 7 + dayOfWeek - firstDayOfWeek + 1;

          if (dayNumber < 1 || dayNumber > daysInMonth) {
            weekData.push(null);
          } else {
            const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
            const existingData = dayMap.get(dateStr);

            if (existingData) {
              weekData.push(existingData);
            } else {
              // Créer une entrée vide pour ce jour
              weekData.push({
                date: dateStr,
                count: 0,
                weekday: dayOfWeek,
                week: week,
              });
            }
          }
        }

        weeks.push(weekData);
      }

      months.push({
        month,
        name: MONTH_LABELS[month],
        weeks,
      });
    }

    return months;
  }, [data, selectedYear]);

  const maxActivity = data?.stats.maxDailyActivity || 1;

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <AnalyticsViewHeader
        title="Calendrier d'activité"
        description={`Créations jour par jour${selectedYear ? ` — ${selectedYear}` : ''}.`}
        icon={<Calendar size={18} />}
      />
      <ViewLoader
        isLoading={isLoading}
        error={error}
        isEmpty={!data}
        icon={<Calendar />}
        title='Aucune donnée'
        emptyMessage="Pas de données d'activité pour cette année."
        loadingSkeleton={<ActivityHeatmapViewSkeleton />}>
        <div className='flex h-full w-full flex-1 flex-col gap-6 overflow-hidden bg-c1'>
          {/* Stats cards */}
          <div className='border-b-2 border-c3 pb-5 pt-5'>
          <div className='grid grid-cols-4 gap-4'>
            <div className='flex items-center gap-3 rounded-xl border-2 border-c3 bg-c2 p-4'>
              <TrendingUp size={16} className='shrink-0 text-c6' />
              <div>
                <p className='text-xs text-c4'>Total créations</p>
                <p className='font-medium text-c6'>{data?.stats.totalActivity}</p>
              </div>
            </div>

            <div className='flex items-center gap-3 rounded-xl border-2 border-c3 bg-c2 p-4'>
              <Activity size={16} className='shrink-0 text-c6' />
              <div>
                <p className='text-xs text-c4'>Jours actifs</p>
                <p className='font-medium text-c6'>{data?.stats.activeDays}</p>
              </div>
            </div>

            <div className='flex items-center gap-3 rounded-xl border-2 border-c3 bg-c2 p-4'>
              <Calendar size={16} className='shrink-0 text-c6' />
              <div>
                <p className='text-xs text-c4'>Max journalier</p>
                <p className='font-medium text-c6'>{data?.stats.maxDailyActivity}</p>
              </div>
            </div>

            <div className='flex items-center gap-3 rounded-xl border-2 border-c3 bg-c2 p-4'>
              <TrendingUp size={16} className='shrink-0 text-c6' />
              <div>
                <p className='text-xs text-c4'>Moyenne/jour actif</p>
                <p className='font-medium text-c6'>{data?.stats.avgDailyActivity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap par mois */}
        <div className='flex-1 overflow-auto pb-6'>
          <div className='grid grid-cols-4 gap-4'>
            {monthsData.map((monthData) => (
              <div key={monthData.month} className='flex flex-col rounded-xl border-2 border-c3 bg-c2 p-4'>
                {/* Nom du mois */}
                <h3 className='text-c5 text-sm font-medium mb-2.5 text-center'>{monthData.name}</h3>

                {/* Grille du mois - 7 lignes (jours) x 6 colonnes (semaines) */}
                <table className='border-collapse'>
                  <tbody>
                    {WEEKDAY_LABELS.map((label, dayIdx) => (
                      <tr key={label}>
                        {/* Label du jour */}
                        <td className='text-c4 text-[10px] pr-4 text-right w-4'>{label.charAt(0)}</td>
                        {/* Cellules des semaines */}
                        {Array.from({ length: 6 }).map((_, weekIdx) => {
                          const week = monthData.weeks[weekIdx];
                          const day = week?.[dayIdx] ?? null;
                          return (
                            <td key={weekIdx} className='p-[2px]'>
                              <Tooltip
                                isDisabled={!day}
                                content={
                                  day ? (
                                    <div className='p-4'>
                                      <p className='font-medium text-c6'>
                                        {new Date(day.date).toLocaleDateString('fr-FR', {
                                          weekday: 'long',
                                          day: 'numeric',
                                          month: 'long',
                                        })}
                                      </p>
                                      <p className='text-sm mt-4 text-c5'>{day.count === 0 ? 'Aucune création' : `${day.count} création${day.count > 1 ? 's' : ''}`}</p>
                                    </div>
                                  ) : null
                                }>
                                <div
                                  className={`w-1.5 h-1.5 rounded-sm flex items-center justify-center transition-all duration-150
                                  ${day && onDayClick ? 'cursor-pointer hover:ring-2 hover:ring-white/30' : ''}`}
                                  style={day ? getActivityStyle(day.count, maxActivity) : { backgroundColor: 'rgba(100, 116, 139, 0.1)' }}
                                  onClick={() => {
                                    if (day && onDayClick) {
                                      onDayClick(day.date, day.count);
                                    }
                                  }}>
                                  {day && day.count > 0 && <span className='text-c6 text-[9px] font-medium'>{day.count}</span>}
                                </div>
                              </Tooltip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Légende */}
          <div className='flex items-center justify-center gap-8 mt-5'>
            <span className='text-c4 text-xs'>Moins</span>
            {LEGEND_COLORS.map((color, idx) => (
              <div key={idx} className='w-1.5 h-1.5 rounded-md' style={{ backgroundColor: color }} />
            ))}
            <span className='text-c4 text-xs'>Plus</span>
          </div>
        </div>
        </div>
      </ViewLoader>
    </div>
  );
};

export default ActivityHeatmap;
