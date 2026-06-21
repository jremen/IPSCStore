import { Badge, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useConstLabels } from '../../hooks/useConstLabels';
import { divisionLabel } from '../../utils/constants';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import type { useSelection } from '../../hooks/useSelection';

interface RegistrationTableProps {
  registrations: any[];
  totalCount: number;
  selection: ReturnType<typeof useSelection<string>>;
  onEdit: (r: any) => void;
  onRemove: (regId: string) => void;
}

export default function RegistrationTable({ registrations, totalCount, selection, onEdit, onRemove }: RegistrationTableProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();

  if (registrations.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg">
      <Table striped theme={{ root: { shadow: 'hidden' } }}>
        <TableHead>
          <TableRow>
            <TableHeadCell className="w-10">
              <SelectAllCheckbox
                allSelected={selection.allSelected}
                someSelected={selection.someSelected}
                onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                selectedCount={selection.selectedCount}
                totalCount={totalCount}
              />
            </TableHeadCell>
            <TableHeadCell>#</TableHeadCell>
            <TableHeadCell>{t('common.name')}</TableHeadCell>
            <TableHeadCell>{t('shooters.division')}</TableHeadCell>
            <TableHeadCell>{t('shooters.category')}</TableHeadCell>
            <TableHeadCell>PF</TableHeadCell>
            <TableHeadCell>{t('registration.squad')}</TableHeadCell>
            <TableHeadCell />
            <TableHeadCell>{t('common.actions')}</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {registrations.map((r, idx) => (
            <TableRow key={r.id} className={r.is_dq ? 'bg-red-50 dark:bg-red-900/20' : selection.isSelected(r.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
              <TableCell>
                <Checkbox checked={selection.isSelected(r.id)} onChange={() => selection.toggle(r.id)} />
              </TableCell>
              <TableCell className="font-mono text-gray-500">{idx + 1}</TableCell>
              <TableCell className="font-medium dark:text-white whitespace-nowrap">
                {r.first_name} {r.last_name}
              </TableCell>
              <TableCell>
                <Badge color="blue" size="sm">{divisionLabel(r.effective_division)}</Badge>
              </TableCell>
              <TableCell>
                <Badge color="gray" size="sm">{categoryLabel(r.effective_category)}</Badge>
              </TableCell>
              <TableCell>
                <Badge color={r.effective_power_factor === 'major' ? 'warning' : 'success'} size="sm">{powerFactorLabel(r.effective_power_factor)}</Badge>
              </TableCell>
              <TableCell className="font-mono">{r.squad === null || r.squad === undefined ? '—' : Number(r.squad)}</TableCell>
              <TableCell>
                {r.is_dq ? (
                  <Badge color="failure" size="sm">{t('registration.dq')}</Badge>
                ) : (
                  <Badge color="success" size="sm">{t('registration.active')}</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="xs" color="blue" onClick={() => onEdit(r)}>{t('common.edit')}</Button>
                  <Button size="xs" color="red" onClick={() => onRemove(r.id)}>{t('common.remove')}</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
