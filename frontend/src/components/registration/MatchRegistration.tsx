import { useEffect, useState } from 'react';
import { Button, Badge, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useSelection } from '../../hooks/useSelection';
import { api } from '../../services/api';
import { divisionLabel, categoryLabel, powerFactorLabel } from '../../utils/constants';
import CSVImportExport from '../shared/CSVImportExport';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import AddShooterModal from './AddShooterModal';
import CreateShooterModal from './CreateShooterModal';
import EditRegistrationModal from './EditRegistrationModal';
import BulkEditRegistrationsModal from './BulkEditRegistrationsModal';
import BulkRemoveRegistrationsModal from './BulkRemoveRegistrationsModal';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function MatchRegistration() {
  const { activeMatchId, addToast } = useUIStore();
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [editReg, setEditReg] = useState<any>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkRemove, setShowBulkRemove] = useState(false);

  const regIds = registrations.map((r) => r.id);
  const selection = useSelection(regIds);

  useEffect(() => {
    if (activeMatchId) loadRegistrations();
  }, [activeMatchId]);

  useTabMenuAction('add-registration', () => {
    if (activeMatchId) setShowAdd(true);
  });
  useTabMenuAction('new-registration-shooter', () => {
    if (activeMatchId) setShowInlineCreate(true);
  });

  const loadRegistrations = async () => {
    if (!activeMatchId) return;
    const regs = await api.getRegistrations(activeMatchId);
    setRegistrations(regs);
  };

  const handleRemove = async (regId: string) => {
    if (!activeMatchId) return;
    await api.removeRegistration(activeMatchId, regId);
    addToast(t('registration.removed'), 'success');
    loadRegistrations();
  };

  const handleBulkAction = () => {
    selection.clearSelection();
    loadRegistrations();
  };

  if (!activeMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('registration.noMatch')}</p>;
  }

  const selectedNames = selection.selectedArray
    .map((id) => { const r = registrations.find((reg) => reg.id === id); return r ? `${r.first_name} ${r.last_name}` : id; });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="sticky top-4 before:bg-gray-200 pb-4 dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('registration.title')} ({registrations.length})</h2>
          <div className="flex gap-2">
            <CSVImportExport type="registrations" matchId={activeMatchId} onImportComplete={loadRegistrations} />
            <Button size="sm" color="green" onClick={() => setShowInlineCreate(true)}>{t('shooters.newShooter')}</Button>
            <Button size="sm" color="blue" onClick={() => setShowAdd(true)}>{t('registration.addShooter')}</Button>
          </div>
        </div>

        <BulkActionToolbar
          selectedCount={selection.selectedCount}
          onEdit={() => setShowBulkEdit(true)}
          onDelete={() => setShowBulkRemove(true)}
          onClearSelection={selection.clearSelection}
          editLabel={t('bulkActions.editSelected')}
          deleteLabel={t('bulkActions.removeSelected')}
        />
      </div>

      {registrations.length > 0 ? (
        <div className="overflow-x-auto rounded-lg">
          <Table striped theme={{root: {shadow: "hidden"}}}>
            <TableHead>
              <TableRow>
                <TableHeadCell className="w-10">
                  <SelectAllCheckbox
                    allSelected={selection.allSelected}
                    someSelected={selection.someSelected}
                    onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                    selectedCount={selection.selectedCount}
                    totalCount={registrations.length}
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
                  <TableCell className="font-mono">{r.squad || '—'}</TableCell>
                  <TableCell>
                    {r.is_dq ? (
                      <Badge color="failure" size="sm">{t('registration.dq')}</Badge>
                    ) : (
                      <Badge color="success" size="sm">{t('registration.active')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="xs" color="blue" onClick={() => setEditReg(r)}>{t('common.edit')}</Button>
                      <Button size="xs" color="red" onClick={() => handleRemove(r.id)}>{t('common.remove')}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center text-gray-500 mt-8">{t('registration.empty')}</p>
      )}

      <AddShooterModal show={showAdd} onClose={() => setShowAdd(false)} onCreate={() => setShowInlineCreate(true)} matchId={activeMatchId} registeredShooterIds={registrations.map((r) => r.shooter_id)} onAdded={loadRegistrations} />
      <CreateShooterModal show={showInlineCreate} onClose={() => setShowInlineCreate(false)} matchId={activeMatchId} onCreated={loadRegistrations} />
      <EditRegistrationModal show={!!editReg} onClose={() => setEditReg(null)} registration={editReg} matchId={activeMatchId} onSaved={loadRegistrations} />
      <BulkEditRegistrationsModal
        show={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        selectedIds={selection.selectedArray}
        selectedNames={selectedNames}
        matchId={activeMatchId}
        onSaved={handleBulkAction}
      />
      <BulkRemoveRegistrationsModal
        show={showBulkRemove}
        onClose={() => setShowBulkRemove(false)}
        registrationIds={selection.selectedArray}
        registrationNames={selectedNames}
        matchId={activeMatchId}
        onRemoved={handleBulkAction}
      />
    </div>
  );
}
