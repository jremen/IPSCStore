import { useState } from 'react';
import { useLanUrl } from '../../hooks/useLanUrl';
import { useTranslation } from 'react-i18next';

export default function LanUrlBadge() {
  const { url, domainUrls } = useLanUrl();
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  if (!url && !domainUrls) return null;

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback: select text
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
      {url && (
        <button
          onClick={() => handleCopy(url, 'ip')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-gray-700 hover:bg-gray-600 text-green-400 rounded-full transition-colors cursor-pointer whitespace-nowrap"
          title={t('header.copyUrl')}
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
          </svg>
          {copied === 'ip' ? t('header.copied') : url}
        </button>
      )}
      {domainUrls && (
        <>
          <button
            onClick={() => handleCopy(domainUrls.vysledky, 'results')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-blue-700 hover:bg-blue-600 text-white rounded-full transition-colors cursor-pointer whitespace-nowrap"
            title={t('header.domainResults')}
          >
            🏆 {copied === 'results' ? t('header.copied') : 'vysledky.local'}
          </button>
          <button
            onClick={() => handleCopy(domainUrls.hodnotenie, 'scoring')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-orange-700 hover:bg-orange-600 text-white rounded-full transition-colors cursor-pointer whitespace-nowrap"
            title={t('header.domainScoring')}
          >
            🎯 {copied === 'scoring' ? t('header.copied') : 'hodnotenie.local'}
          </button>
        </>
      )}
    </div>
  );
}
