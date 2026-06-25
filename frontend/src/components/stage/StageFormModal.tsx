import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Textarea, Select, Label, Checkbox } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useStageStore } from '../../stores/stageStore';
import { useMatchStore } from '../../stores/matchStore';
import { useUIStore } from '../../stores/uiStore';
import { SCORING_TYPES } from '../../utils/constants';
import { InputField } from '../shared/InputField';
import type { ScoringType, StageConfig } from '../../types/stage';
import type { Stage } from '../../types/stage';
import { useEscClose } from '../../hooks/useEscClose';

interface StageForm {
  name: string;
  scoring_type: ScoringType;
  paper_targets: number;
  steel_targets: number;
  no_shoot_targets: number;
  npm_targets: number;
  hits_per_paper: number;
  par_time: number | null;
  config: StageConfig;
  password: string;
  briefing: string;
}

const emptyForm = (): StageForm => ({
  name: '', scoring_type: 'comstock',
  paper_targets: 0, steel_targets: 0, no_shoot_targets: 0, npm_targets: 0,
  hits_per_paper: 2, par_time: null, config: {},
  password: '',
  briefing: '',
});

function getVisibleFields(type: ScoringType) {
  const ipsc = ['comstock', 'virginia', 'fixed_time', 'hit_factor', 'chrono', 'idpa'];
  if (ipsc.includes(type)) {
    return { paperTargets: true, steelTargets: true, noShootTargets: true, npmTargets: true, hitsPerPaper: true, parTime: type === 'fixed_time', config: false };
  }
  switch (type) {
    case 'action_steel':
      return { paperTargets: false, steelTargets: false, noShootTargets: false, npmTargets: false, hitsPerPaper: false, parTime: false, config: true };
    case 'multi_gun':
      return { paperTargets: false, steelTargets: false, noShootTargets: false, npmTargets: false, hitsPerPaper: false, parTime: false, config: true };
    case 'long_range':
      return { paperTargets: false, steelTargets: false, noShootTargets: false, npmTargets: false, hitsPerPaper: false, parTime: false, config: true };
    case 'bullseye':
      return { paperTargets: false, steelTargets: false, noShootTargets: false, npmTargets: false, hitsPerPaper: false, parTime: false, config: true };
    case 'archery':
      return { paperTargets: false, steelTargets: false, noShootTargets: false, npmTargets: false, hitsPerPaper: false, parTime: false, config: true };
    case 'nrl22':
      return { paperTargets: false, steelTargets: false, noShootTargets: false, npmTargets: false, hitsPerPaper: false, parTime: false, config: true };
    default:
      return { paperTargets: true, steelTargets: true, noShootTargets: true, npmTargets: true, hitsPerPaper: true, parTime: false, config: false };
  }
}

interface StageFormModalProps {
  show: boolean;
  onClose: () => void;
  editStage?: Stage | null;
  matchId: string;
}

