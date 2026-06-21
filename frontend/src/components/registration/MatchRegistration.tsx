import { useEffect, useState } from 'react';
import { Button, TextInput, Select, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useSelection } from '../../hooks/useSelection';
import { useRegistrationFilter } from '../../hooks/useRegistrationFilter';
import { api } from '../../services/api';
import { CATEGORIES, getDivisionsForMatch } from '../../utils/constants';
import CSVImportExport from '../shared/CSVImportExport';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import RegistrationTable from './RegistrationTable';
import AddShooterModal from './AddShooterModal';
import CreateShooterModal from './CreateShooterModal';
import EditRegistrationModal from './EditRegistrationModal';
import BulkEditRegistrationsModal from './BulkEditRegistrationsModal';
import BulkRemoveRegistrationsModal from './BulkRemoveRegistrationsModal';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function MatchRegistration() {
  const { activeMatchId, addToast } = useUIStore();
  const { t } = useTranslation();
  const { matches } = useMatchStore();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [editReg, setEditReg] = useState<any>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkRemove, setShowBulkRemove] = useState(false);

  const match = matches.find((m: any) => m.id === activeMatchId);
  const divisions = getDivisionsForMatch(match);

  const { search, setSearch, divisionFilter, setDivisionFilter, categoryFilter, setCategoryFilter, filtered, hasActiveFilters, clearFilters } = useRegistrationFilter(registrations);

  const filteredIds = filtered.map((r) => r.id);
  const selection = useSelection(filteredIds);

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
    .map((id) => {
      const r = registrations.find((reg) => reg.id === id);
      return r ? `${r.first_name} ${r.last_name}` : id;
    });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="sticky top-4 before:bg-gray-200 pb-4 dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">
            {t('registration.title')} ({registrations.length})
            {hasActiveFilters && filtered.length !== registrations.length && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                {t('registration.showingOf', { shown: filtered.length, total: registrations.length })}
              </span>
            )}
          </h2>
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

      {registrations.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="reg-search">{t('common.name')}</Label>
            <TextInput
              id="reg-search"
              placeholder={t('registration.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <Label htmlFor="reg-div">{t('shooters.division')}</Label>
            <Select
              id="reg-div"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
            >
              <option value="">{t('registration.allDivisions')}</option>
              {divisions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>
          </div>
          <div className="min-w-[180px]">
            <Label htmlFor="reg-cat">{t('shooters.category')}</Label>
            <Select
              id="reg-cat"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">{t('registration.allCategories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{t(c.i18nKey)}</option>
              ))}
            </Select>
          </div>
          {hasActiveFilters && (
            <Button size="sm" color="gray" onClick={clearFilters}>{t('registration.clearFilters')}</Button>
          )}
        </div>
      )}

      {registrations.length > 0 ? (
        filtered.length > 0 ? (
          <RegistrationTable
            registrations={filtered}
            totalCount={filteredIds.length}
            selection={selection}
            onEdit={setEditReg}
            onRemove={handleRemove}
          />
        ) : (
          <p className="text-center text-gray-500 mt-8">{t('registration.searchEmpty')}</p>
        )
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
