import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Label, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../../stores/shooterStore';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { divisionLabel } from '../../utils/constants';

interface AddShooterModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  /** IDs of shooters already registered in this match — they will be hidden from the list */
  registeredShooterIds: string[];
  onAdded: () => void;
}

export default function AddShooterModal({ show, onClose, matchId, registeredShooterIds, onAdded }: AddShooterModalProps) {
  const { shooters, fetchShooters } = useShooterStore();
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [squad, setSquad] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (show) {
      fetchShooters({ limit: 200 });
      setAddedIds(new Set());
    }
  }, [show, fetchShooters]);

  const handleAdd = async (shooterId: string) => {
    try {
      await api.registerShooters(matchId, { shooterId, squad: squad ? parseInt(squad) : undefined });
      addToast(t('registration.registered'), 'success');
      setAddedIds((prev) => new Set(prev).add(shooterId));
      onAdded();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const excludedIds = new Set([...registeredShooterIds, ...addedIds]);

  const filteredShooters = shooters.filter((s) =>
    !excludedIds.has(s.id) &&
    (`${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()))
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
            <div key={s.id} className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
              <span className="dark:text-white">{s.first_name} {s.last_name}</span>
              <div className="flex items-center gap-1">
                <Badge size="xs" color="blue">{divisionLabel(s.division)}</Badge>
                <Badge size="xs" color="gray">{s.region}</Badge>
                <Button size="xs" onClick={() => { handleAdd(s.id); }}>{t('common.add')}</Button>
              </div>
            </div>
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
