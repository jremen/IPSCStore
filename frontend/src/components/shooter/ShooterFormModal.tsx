import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../../stores/shooterStore';
import { useUIStore } from '../../stores/uiStore';
import ShooterFormFields, { type ShooterFormData } from '../shared/ShooterFormFields';
import type { CreateShooterInput } from '../../types/shooter';

interface ShooterFormModalProps {
  show: boolean;
  onClose: () => void;
  editShooter?: any | null;
}

export default function ShooterFormModal({ show, onClose, editShooter }: ShooterFormModalProps) {
  const { createShooter, updateShooter } = useShooterStore();
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [form, setForm] = useState<ShooterFormData>({
    first_name: '', last_name: '', category: 'regular', tag: null,
    division: 'standard', power_factor: 'minor', region: '', email: null,
  });

  useEffect(() => {
    if (editShooter) {
      setForm({
        first_name: editShooter.first_name,
        last_name: editShooter.last_name,
        category: editShooter.category,
        tag: editShooter.tag,
        division: editShooter.division,
        power_factor: editShooter.power_factor,
        region: editShooter.region,
        email: editShooter.email,
      });
    } else {
      setForm({ first_name: '', last_name: '', category: 'regular', tag: null, division: 'standard', power_factor: 'minor', region: '', email: null });
    }
  }, [editShooter, show]);

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.region) return;
    await createShooter(form as CreateShooterInput);
    addToast(t('shooters.created'), 'success');
    onClose();
  };

  const handleEdit = async () => {
    if (!editShooter) return;
    await updateShooter(editShooter.id, form as CreateShooterInput);
    addToast(t('shooters.updated'), 'success');
    onClose();
  };

  const isEdit = !!editShooter;
  const title = isEdit ? t('shooters.editTitle') : t('shooters.createTitle');

  return (
    <Modal show={show} onClose={onClose} size="xl">
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <ShooterFormFields form={form} onChange={setForm} />
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={isEdit ? handleEdit : handleCreate} disabled={!form.first_name || !form.last_name || !form.region}>
          {isEdit ? t('common.saveChanges') : t('shooters.createTitle')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
