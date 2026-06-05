import { useEffect, useState } from 'react';
import { Button, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { divisionLabel, categoryLabel, powerFactorLabel } from '../../utils/constants';
import CSVImportExport from '../shared/CSVImportExport';
import AddShooterModal from './AddShooterModal';
import CreateShooterModal from './CreateShooterModal';
import EditRegistrationModal from './EditRegistrationModal';

export default function MatchRegistration() {
  const { activeMatchId, addToast } = useUIStore();
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [editReg, setEditReg] = useState<any>(null);

  useEffect(() => {
    if (activeMatchId) loadRegistrations();
  }, [activeMatchId]);

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

  if (!activeMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('registration.noMatch')}</p>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold dark:text-white">{t('registration.title')} ({registrations.length})</h2>
        <div className="flex gap-2">
          <CSVImportExport type="registrations" matchId={activeMatchId} />
          <Button size="sm" color="blue" onClick={() => setShowAdd(true)}>{t('registration.addShooter')}</Button>
          <Button size="sm" color="light" onClick={() => setShowInlineCreate(true)}>{t('registration.createNew')}</Button>
        </div>
      </div>

      {registrations.length > 0 ? (
        <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
          <Table striped theme={{root: {shadow: "hidden"}}}>
            <TableHead>
              <TableHeadCell>#</TableHeadCell>
              <TableHeadCell>{t('common.name')}</TableHeadCell>
              <TableHeadCell>{t('registration.division')}</TableHeadCell>
              <TableHeadCell>{t('shooters.category')}</TableHeadCell>
              <TableHeadCell>PF</TableHeadCell>
              <TableHeadCell>{t('registration.squad')}</TableHeadCell>
              <TableHeadCell>{t('common.name')}</TableHeadCell>
              <TableHeadCell>{t('common.actions')}</TableHeadCell>
            </TableHead>
            <TableBody>
              {registrations.map((r, idx) => (
                <TableRow key={r.id} className={r.is_dq ? 'bg-red-50 dark:bg-red-900/20' : ''}>
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

      <AddShooterModal show={showAdd} onClose={() => setShowAdd(false)} matchId={activeMatchId} onAdded={loadRegistrations} />
      <CreateShooterModal show={showInlineCreate} onClose={() => setShowInlineCreate(false)} matchId={activeMatchId} onCreated={loadRegistrations} />
      <EditRegistrationModal show={!!editReg} onClose={() => setEditReg(null)} registration={editReg} matchId={activeMatchId} onSaved={loadRegistrations} />
    </div>
  );
}