import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Select, Label, Datepicker } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useUIStore } from '../../stores/uiStore';
import { ORGANIZATIONS, FIREARM_TYPES } from '../../utils/constants';
import type { Organization, FirearmType } from '../../types/match';
import { useEscClose } from '../../hooks/useEscClose';

interface CreateMatchModalProps {
  show: boolean;
  onClose: () => void;
}

export default function CreateMatchModal({ show, onClose }: CreateMatchModalProps) {
  const { createMatch } = useMatchStore();
  const { setActiveMatch } = useUIStore();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '', date: '', organization: 'IPSC' as Organization, firearm_type: 'handgun' as FirearmType
  });

  const handleCreate = async () => {
    if (!form.name || !form.date) return;
    const match = await createMatch(form);
    onClose();
    setForm({ name: '', date: '', organization: 'IPSC', firearm_type: 'handgun' });
    await setActiveMatch(match.id);
  };

  const handleClose = () => {
    onClose();
    setForm({ name: '', date: '', organization: 'IPSC', firearm_type: 'handgun' });
  };
  useEscClose(handleClose);

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <ModalHeader>{t('matches.createTitle')}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t('matches.name')}</Label>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('matches.namePlaceholder')} />
          </div>
          <div>
            <Label>{t('matches.date')}</Label>
            <Datepicker
              value={form.date ? new Date(form.date) : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(date.getDate()).padStart(2, '0');
                  setForm({ ...form, date: `${yyyy}-${mm}-${dd}` });
                }
              }}
              placeholder={t('matches.date')}
            />
          </div>
          <div>
            <Label>{t('matches.organization')}</Label>
            <Select value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value as Organization })}>
              {ORGANIZATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('matches.firearm')}</Label>
            <Select value={form.firearm_type} onChange={(e) => setForm({ ...form, firearm_type: e.target.value as FirearmType })}>
              {FIREARM_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="blue" onClick={handleCreate} disabled={!form.name || !form.date}>{t('common.create')}</Button>
        <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}