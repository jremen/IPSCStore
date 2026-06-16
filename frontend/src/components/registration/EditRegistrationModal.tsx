import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Select, Label } from 'flowbite-react';
import { InputField } from '../shared/InputField';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { api } from '../../services/api';
import { CATEGORIES, POWER_FACTORS, getDivisionsForOrganization } from '../../utils/constants';
import { useEscClose } from '../../hooks/useEscClose';

interface EditRegistrationModalProps {
  show: boolean;
  onClose: () => void;
  registration: any | null;
  matchId: string;
  onSaved: () => void;
}

export default function EditRegistrationModal({ show, onClose, registration, matchId, onSaved }: EditRegistrationModalProps) {
  const { addToast } = useUIStore();
  const { matches } = useMatchStore();
  const { t } = useTranslation();
  useEscClose(onClose);
  const matchOrganization = matches.find((m: any) => m.id === matchId)?.organization;
  const divisions = getDivisionsForOrganization(matchOrganization);
  const [form, setForm] = useState({ squad: '', division: '', category: '', power_factor: '', tag: '' });

  // Sync form when registration changes or modal opens
  useEffect(() => {
    if (registration) {
      setForm({
        squad: registration.squad === null || registration.squad === undefined ? '' : String(registration.squad),
        division: registration.reg_division || '',
        category: registration.reg_category || '',
        power_factor: registration.reg_power_factor || '',
        tag: registration.tag || '',
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
      tag: form.tag || null,
    });
    addToast(t('registration.updated'), 'success');
    onClose();
    onSaved();
  };

  return (
    <Modal show={show} onClose={onClose} size="xl">
      <ModalHeader>{t('registration.editTitle', { name: registration ? `${registration.first_name} ${registration.last_name}` : '' })}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div>
            <Label>{t('registration.squad')}</Label>
            <InputField type="number" step="1" min="0" value={form.squad} onChange={(v) => setForm({ ...form, squad: v })} placeholder={t('registration.leaveBlankDefault')} />
          </div>
          <div>
            <Label>{t('registration.divisionOverride')}</Label>
            <Select value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {divisions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('registration.categoryOverride')}</Label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{t(c.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('registration.powerFactorOverride')}</Label>
            <Select value={form.power_factor} onChange={(e) => setForm({ ...form, power_factor: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {POWER_FACTORS.map((p) => <option key={p.value} value={p.value}>{t(p.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('registration.tag')}</Label>
            <InputField value={form.tag} onChange={(v) => setForm({ ...form, tag: v })} placeholder={t('registration.tagPlaceholder')} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleSave}>{t('common.saveChanges')}</Button>
      </ModalFooter>
    </Modal>
  );
}