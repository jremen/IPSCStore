import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import ShooterFormFields, { type ShooterFormData } from '../shared/ShooterFormFields';
import type { Category, Division, PowerFactor } from '../../types/shooter';

interface CreateShooterModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  onCreated: () => void;
}

export default function CreateShooterModal({ show, onClose, matchId, onCreated }: CreateShooterModalProps) {
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [squad, setSquad] = useState('');
  const [form, setForm] = useState<ShooterFormData>({
    first_name: '', last_name: '', category: 'regular', tag: null,
    division: 'standard', power_factor: 'minor', region: '', email: null,
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
      setForm({ first_name: '', last_name: '', category: 'regular', tag: null, division: 'standard', power_factor: 'minor', region: '', email: null });
      setSquad('');
      onCreated();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>{t('registration.createTitle')}</ModalHeader>
      <ModalBody>
        <ShooterFormFields form={form} onChange={setForm} showSquad squad={squad} onSquadChange={setSquad} />
      </ModalBody>
      <ModalFooter>
        <Button color="blue" onClick={handleCreate} disabled={!form.first_name || !form.last_name || !form.region}>
          {t('registration.createAndRegister')}
        </Button>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}