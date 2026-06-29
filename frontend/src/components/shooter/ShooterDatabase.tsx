import { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, TextInput, ToggleSwitch, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../../stores/shooterStore';
import { useUIStore } from '../../stores/uiStore';
import { useSelection } from '../../hooks/useSelection';
import { divisionLabel } from '../../utils/constants';
import { useConstLabels } from '../../hooks/useConstLabels';
import CSVImportExport from '../shared/CSVImportExport';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import ShooterFormModal from './ShooterFormModal';
import DeleteShooterModal from './DeleteShooterModal';
import BulkDeleteShootersModal from './BulkDeleteShootersModal';
import BulkEditShootersModal from './BulkEditShootersModal';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function ShooterDatabase() {
  const shooters = useShooterStore((s) => s.shooters);
  const total = useShooterStore((s) => s.total);
  const loading = useShooterStore((s) => s.loading);
  const showDeleted = useShooterStore((s) => s.showDeleted);
  const fetchShooters = useShooterStore((s) => s.fetchShooters);
  const restoreShooter = useShooterStore((s) => s.restoreShooter);
  const toggleShowDeleted = useShooterStore((s) => s.toggleShowDeleted);
  const addToast = useUIStore((s) => s.addToast);
  const { categoryLabel, powerFactorLabel } = useConstLabels();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editShooter, setEditShooter] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [shooterToDelete, setShooterToDelete] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const shooterIds = shooters.map((s) => s.id);
  const selection = useSelection(shooterIds);

  useEffect(() => { fetchShooters(); }, [fetchShooters]);

  useTabMenuAction('new-shooter', () => setShowCreate(true));
  useTabMenuAction('toggle-show-deleted', () => toggleShowDeleted());
  useTabMenuAction('focus-search', () => searchRef.current?.focus());

  const handleSearch = useCallback(() => {
    fetchShooters({ search });
  }, [search, fetchShooters]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [search, handleSearch]);

  const handleDeleteClick = (s: any) => {
    setShooterToDelete({ id: s.id, first_name: s.first_name, last_name: s.last_name });
  };

  const handleDeleted = () => {
    setShooterToDelete(null);
    fetchShooters({ search });
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreShooter(id);
      addToast(t('shooters.restored'), 'success');
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
      <div className="sticky top-4 pb-4 before:bg-gray-200 dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('shooters.title')} ({total})</h2>
          <div className="flex gap-2">
            <CSVImportExport type="shooters" onImportComplete={fetchShooters} />
            <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('shooters.newShooter')}</Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-2">
          <TextInput ref={searchRef} placeholder={t('shooters.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
          <ToggleSwitch
            checked={showDeleted}
            onChange={toggleShowDeleted}
            label={t('shooters.showDeleted')}
          />
        </div>

        <BulkActionToolbar
          selectedCount={selection.selectedCount}
          onEdit={() => setShowBulkEdit(true)}
          onDelete={() => setShowBulkDelete(true)}
          onClearSelection={selection.clearSelection}
        />
      </div>


      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {shooters.map((s) => {
              const isDeleted = !!s.deleted_at;
              return (
                <TableRow
                  key={s.id}
                  className={`${selection.isSelected(s.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isDeleted ? 'opacity-60' : ''}`}
                >
                  <TableCell>
                    <Checkbox checked={selection.isSelected(s.id)} onChange={() => selection.toggle(s.id)} />
                  </TableCell>
                  <TableCell className={`font-medium dark:text-white ${isDeleted ? 'line-through' : ''}`}>
                    {s.first_name} {s.last_name}
                    {isDeleted && (
                      <Badge color="gray" className="inline ml-2 text-xs">{t('shooters.deletedBadge')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{categoryLabel(s.category)}</TableCell>
                  <TableCell>{divisionLabel(s.division)}</TableCell>
                  <TableCell>{powerFactorLabel(s.power_factor)}</TableCell>
                  <TableCell>{s.region}</TableCell>
                  <TableCell>{s.tag || '—'}</TableCell>
                  <TableCell>
                    {isDeleted ? (
                      <Button size="xs" color="green" onClick={() => handleRestore(s.id)}>{t('shooters.restore')}</Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="xs" color="blue" onClick={() => setEditShooter(s)}>{t('common.edit')}</Button>
                        <Button size="xs" color="red" onClick={() => handleDeleteClick(s)}>{t('common.delete')}</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!loading && shooters.length === 0 && (
        <p className="text-center text-gray-500 mt-8">{t('shooters.empty')}</p>
      )}

      <ShooterFormModal show={showCreate || !!editShooter} onClose={handleCloseModal} editShooter={editShooter} />
      <DeleteShooterModal
        show={!!shooterToDelete}
        onClose={() => setShooterToDelete(null)}
        shooter={shooterToDelete}
        onDeleted={handleDeleted}
      />
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
        onSaved={handleBulkEdited}
      />
    </div>
  );
}