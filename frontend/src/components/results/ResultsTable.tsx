import { Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';

interface ResultsTableProps {
  results: any[];
  columns: ('position' | 'shooter' | 'division' | 'matchPercent' | 'matchPoints' | 'stagePercent' | 'stagePoints')[];
  showDqBadge?: boolean;
}

/** Shared results table — used by ResultsOverview for all tab views */
export default function ResultsTable({ results, columns, showDqBadge = true }: ResultsTableProps) {
  const { t } = useTranslation();

  return (
    <Table striped>
      <TableHead>
        <TableRow>
          {columns.includes('position') && <TableHeadCell>{t('results.position')}</TableHeadCell>}
          {columns.includes('shooter') && <TableHeadCell>{t('results.shooter')}</TableHeadCell>}
          {columns.includes('division') && <TableHeadCell>{t('results.division')}</TableHeadCell>}
          {columns.includes('matchPercent') && <TableHeadCell>{t('results.matchPercent')}</TableHeadCell>}
          {columns.includes('matchPoints') && <TableHeadCell>{t('results.points')}</TableHeadCell>}
          {columns.includes('stagePercent') && <TableHeadCell>{t('results.stagePercent')}</TableHeadCell>}
          {columns.includes('stagePoints') && <TableHeadCell>{t('results.points')}</TableHeadCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {results.map((r) => (
          <TableRow key={r.registration_id} className={r.is_dq ? 'bg-red-50' : ''}>
            {columns.includes('position') && <TableCell className="font-mono">{r.position}</TableCell>}
            {columns.includes('shooter') && (
              <TableCell className="font-medium dark:text-white whitespace-nowrap">
                {r.first_name} {r.last_name}
                {showDqBadge && r.is_dq && <Badge color="failure" className="ml-1">{t('scoring.dq')}</Badge>}
              </TableCell>
            )}
            {columns.includes('division') && <TableCell>{divisionLabel(r.division)}</TableCell>}
            {columns.includes('matchPercent') && <TableCell className="font-mono">{r.match_percent?.toFixed(2)}%</TableCell>}
            {columns.includes('matchPoints') && <TableCell className="font-mono font-bold">{r.match_points?.toFixed(2)}</TableCell>}
            {columns.includes('stagePercent') && <TableCell className="font-mono">{r.stage_percent?.toFixed(2)}%</TableCell>}
            {columns.includes('stagePoints') && <TableCell className="font-mono font-bold">{r.stage_points?.toFixed(2)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}