import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Select, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { CATEGORIES, DIVISIONS, POWER_FACTORS } from '../../utils/constants';

interface EditRegistrationModalProps {
  show: boolean;
  onClose: () => void;
  registration: any | null;
  matchId: string;
  onSaved: () => void;
}

export default function EditRegistrationModal({ show, onClose, registration, matchId, onSaved }: EditRegistrationModalProps) {
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [form, setForm] = useState({ squad: '', division: '', category: '', power_factor: '' });

  // Sync form when registration changes or modal opens
  useEffect(() => {
    if (registration) {
      setForm({
        squad: String(registration.squad || ''),
        division: registration.reg_division || '',
        category: registration.reg_category || '',
        power_factor: registration.reg_power_factor || '',
      });
    }
  }, [registration]);

  const handleSave = async () => {
    if (!matchId || !registration) return;
    await api.updateRegistration(matchId, registration.id, {
      squad: form.squad ? parseInt(form.squad) : null,
      division: form.division || null,
      category: form.category || null,
      power_factor: form.power_factor || null,
    });
    addToast(t('registration.updated'), 'success');
    onClose();
    onSaved();
  };

  return (
    <Modal show={show} onClose={onClose} size="md">
      <ModalHeader>{t('registration.editTitle', { name: registration ? `${registration.first_name} ${registration.last_name}` : '' })}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div>
            <Label>{t('registration.squad')}</Label>
            <TextInput type="number" value={form.squad} onChange={(e) => setForm({ ...form, squad: e.target.value })} placeholder={t('registration.leaveBlankDefault')} />
          </div>
          <div>
            <Label>{t('registration.divisionOverride')}</Label>
            <Select value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {DIVISIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('registration.categoryOverride')}</Label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('registration.powerFactorOverride')}</Label>
            <Select value={form.power_factor} onChange={(e) => setForm({ ...form, power_factor: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {POWER_FACTORS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="blue" onClick={handleSave}>{t('common.saveChanges')}</Button>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}