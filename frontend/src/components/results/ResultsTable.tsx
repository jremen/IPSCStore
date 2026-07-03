import { Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, Badge, Progress, theme } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import { ScoringProgressEntry } from "../../types/scoring";
import { twMerge } from "tailwind-merge";

const PROGRESS_THEME = { base: twMerge(theme.progress.base, "relative overflow-visible!") };

export type ColumnKey = 'position' | 'shooter' | 'division' | 'time' | 'alpha' | 'charlie' | 'delta' | 'miss' | 'noShootHits' | 'procedurals' | 'matchPercent' | 'matchPoints' | 'stagePercent' | 'stagePoints' | 'hitFactor' | 'netPoints';

interface ResultsTableProps {
  results: any[];
  scored?: {scored: ScoringProgressEntry[] | undefined, stagesLength: number};
  columns: ColumnKey[];
  showDqBadge?: boolean;
  onShooterClick?: (registrationId: string) => void;
}

const DETAIL_COLUMNS: ColumnKey[] = ['division', 'time', 'alpha', 'charlie', 'delta', 'miss', 'noShootHits', 'procedurals', 'matchPercent', 'matchPoints', 'stagePercent', 'stagePoints', 'hitFactor', 'netPoints'];

function columnHeader(col: ColumnKey, t: (key: string, opts?: any) => string): string {
  const map: Record<ColumnKey, string> = {
    position: t('results.position'),
    shooter: t('results.shooter'),
    division: t('results.division'),
    time: t('results.time', { defaultValue: 'Time' }),
    alpha: t('results.alpha'),
    charlie: t('results.charlie'),
    delta: t('results.delta'),
    miss: t('results.miss'),
    noShootHits: t('results.noShootHits'),
    procedurals: t('results.proceduralsHeader'),
    matchPercent: t('results.matchPercent'),
    matchPoints: t('results.points'),
    stagePercent: t('results.stagePercent'),
    stagePoints: t('results.points'),
    hitFactor: 'HF',
    netPoints: t('results.netPoints'),
  };
  return map[col];
}

function cellValue(col: ColumnKey, r: any): string {
  switch (col) {
    case 'position': return String(r.position);
    case 'shooter': return `${r.first_name} ${r.last_name}`;
    case 'division': return divisionLabel(r.division);
    case 'time': return r.time != null ? Number(r.time).toFixed(2) : '—';
    case 'alpha': return String(r.alpha ?? 0);
    case 'charlie': return String(r.charlie ?? 0);
    case 'delta': return String(r.delta ?? 0);
    case 'miss': return String(r.miss ?? 0);
    case 'noShootHits': return String(r.no_shoot ?? 0);
    case 'procedurals': return String(r.procedurals ?? 0);
    case 'matchPercent': return `${r.match_percent?.toFixed(2)}%`;
    case 'matchPoints': return r.match_points?.toFixed(2);
    case 'stagePercent': return `${r.stage_percent?.toFixed(2)}%`;
    case 'stagePoints': return r.stage_points?.toFixed(2);
    case 'hitFactor': return r.hit_factor?.toFixed(4);
    case 'netPoints': return r.net_points?.toFixed(2);
  }
}

function isBoldColumn(col: ColumnKey): boolean {
  return col === 'matchPoints' || col === 'stagePoints';
}

function cellClassName(col: ColumnKey): string {
  const base = col !== 'shooter' && col !== 'division' ? 'font-mono' : '';
  const bold = isBoldColumn(col) ? 'font-bold' : '';
  const shooter = col === 'shooter' ? 'font-medium dark:text-white whitespace-nowrap' : '';
  return [base, bold, shooter].filter(Boolean).join(' ');
}

/** Shared results table — responsive: desktop table, mobile card layout */
export default function ResultsTable({ results, scored, columns, showDqBadge = true, onShooterClick }: ResultsTableProps) {
  const { t } = useTranslation();
  const detailColumns = columns.filter(c => DETAIL_COLUMNS.includes(c));

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block md:overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableHeadCell key={col}>{columnHeader(col, t)}</TableHeadCell>
              ))}
              {scored && <TableHeadCell>{t('results.progress')}</TableHeadCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((r) => {
              const progress = scored?.stagesLength && scored?.scored ? scored?.scored?.filter(shooter => shooter.registration_id === r.registration_id).length / scored?.stagesLength * 100 : 0;
              const progressText = scored?.stagesLength && scored?.scored ? `${scored?.scored?.filter(shooter => shooter.registration_id === r.registration_id).length} / ${scored?.stagesLength}` : "";
              return <TableRow key={r.registration_id} className={r.is_dq ? 'bg-red-50' : ''}>
                {columns.map(col => (
                  <TableCell key={col} className={cellClassName(col)}>
                    {col === 'shooter' && showDqBadge && r.is_dq ? (
                      <span className="flex items-center gap-1">
                        {onShooterClick ? (
                          <button onClick={() => onShooterClick(r.registration_id)} className="text-blue-600 eink:border-none! dark:text-blue-400 hover:underline font-medium whitespace-nowrap">
                            {cellValue(col, r)}
                          </button>
                        ) : cellValue(col, r)}
                        <Badge color="failure" className="ml-1">{t('scoring.dq')}</Badge>
                      </span>
                    ) : col === 'shooter' && onShooterClick ? (
                      <button onClick={() => onShooterClick(r.registration_id)} className="text-blue-600 eink:border-none! dark:text-blue-400 hover:underline font-medium whitespace-nowrap">
                        {cellValue(col, r)}
                      </button>
                    ) : cellValue(col, r)}
                  </TableCell>
                ))}
                {scored && <TableCell>
                  <Progress theme={PROGRESS_THEME} className="[&_span]:absolute [&_span]:-top-4 [&_span]:text-xs [&_span]:left-1/2 [&_span]:-translate-x-1/2" progress={progress} textLabel={progressText} labelText />
                </TableCell>}
              </TableRow>
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards: placement + name on top, compact stats below */}
      <div className="md:hidden divide-y dark:divide-gray-700">
        {results.map((r) => {
          const compactStats = detailColumns.filter(col => {
            if (col === 'division') return false;
            const val = cellValue(col, r);
            return val !== '0' && val !== '0.00' && val !== '0.00%' && val !== '—' && val !== '−0';
          });
          return (
            <div key={r.registration_id} className={`px-3 py-2.5 ${r.is_dq ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                {columns.includes('position') && (
                  <span className="font-mono w-12 font-bold text-lg dark:text-white">{r.position}</span>
                )}
                {columns.includes('shooter') && (
                  <span className="font-medium dark:text-white text-lg">
                    {onShooterClick ? (
                      <button onClick={() => onShooterClick(r.registration_id)} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {r.first_name} {r.last_name}
                      </button>
                    ) : `${r.first_name} ${r.last_name}`}
                    {showDqBadge && r.is_dq && <Badge color="failure" className="ml-1">{t('scoring.dq')}</Badge>}
                  </span>
                )}
              </div>
              {compactStats.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {compactStats.map(col => (
                    <span key={col}>
                      <span className="text-gray-500 dark:text-gray-300">{columnHeader(col, t)}</span>{' '}
                      <span className={`font-mono ${isBoldColumn(col) ? 'font-bold' : ''} dark:text-white`}>
                        {cellValue(col, r)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