export default function StageFormModal({ show, onClose, editStage, matchId }: StageFormModalProps) {
  const { createStage, updateStage } = useStageStore();
  const { addToast } = useUIStore();
  const { matches } = useMatchStore();
  const { t } = useTranslation();
  useEscClose(onClose);
  const [form, setForm] = useState<StageForm>(emptyForm());
  const matchFirearmType = matches.find((m: any) => m.id === matchId)?.firearm_type;

  useEffect(() => {
    if (editStage) {
      setForm({
        name: editStage.name,
        scoring_type: editStage.scoring_type,
        paper_targets: editStage.paper_targets,
        steel_targets: editStage.steel_targets,
        no_shoot_targets: editStage.no_shoot_targets,
        npm_targets: editStage.npm_targets ?? 0,
        hits_per_paper: editStage.hits_per_paper,
        par_time: editStage.par_time,
        config: editStage.config || {},
        briefing: editStage.briefing ?? '',
        // Don't pre-fill password — hashes can't be reversed.
        // Send empty string = keep existing, non-empty = set new
        password: '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [editStage, show]);

  const handleCreate = async () => {
    if (!matchId || !form.name) return;
    await createStage(matchId, form);
    onClose();
    setForm(emptyForm());
  };

  const handleEdit = async () => {
    if (!editStage) return;
    try {
      await updateStage(editStage.id, form);
      addToast(t('stages.updated'), 'success');
      onClose();
      setForm(emptyForm());
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const visibleFields = getVisibleFields(form.scoring_type);
  const isEdit = !!editStage;
  const title = isEdit ? t('stages.editTitle', { number: editStage?.stage_number }) : t('stages.addTitle');
  const submitLabel = isEdit ? t('stages.saveChanges') : t('stages.addTitle');
  const handleSubmit = isEdit ? handleEdit : handleCreate;

  return (
    <Modal show={show} onClose={onClose} size="xl">
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t('stages.name')}</Label>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('stages.namePlaceholder')} />
          </div>
          <div>
            <Label>{t('stages.scoringType')}</Label>
            <Select value={form.scoring_type} onChange={(e) => setForm({ ...form, scoring_type: e.target.value as ScoringType, config: {} })}>
              {SCORING_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>

          {visibleFields.paperTargets && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <InputField label={t('stages.paperTargets')} type="number" step="1" min="0" value={form.paper_targets} onChange={(v) => setForm({ ...form, paper_targets: parseInt(v) || 0 })} />
                <InputField label={t('stages.steelTargets')} type="number" step="1" min="0" value={form.steel_targets} onChange={(v) => setForm({ ...form, steel_targets: parseInt(v) || 0 })} />
                <InputField label={t('stages.npmTargets')} type="number" step="1" min="0" value={form.npm_targets} onChange={(v) => setForm({ ...form, npm_targets: parseInt(v) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="no-shoot" checked={form.no_shoot_targets > 0} onChange={(e) => setForm({ ...form, no_shoot_targets: e.target.checked ? 1 : 0 })} />
                <Label htmlFor="no-shoot">{t('stages.hasNoShootTargets')}</Label>
              </div>
            </div>
          )}

          {(visibleFields.hitsPerPaper || visibleFields.parTime) && (
            <div className="grid grid-cols-2 gap-3">
              {visibleFields.hitsPerPaper && (
                <div>
                  <InputField label={t('stages.hitsPerPaper')} type="number" step="1" min="1" value={form.hits_per_paper} onChange={(v) => setForm({ ...form, hits_per_paper: parseInt(v) || 2 })} />
                  {matchFirearmType === 'rifle' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('stages.hitsPerPaperRifleHint')}
                    </p>
                  )}
                </div>
              )}
              {visibleFields.parTime && (
                <InputField label={t('stages.parTime')} type="number" step="0.01" min="0" decimal value={form.par_time ?? ''} onChange={(v) => setForm({ ...form, par_time: v ? parseFloat(v) : null })} disabled={form.scoring_type !== 'fixed_time'} />
              )}
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'action_steel' && (
            <div className="grid grid-cols-3 gap-3">
              <InputField label={t('stages.configNumberOfStrings')} type="number" step="1" min="1" value={form.config.number_of_strings ?? 5} onChange={(v) => setForm({ ...form, config: { ...form.config, number_of_strings: parseInt(v) || 5 } })} />
              <InputField label={t('stages.configTargetsPerString')} type="number" step="1" min="1" value={form.config.targets_per_string ?? 5} onChange={(v) => setForm({ ...form, config: { ...form.config, targets_per_string: parseInt(v) || 5 } })} />
              <InputField label={t('stages.configDropWorst')} type="number" step="1" min="0" value={form.config.drop_worst ?? 1} onChange={(v) => setForm({ ...form, config: { ...form.config, drop_worst: parseInt(v) || 1 } })} />
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'multi_gun' && (
            <div className="grid grid-cols-2 gap-3">
              <InputField label={t('stages.configNumTargets')} type="number" step="1" min="1" value={form.config.num_targets ?? 8} onChange={(v) => setForm({ ...form, config: { ...form.config, num_targets: parseInt(v) || 8 } })} />
              <div>
                <Label>{t('stages.configHasNoShoots')}</Label>
                <Select value={form.config.has_no_shoot ? 'true' : 'false'} onChange={(e) => setForm({ ...form, config: { ...form.config, has_no_shoot: e.target.value === 'true' } })}>
                  <option value="false">{t('common.no')}</option>
                  <option value="true">{t('common.yes')}</option>
                </Select>
              </div>
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'long_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('stages.configVariant')}</Label>
                <Select value={form.config.variant || 'prs'} onChange={(e) => setForm({ ...form, config: { ...form.config, variant: e.target.value as 'prs' | 'f_class' } })}>
                  <option value="prs">{t('stages.configPrsHitMiss')}</option>
                  <option value="f_class">{t('stages.configFClass')}</option>
                </Select>
              </div>
              {form.config.variant === 'f_class' ? (
                <InputField label={t('stages.configShotsPerString')} type="number" step="1" min="1" value={form.config.shots_per_string ?? 20} onChange={(v) => setForm({ ...form, config: { ...form.config, shots_per_string: parseInt(v) || 20 } })} />
              ) : (
                <InputField label={t('stages.configNumTargets')} type="number" step="1" min="1" value={form.config.num_targets ?? 10} onChange={(v) => setForm({ ...form, config: { ...form.config, num_targets: parseInt(v) || 10 } })} />
              )}
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'bullseye' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('stages.configFireType')}</Label>
                <Select value={form.config.fire_type || 'slow'} onChange={(e) => setForm({ ...form, config: { ...form.config, fire_type: e.target.value as 'slow' | 'timed' | 'rapid' } })}>
                  <option value="slow">{t('stages.configSlowFire')}</option>
                  <option value="timed">{t('stages.configTimedFire')}</option>
                  <option value="rapid">{t('stages.configRapidFire')}</option>
                </Select>
              </div>
              <InputField label={t('stages.configShotsPerString')} type="number" step="1" min="1" value={form.config.shots_per_string ?? 10} onChange={(v) => setForm({ ...form, config: { ...form.config, shots_per_string: parseInt(v) || 10 } })} />
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'archery' && (
            <InputField label={t('stages.configArrowsPerEnd')} type="number" step="1" min="1" value={form.config.arrows_per_end ?? 6} onChange={(v) => setForm({ ...form, config: { ...form.config, arrows_per_end: parseInt(v) || 6 } })} />
          )}

          {visibleFields.config && form.scoring_type === 'nrl22' && (
            <div className="grid grid-cols-2 gap-3">
              <InputField label={t('stages.configNumTargets')} type="number" step="1" min="1" value={form.config.num_targets ?? 10} onChange={(v) => setForm({ ...form, config: { ...form.config, num_targets: parseInt(v) || 10 } })} />
              <InputField label={t('stages.configPointValue')} type="number" step="1" min="1" value={form.config.point_value ?? 10} onChange={(v) => setForm({ ...form, config: { ...form.config, point_value: parseInt(v) || 10 } })} />
            </div>
          )}

          <div>
            <Label htmlFor="stage-briefing">{t('stages.briefing')}</Label>
            <Textarea
              id="stage-briefing"
              rows={5}
              value={form.briefing}
              onChange={(e) => setForm({ ...form, briefing: e.target.value })}
              placeholder={t('stages.briefingPlaceholder')}
              className="dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleSubmit} disabled={!form.name}>{submitLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
