import { useEffect, useState, useCallback } from 'react';
import { Button, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, TextInput } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../../stores/shooterStore';
import { useUIStore } from '../../stores/uiStore';
import { divisionLabel, categoryLabel, powerFactorLabel } from '../../utils/constants';
import CSVImportExport from '../shared/CSVImportExport';
import ShooterFormModal from './ShooterFormModal';

export default function ShooterDatabase() {
  const { shooters, total, loading, fetchShooters, deleteShooter } = useShooterStore();
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editShooter, setEditShooter] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchShooters(); }, [fetchShooters]);

  const handleSearch = useCallback(() => {
    fetchShooters({ search, limit: 100 });
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

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold dark:text-white">{t('shooters.title')} ({total})</h2>
        <div className="flex gap-2">
          <CSVImportExport type="shooters" />
          <Button size="sm" color="blue" onClick={() => setShowCreate(true)}>{t('shooters.newShooter')}</Button>
        </div>
      </div>

      <TextInput placeholder={t('shooters.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
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
              <TableRow key={s.id}>
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
    </div>
  );
}