import { Select, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import type { Language } from '../../stores/uiStore';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useUIStore();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as Language;
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="language-select" className="text-xs whitespace-nowrap">
        🌐
      </Label>
      <Select
        id="language-select"
        value={language}
        onChange={handleChange}
        sizing="sm"
        className="w-auto"
      >
        <option value="en">English</option>
        <option value="sk">Slovenčina</option>
      </Select>
    </div>
  );
}