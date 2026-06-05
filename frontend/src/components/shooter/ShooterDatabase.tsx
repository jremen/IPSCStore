import { useEffect, useState, useCallback } from 'react';
import { Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, TextInput } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../../stores/shooterStore';
import { useUIStore } from '../../stores/uiStore';
import { useSelection } from '../../hooks/useSelection';
import { divisionLabel, categoryLabel, powerFactorLabel } from '../../utils/constants';
import CSVImportExport from '../shared/CSVImportExport';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import ShooterFormModal from './ShooterFormModal';
import BulkDeleteShootersModal from './BulkDeleteShootersModal';
import BulkEditShootersModal from './BulkEditShootersModal';

export default function ShooterDatabase() {
  const { shooters, total, loading, fetchShooters, deleteShooter } = useShooterStore();
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editShooter, setEditShooter] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const shooterIds = shooters.map((s) => s.id);
  const selection = useSelection(shooterIds);

  useEffect(() => { fetchShooters(); }, [fetchShooters]);

  const handleSearch = useCallback(() => {
    fetchShooters({ search });
  }, [search, fetchShooters]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [search, handleSearch]);

  const handleDelete = async (id: string) => {
    try {
      await deleteShooter(id);
      addToast(t('shooters.deleted'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCloseModal = () => {
    setShowCreate(false);
    setEditShooter(null);
  };

  const handleBulkDeleted = () => {
    selection.clearSelection();
    fetchShooters({ search });
  };

  const handleBulkEdited = () => {
    selection.clearSelection();
    fetchShooters({ search });
  };

  const selectedNames = selection.selectedArray
    .map((id) => { const s = shooters.find((sh) => sh.id === id); return s ? `${s.first_name} ${s.last_name}` : id; });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold dark:text-white">{t('shooters.title')} ({total})</h2>
        <div className="flex gap-2">
          <CSVImportExport type="shooters" />
          <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('shooters.newShooter')}</Button>
        </div>
      </div>

      <TextInput placeholder={t('shooters.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />

      <BulkActionToolbar
        selectedCount={selection.selectedCount}
        onEdit={() => setShowBulkEdit(true)}
        onDelete={() => setShowBulkDelete(true)}
        onClearSelection={selection.clearSelection}
      />

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableHeadCell className="w-10">
              <SelectAllCheckbox
                allSelected={selection.allSelected}
                someSelected={selection.someSelected}
                onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                selectedCount={selection.selectedCount}
                totalCount={shooters.length}
              />
            </TableHeadCell>
            <TableHeadCell>{t('common.name')}</TableHeadCell>
            <TableHeadCell>{t('shooters.category')}</TableHeadCell>
            <TableHeadCell>{t('shooters.division')}</TableHeadCell>
            <TableHeadCell>PF</TableHeadCell>
            <TableHeadCell>{t('shooters.region')}</TableHeadCell>
            <TableHeadCell>{t('shooters.tag')}</TableHeadCell>
            <TableHeadCell>{t('common.actions')}</TableHeadCell>
          </TableHead>
          <TableBody>
            {shooters.map((s) => (
              <TableRow key={s.id} className={selection.isSelected(s.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                <TableCell>
                  <Checkbox checked={selection.isSelected(s.id)} onChange={() => selection.toggle(s.id)} />
                </TableCell>
                <TableCell className="font-medium dark:text-white">{s.first_name} {s.last_name}</TableCell>
                <TableCell>{categoryLabel(s.category)}</TableCell>
                <TableCell>{divisionLabel(s.division)}</TableCell>
                <TableCell>{powerFactorLabel(s.power_factor)}</TableCell>
                <TableCell>{s.region}</TableCell>
                <TableCell>{s.tag || '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="xs" color="light" onClick={() => setEditShooter(s)}>{t('common.edit')}</Button>
                    <Button size="xs" color="red" onClick={() => handleDelete(s.id)}>{t('common.delete')}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!loading && shooters.length === 0 && (
        <p className="text-center text-gray-500 mt-8">{t('shooters.empty')}</p>
      )}

      <ShooterFormModal show={showCreate || !!editShooter} onClose={handleCloseModal} editShooter={editShooter} />
      <BulkDeleteShootersModal
        show={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        shooterIds={selection.selectedArray}
        shooterNames={selectedNames}
        onDeleted={handleBulkDeleted}
      />
      <BulkEditShootersModal
        show={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        selectedIds={selection.selectedArray}
        selectedNames={selectedNames}
        onSaved={handleBulkEdited}
      />
    </div>
  );
}