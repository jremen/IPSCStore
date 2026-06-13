import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Label, Badge, Spinner } from 'flowbite-react';
import { InputField } from '../shared/InputField';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useShooterSearch } from '../../hooks/useShooterSearch';
import { api } from '../../services/api';
import { divisionLabel } from '../../utils/constants';
import { useEscClose } from '../../hooks/useEscClose';

interface AddShooterModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  /** IDs of shooters already registered in this match — they will be hidden from the list */
  registeredShooterIds: string[];
  onAdded: () => void;
  onCreate: () => void;
}

export default function AddShooterModal({ show, onClose, matchId, registeredShooterIds, onAdded, onCreate }: AddShooterModalProps) {
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [squad, setSquad] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const excludedIds = [...registeredShooterIds, ...addedIds];
  const { shooters, loading, search, setSearch } = useShooterSearch(excludedIds);

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

  const handleClose = () => {
    setAddedIds(new Set());
    setSquad('');
    setSearch('');
    onClose();
  };
  useEscClose(handleClose);

  return (
    <Modal show={show} onClose={handleClose} size="2xl">
      <ModalHeader>{t('registration.addTitle')}</ModalHeader>
      <ModalBody>
        <div className="mb-3">
          <Label>{t('registration.squadOptional')}</Label>
          <InputField type="number" step="1" min="0" value={squad} onChange={setSquad} placeholder={t('registration.squadPlaceholder')} />
        </div>
        <div className="flex gap-2">
          <TextInput placeholder={t('registration.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 flex-1" />
          <Button color="green" onClick={() => onCreate()}>{t('shooters.newShooter')}</Button>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-1">
          {loading && <div className="text-center py-4"><Spinner size="sm" /> {t('common.loading')}</div>}
          {!loading && shooters.slice(0, 50).map((s) => (
            <div key={s.id} className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
              <span className="dark:text-white">{s.first_name} {s.last_name}</span>
              <div className="flex items-center gap-1">
                <Badge size="xs" color="blue">{divisionLabel(s.division)}</Badge>
                <Badge size="xs" color="gray">{s.region}</Badge>
                <Button size="xs" className="ml-2" onClick={() => { handleAdd(s.id); }}>+&nbsp;{t('common.add')}</Button>
              </div>
            </div>
          ))}
          {!loading && shooters.length === 0 && <p className="text-gray-500 text-sm text-center py-2">{t('registration.searchEmpty')}</p>}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
      </ModalFooter>
    </Modal>
  );
}
