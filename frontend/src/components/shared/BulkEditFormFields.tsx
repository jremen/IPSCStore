import { Checkbox, Select } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, DIVISIONS, POWER_FACTORS } from '../../utils/constants';

export interface BulkEditForm {
  changeDivision: boolean;
  division: string;
  changeCategory: boolean;
  category: string;
  changePowerFactor: boolean;
  powerFactor: string;
  changeSquad?: boolean;
  squad: string;
}

interface BulkEditFormFieldsProps {
  form: BulkEditForm;
  onChange: (form: BulkEditForm) => void;
  showSquad?: boolean;
}

/** Shared form for bulk editing shooters or registrations.
 *  Each field has a "Change this field?" checkbox — only checked fields are included in the update. */
export default function BulkEditFormFields({ form, onChange, showSquad = false }: BulkEditFormFieldsProps) {
  const { t } = useTranslation();

  const update = (patch: Partial<BulkEditForm>) => onChange({ ...form, ...patch });

  return (
    <div className="space-y-4">
      {/* Division */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={form.changeDivision}
          onChange={(e) => update({ changeDivision: e.target.checked, division: e.target.checked ? form.division || DIVISIONS[0].value : '' })}
        />
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('bulkEdit.changeField', { field: t('scoring.division') })}
          </label>
          {form.changeDivision && (
            <Select
              sizing="sm"
              value={form.division}
              onChange={(e) => update({ division: e.target.value })}
              className="mt-1"
            >
              {DIVISIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={form.changeCategory}
          onChange={(e) => update({ changeCategory: e.target.checked, category: e.target.checked ? form.category || CATEGORIES[0].value : '' })}
        />
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('bulkEdit.changeField', { field: t('scoring.category') })}
          </label>
          {form.changeCategory && (
            <Select
              sizing="sm"
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className="mt-1"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Power Factor */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={form.changePowerFactor}
          onChange={(e) => update({ changePowerFactor: e.target.checked, powerFactor: e.target.checked ? form.powerFactor || POWER_FACTORS[0].value : '' })}
        />
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('bulkEdit.changeField', { field: t('scoring.powerFactor') })}
          </label>
          {form.changePowerFactor && (
            <Select
              sizing="sm"
              value={form.powerFactor}
              onChange={(e) => update({ powerFactor: e.target.value })}
              className="mt-1"
            >
              {POWER_FACTORS.map((pf) => (
                <option key={pf.value} value={pf.value}>{pf.label}</option>
              ))}
            </Select>
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
              <input
                type="number"
                min="0"
                value={form.squad}
                onChange={(e) => update({ squad: e.target.value })}
                className="mt-1 block w-24 rounded-lg border border-gray-300 bg-gray-50 p-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Squad #"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}