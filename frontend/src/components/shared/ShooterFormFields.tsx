import { TextInput, Select, Label } from 'flowbite-react';
import { InputField } from './InputField';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, POWER_FACTORS, getDivisionsForMatch, getDivisionsForOrganization, getGroupedDivisions } from '../../utils/constants';
import type { Category, Division, PowerFactor } from '../../types/shooter';

export interface ShooterFormData {
  first_name: string;
  last_name: string;
  category: Category | string;
  division: Division | string;
  power_factor: PowerFactor | string;
  region: string;
  tag: string | null;
  email: string | null;
}

interface ShooterFormFieldsProps {
  form: ShooterFormData;
  onChange: (form: ShooterFormData) => void;
  showTagAndEmail?: boolean;
  showSquad?: boolean;
  squad?: string;
  onSquadChange?: (squad: string) => void;
  /** Organization to filter divisions by (e.g. 'IPSC', 'USPSA') */
  organization?: string;
  /** Firearm type to filter divisions by (e.g. 'rifle', 'shotgun').
   *  Takes precedence over `organization` for IPSC Rifle/Shotgun matches. */
  firearmType?: string;
}

/** Shared shooter form fields — used by both MatchRegistration and ShooterDatabase */
export default function ShooterFormFields({ form, onChange, showTagAndEmail = true, showSquad = false, squad, onSquadChange, organization, firearmType }: ShooterFormFieldsProps) {
  const { t } = useTranslation();
  // Use the firearm-aware helper when a firearm_type is known. Fall back to the
  // org-only filter when only organization is known (legacy caller path).
  const divisions = firearmType || organization
    ? getDivisionsForMatch({ organization, firearm_type: firearmType })
    : getDivisionsForOrganization(organization);
  // Grouped divisions only make sense when we're showing all orgs at once
  // (ShooterDatabase path), not when scoped to a single match.
  const groupedDivisions = firearmType || organization ? null : getGroupedDivisions();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('shooters.firstName')}</Label>
          <TextInput value={form.first_name} onChange={(e) => onChange({ ...form, first_name: e.target.value })} />
        </div>
        <div>
          <Label>{t('shooters.lastName')}</Label>
          <TextInput value={form.last_name} onChange={(e) => onChange({ ...form, last_name: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('shooters.category')}</Label>
          <Select value={form.category} onChange={(e) => onChange({ ...form, category: e.target.value as Category })}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{t(c.i18nKey)}</option>)}
          </Select>
        </div>
        <div>
          <Label>{t('shooters.division')}</Label>
          <Select value={form.division} onChange={(e) => onChange({ ...form, division: e.target.value as Division })}>
            {groupedDivisions
              ? groupedDivisions.map((g) => (
                <optgroup key={g.group} className="dark:text-white" label={g.group}>
                  {g.divisions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </optgroup>
              ))
              : divisions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('shooters.powerFactor')}</Label>
          <Select value={form.power_factor} onChange={(e) => onChange({ ...form, power_factor: e.target.value as PowerFactor })}>
            {POWER_FACTORS.map((p) => <option key={p.value} value={p.value}>{t(p.i18nKey)}</option>)}
          </Select>
        </div>
        <div>
          <Label>{t('shooters.region')}</Label>
          <TextInput value={form.region} onChange={(e) => onChange({ ...form, region: e.target.value })} placeholder={t('shooters.regionPlaceholder')} />
        </div>
      </div>
      {showTagAndEmail && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('shooters.tag')}</Label>
            <TextInput value={form.tag || ''} onChange={(e) => onChange({ ...form, tag: e.target.value || null })} placeholder={t('shooters.tagPlaceholder')} />
          </div>
          <div>
            <Label>{t('shooters.email')}</Label>
            <TextInput type="email" value={form.email || ''} onChange={(e) => onChange({ ...form, email: e.target.value || null })} />
          </div>
        </div>
      )}
      {showSquad && onSquadChange && (
        <div>
          <Label>{t('registration.squad')}</Label>
          <InputField type="number" step="1" min="0" value={squad || ''} onChange={onSquadChange} placeholder={t('registration.squadPlaceholder')} />
        </div>
      )}
    </div>
  );
}
