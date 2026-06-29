import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useShooterStore } from '../../stores/shooterStore';
import { api } from '../../services/api';
import ShooterFormFields, { type ShooterFormData } from '../shared/ShooterFormFields';
import { getDivisionsForMatch } from '../../utils/constants';
import { useEscClose } from '../../hooks/useEscClose';

interface CreateShooterModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  onCreated: () => void;
}

export default function CreateShooterModal({ show, onClose, matchId, onCreated }: CreateShooterModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const matches = useMatchStore((s) => s.matches);
  const fetchShooters = useShooterStore((s) => s.fetchShooters);
  const { t } = useTranslation();
  useEscClose(onClose);
  const match = matches.find((m: any) => m.id === matchId);
  const matchOrganization = match?.organization;
  const matchFirearmType = match?.firearm_type;
  const defaultDivision = getDivisionsForMatch(match)[0]?.value ?? 'standard';
  const [squad, setSquad] = useState('');
  const [form, setForm] = useState<ShooterFormData>({
    first_name: '', last_name: '', category: 'regular', tag: null,
    division: defaultDivision, power_factor: 'minor', region: '', email: null,
  });

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.region) return;
    try {
      await api.createAndAddShooter(matchId, {
        ...form,
        squad: squad ? parseInt(squad) : undefined,
      });
      addToast(t('registration.createdAndRegistered'), 'success');
      onClose();
      setForm({ first_name: '', last_name: '', category: 'regular', tag: null, division: defaultDivision, power_factor: 'minor', region: '', email: null });
      setSquad('');
      onCreated();
      fetchShooters();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>{t('registration.createTitle')}</ModalHeader>
      <ModalBody>
        <ShooterFormFields form={form} onChange={setForm} showSquad squad={squad} onSquadChange={setSquad} organization={matchOrganization} firearmType={matchFirearmType} />
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleCreate} disabled={!form.first_name || !form.last_name || !form.region}>
          {t('registration.createAndRegister')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
