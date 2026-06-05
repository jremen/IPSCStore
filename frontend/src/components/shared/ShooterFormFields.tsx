import { TextInput, Select, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, DIVISIONS, POWER_FACTORS } from '../../utils/constants';
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
}

/** Shared shooter form fields — used by both MatchRegistration and ShooterDatabase */
export default function ShooterFormFields({ form, onChange, showTagAndEmail = true, showSquad = false, squad, onSquadChange }: ShooterFormFieldsProps) {
  const { t } = useTranslation();

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
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>{t('shooters.division')}</Label>
          <Select value={form.division} onChange={(e) => onChange({ ...form, division: e.target.value as Division })}>
            {DIVISIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('shooters.powerFactor')}</Label>
          <Select value={form.power_factor} onChange={(e) => onChange({ ...form, power_factor: e.target.value as PowerFactor })}>
            {POWER_FACTORS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
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
          <TextInput type="number" value={squad || ''} onChange={(e) => onSquadChange(e.target.value)} placeholder={t('registration.squadPlaceholder')} />
        </div>
      )}
    </div>
  );
}