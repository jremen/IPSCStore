import { Select, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import type { Language } from '../../stores/uiStore';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const handleChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="language-select" className="text-xs whitespace-nowrap">
        <Select
          id="language-select"
          value={language}
          onChange={(e) => handleChange(e.target.value as Language)}
          className="[&_select]:py-1 [&_select]:text-sm [&_select]:bg-gray-800 [&_select]:text-white"
        >
          <option value="en">English</option>
          <option value="sk">Slovenčina</option>
        </Select>
      </Label>
    </div>
  );
}
