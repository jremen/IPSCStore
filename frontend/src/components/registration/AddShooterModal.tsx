import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Label, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../../stores/shooterStore';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { divisionLabel, categoryLabel } from '../../utils/constants';

interface AddShooterModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  onAdded: () => void;
}

export default function AddShooterModal({ show, onClose, matchId, onAdded }: AddShooterModalProps) {
  const { shooters, fetchShooters } = useShooterStore();
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [squad, setSquad] = useState('');

  useEffect(() => {
    if (show) fetchShooters({ limit: 200 });
  }, [show, fetchShooters]);

  const handleAdd = async (shooterId: string) => {
    try {
      await api.registerShooters(matchId, { shooterId, squad: squad ? parseInt(squad) : undefined });
      addToast(t('registration.registered'), 'success');
      onAdded();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const filteredShooters = shooters.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>{t('registration.addTitle')}</ModalHeader>
      <ModalBody>
        <div className="mb-3">
          <Label>{t('registration.squadOptional')}</Label>
          <TextInput type="number" value={squad} onChange={(e) => setSquad(e.target.value)} placeholder={t('registration.squadPlaceholder')} />
        </div>
        <TextInput placeholder={t('registration.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredShooters.slice(0, 30).map((s) => (
            <button key={s.id} onClick={() => { handleAdd(s.id); }} className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
              <span className="dark:text-white">{s.first_name} {s.last_name}</span>
              <div className="flex gap-1">
                <Badge size="sm" color="blue">{divisionLabel(s.division)}</Badge>
                <Badge size="sm" color="gray">{s.region}</Badge>
              </div>
            </button>
          ))}
          {filteredShooters.length === 0 && <p className="text-gray-500 text-sm text-center py-2">{t('registration.searchEmpty')}</p>}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.close')}</Button>
      </ModalFooter>
    </Modal>
  );
}