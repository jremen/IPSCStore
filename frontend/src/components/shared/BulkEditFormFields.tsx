import { Checkbox, Select, ToggleSwitch } from 'flowbite-react';
import { InputField } from './InputField';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, POWER_FACTORS, getDivisionsForMatch, getDivisionsForOrganization, getGroupedDivisions } from '../../utils/constants';

export interface BulkEditForm {
  changeDivision: boolean;
  division: string;
  changeCategory: boolean;
  category: string;
  changePowerFactor: boolean;
  powerFactor: string;
  changeTag?: boolean;
  tag: string;
  changeSquad?: boolean;
  squad: string;
}

interface BulkEditFormFieldsProps {
  form: BulkEditForm;
  onChange: (form: BulkEditForm) => void;
  showSquad?: boolean;
  /** Organization to filter divisions by (e.g. 'IPSC', 'USPSA') */
  organization?: string;
  /** Firearm type to filter divisions by (e.g. 'rifle', 'shotgun').
   *  Takes precedence over `organization` for IPSC Rifle/Shotgun matches. */
  firearmType?: string;
}

/** Shared form for bulk editing shooters or registrations.
 *  Each field has a "Change this field?" checkbox — only checked fields are included in the update. */
export default function BulkEditFormFields({ form, onChange, showSquad = false, organization, firearmType }: BulkEditFormFieldsProps) {
  const { t } = useTranslation();
  const divisions = firearmType || organization
    ? getDivisionsForMatch({ organization, firearm_type: firearmType })
    : getDivisionsForOrganization(organization);
  const groupedDivisions = firearmType || organization ? null : getGroupedDivisions();

  const update = (patch: Partial<BulkEditForm>) => onChange({ ...form, ...patch });

  return (
    <div className="space-y-4">
      {/* Division */}
      <div className="flex items-center gap-3">
        <ToggleSwitch
          checked={form.changeDivision}
          onChange={(checked) => update({ changeDivision: checked, division: checked ? form.division || divisions[0].value : '' })}
          label={t('bulkEdit.changeField', { field: t('scoring.division') })}
        />
        <div className="flex-1">
          {form.changeDivision && (
            <Select
              sizing="sm"
              value={form.division}
              onChange={(e) => update({ division: e.target.value })}
              className="mt-1"
            >
              {groupedDivisions
                ? groupedDivisions.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.divisions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </optgroup>
                ))
                : divisions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="flex items-center gap-3">
        <ToggleSwitch
          checked={form.changeCategory}
          onChange={(checked) => update({ changeCategory: checked, category: checked ? form.category || CATEGORIES[0].value : '' })}
          label={t('bulkEdit.changeField', { field: t('scoring.category') })}
        />
        <div className="flex-1">
          {form.changeCategory && (
            <Select
              sizing="sm"
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className="mt-1"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{t(c.i18nKey)}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Power Factor */}
      <div className="flex items-center gap-3">
        <ToggleSwitch
          checked={form.changePowerFactor}
          onChange={(checked) => update({ changePowerFactor: checked, powerFactor: checked ? form.powerFactor || POWER_FACTORS[0].value : '' })}
          label={t('bulkEdit.changeField', { field: t('scoring.powerFactor') })}
        />
        <div className="flex-1">
          {form.changePowerFactor && (
            <Select
              sizing="sm"
              value={form.powerFactor}
              onChange={(e) => update({ powerFactor: e.target.value })}
              className="mt-1"
            >
              {POWER_FACTORS.map((pf) => (
                <option key={pf.value} value={pf.value}>{t(pf.i18nKey)}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Tag */}
      <div className="flex items-center gap-3">
        <ToggleSwitch
          checked={form.changeTag ?? false}
          onChange={(checked) => update({ changeTag: checked, tag: checked ? form.tag || '' : '' })}
          label={t('bulkEdit.changeField', { field: t('registration.tag') })}
        />
        <div className="flex-1">
          {(form.changeTag) && (
            <InputField
              sizing="sm"
              value={form.tag}
              onChange={(v) => update({ tag: v })}
              placeholder={t('registration.tagPlaceholder')}
              className="mt-1"
            />
          )}
        </div>
      </div>

      {/* Squad (only for registrations) */}
      {showSquad && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={form.changeSquad ?? false}
            onChange={(e) => update({ changeSquad: e.target.checked, squad: e.target.checked ? form.squad : '' })}
          />
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('bulkEdit.changeField', { field: t('registration.squad') })}
            </label>
            {form.changeSquad && (
              <InputField
                type="number"
                step="1"
                min="0"
                sizing="sm"
                value={form.squad}
                onChange={(v) => update({ squad: v })}
                placeholder="Squad #"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
