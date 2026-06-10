import { Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';

type ColumnKey = 'position' | 'shooter' | 'division' | 'matchPercent' | 'matchPoints' | 'stagePercent' | 'stagePoints' | 'hitFactor' | 'netPoints' | 'time';

interface ResultsTableProps {
  results: any[];
  columns: ColumnKey[];
  showDqBadge?: boolean;
}

const DETAIL_COLUMNS: ColumnKey[] = ['division', 'matchPercent', 'matchPoints', 'stagePercent', 'stagePoints', 'hitFactor', 'netPoints', 'time'];

function columnHeader(col: ColumnKey, t: (key: string, opts?: any) => string): string {
  const map: Record<ColumnKey, string> = {
    position: t('results.position'),
    shooter: t('results.shooter'),
    division: t('results.division'),
    matchPercent: t('results.matchPercent'),
    matchPoints: t('results.points'),
    stagePercent: t('results.stagePercent'),
    stagePoints: t('results.points'),
    hitFactor: 'HF',
    netPoints: t('results.netPoints'),
    time: t('results.time', { defaultValue: 'Time' }),
  };
  return map[col];
}

function cellValue(col: ColumnKey, r: any): string {
  switch (col) {
    case 'position': return String(r.position);
    case 'shooter': return `${r.first_name} ${r.last_name}`;
    case 'division': return divisionLabel(r.division);
    case 'matchPercent': return `${r.match_percent?.toFixed(2)}%`;
    case 'matchPoints': return r.match_points?.toFixed(2);
    case 'stagePercent': return `${r.stage_percent?.toFixed(2)}%`;
    case 'stagePoints': return r.stage_points?.toFixed(2);
    case 'hitFactor': return r.hit_factor?.toFixed(4);
    case 'netPoints': return r.net_points?.toFixed(2);
    case 'time': return r.time != null ? r.time.toFixed(2) : '—';
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
export default function ResultsTable({ results, columns, showDqBadge = true }: ResultsTableProps) {
  const { t } = useTranslation();
  const detailColumns = columns.filter(c => DETAIL_COLUMNS.includes(c));

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableHeadCell key={col}>{columnHeader(col, t)}</TableHeadCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.registration_id} className={r.is_dq ? 'bg-red-50' : ''}>
                {columns.map(col => (
                  <TableCell key={col} className={cellClassName(col)}>
                    {col === 'shooter' && showDqBadge && r.is_dq ? (
                      <span className="flex items-center gap-1">
                        {cellValue(col, r)}
                        <Badge color="failure" className="ml-1">{t('scoring.dq')}</Badge>
                      </span>
                    ) : cellValue(col, r)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards: placement + name on top, stats below */}
      <div className="md:hidden divide-y dark:divide-gray-700">
        {results.map((r) => (
          <div key={r.registration_id} className={`px-3 py-2.5 ${r.is_dq ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
            <div className="flex items-center gap-2 flex-wrap">
              {columns.includes('position') && (
                <span className="font-mono w-12 font-bold text-lg dark:text-white">{r.position}</span>
              )}
              {columns.includes('shooter') && (
                <span className="font-medium dark:text-white text-lg">
                  {r.first_name} {r.last_name}
                  {showDqBadge && r.is_dq && <Badge color="failure" className="ml-1">{t('scoring.dq')}</Badge>}
                </span>
              )}
            </div>
            {detailColumns.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {detailColumns.map(col => (
                  <span key={col} className="pl-14">
                    <span className="text-gray-500 dark:text-gray-300">{columnHeader(col, t)}</span>{' '}
                    <span className={`font-mono ${isBoldColumn(col) ? 'font-bold' : ''} dark:text-white`}>
                      {cellValue(col, r)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
