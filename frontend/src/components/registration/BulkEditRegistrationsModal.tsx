import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useMatchStore } from '../../stores/matchStore';
import BulkEditFormFields, { type BulkEditForm } from '../shared/BulkEditFormFields';
import { getDivisionsForMatch } from '../../utils/constants';
import { useEscClose } from '../../hooks/useEscClose';

interface BulkEditRegistrationsModalProps {
  show: boolean;
  onClose: () => void;
  selectedIds: string[];
  selectedNames: string[];
  matchId: string;
  onSaved: () => void;
}

export default function BulkEditRegistrationsModal({ show, onClose, selectedIds, selectedNames, matchId, onSaved }: BulkEditRegistrationsModalProps) {
  const { t } = useTranslation();
  const { matches } = useMatchStore();
  const match = matches.find((m: any) => m.id === matchId);
  const matchOrganization = match?.organization;
  const matchFirearmType = match?.firearm_type;
  const defaultDivision = getDivisionsForMatch(match)[0]?.value ?? 'standard';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; failed: Array<{ id: string; name: string; reason: string }> } | null>(null);
  const [form, setForm] = useState<BulkEditForm>({
    changeDivision: false, division: defaultDivision,
    changeCategory: false, category: 'regular',
    changePowerFactor: false, powerFactor: 'minor',
    changeTag: false, tag: '',
    changeSquad: false, squad: '',
  });

  const handleClose = () => {
    setResult(null);
    setForm({ changeDivision: false, division: defaultDivision, changeCategory: false, category: 'regular', changePowerFactor: false, powerFactor: 'minor', changeTag: false, tag: '', changeSquad: false, squad: '' });
    onClose();
  };
  useEscClose(handleClose);

  const handleSave = async () => {
    const updates: Record<string, any> = {};
    if (form.changeDivision) updates.division = form.division;
    if (form.changeCategory) updates.category = form.category;
    if (form.changePowerFactor) updates.power_factor = form.powerFactor;
    if (form.changeTag) updates.tag = form.tag || null;
    if (form.changeSquad) updates.squad = form.squad ? parseInt(form.squad) : null;
    if (Object.keys(updates).length === 0) return;

    setLoading(true);
    try {
      const res = await api.bulkUpdateRegistrations(matchId, selectedIds, updates);
      setResult(res);
      if (res.failed.length === 0) {
        onSaved();
        setTimeout(handleClose, 1500);
      }
    } catch (err: any) {
      setResult({ updated: 0, failed: [{ id: '', name: '', reason: err.message || 'Unknown error' }] });
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = form.changeDivision || form.changeCategory || form.changePowerFactor || form.changeTag || form.changeSquad;

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <ModalHeader>{t('bulkEdit.title', { count: selectedIds.length, entity: t('bulkEdit.registrations') })}</ModalHeader>
      <ModalBody>
        {result ? (
          <div className="space-y-3">
            {result.updated > 0 && (
              <Alert color="success">
                {t('bulkEdit.success', { count: result.updated, entity: t('bulkEdit.registrations') })}
              </Alert>
            )}
            {result.failed.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('bulkEdit.partialSuccess', { updated: result.updated, failed: result.failed.length })}</p>
                <ul className="text-sm list-disc pl-4">
                  {result.failed.map((f, i) => (
                    <li key={i}>{f.name || f.id}: {f.reason}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('bulkEdit.selectFields')}
            </p>
            <BulkEditFormFields form={form} onChange={setForm} showSquad organization={matchOrganization} firearmType={matchFirearmType} />
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {result ? (
          <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button color="blue" onClick={handleSave} disabled={loading || !hasChanges}>
              {loading ? t('common.loading') : t('bulkEdit.applyChanges')}
            </Button>
            <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}