import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Select, Label, Datepicker } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useUIStore } from '../../stores/uiStore';
import { ORGANIZATIONS, FIREARM_TYPES, MATCH_LEVELS } from '../../utils/constants';
import type { Organization, FirearmType, MatchLevel } from '../../types/match';
import { useEscClose } from '../../hooks/useEscClose';

interface CreateMatchModalProps {
  show: boolean;
  onClose: () => void;
}

const initialForm = { name: '', date: '', organization: 'IPSC' as Organization, firearm_type: 'handgun' as FirearmType, match_level: '' as '' | MatchLevel };

export default function CreateMatchModal({ show, onClose }: CreateMatchModalProps) {
  const createMatch = useMatchStore((s) => s.createMatch);
  const markCurrent = useMatchStore((s) => s.markCurrent);
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [form, setForm] = useState(initialForm);

  const handleCreate = async () => {
    if (!form.name || !form.date) return;
    try {
      const match = await createMatch({
        name: form.name,
        date: form.date,
        organization: form.organization,
        firearm_type: form.firearm_type,
        match_level: form.match_level === '' ? null : form.match_level,
      });
      onClose();
      setForm(initialForm);
      await markCurrent(match.id);
      await setActiveMatch(match.id);
    } catch (err: any) {
      addToast(err.message || t('common.error'), 'error');
    }
  };

  const handleClose = () => {
    onClose();
    setForm(initialForm);
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
              {ORGANIZATIONS.map((o) => <option key={o.value} value={o.value}>{t(o.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('matches.firearm')}</Label>
            <Select value={form.firearm_type} onChange={(e) => setForm({ ...form, firearm_type: e.target.value as FirearmType })}>
              {FIREARM_TYPES.map((f) => <option key={f.value} value={f.value}>{t(f.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('matches.level')}</Label>
            <Select
              value={String(form.match_level)}
              onChange={(e) => setForm({ ...form, match_level: e.target.value === '' ? '' : (Number(e.target.value) as MatchLevel) })}
            >
              <option value="">—</option>
              {MATCH_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleCreate} disabled={!form.name || !form.date}>{t('common.create')}</Button>
      </ModalFooter>
    </Modal>
  );
}
