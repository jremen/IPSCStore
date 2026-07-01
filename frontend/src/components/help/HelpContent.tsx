import { useEffect, useState, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import ZoomableImage from './ZoomableImage';
import HelpLink from './HelpLink';
import type { HelpSection } from '../../config/helpSections';

interface HelpContentProps {
  section: HelpSection;
}

// Module-level cache so re-opening the modal doesn't re-fetch.
const cache = new Map<string, string>();

async function loadMarkdown(lang: string, file: string): Promise<string> {
  const key = `${lang}/${file}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const res = await fetch(`/docs/${lang}/${file}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${key}: ${res.status}`);
  }
  const text = await res.text();
  cache.set(key, text);
  return text;
}

export default function HelpContent({ section }: HelpContentProps) {
  const { t } = useTranslation();
  const language = useUIStore((s) => s.language);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    loadMarkdown(language, section.markdown)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message ?? err));
      });
    return () => {
      cancelled = true;
    };
  }, [language, section.markdown, reloadKey]);

  // Pre-scan the markdown for image refs so the lightbox can navigate
  // between them with arrow keys.
  const imageList = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const out: { src: string; alt: string }[] = [];
    let inFence = false;
    for (const line of lines) {
      if (line.trimStart().startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const m = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) {
        const alt = m[1] ?? '';
        const rawSrc = m[2] ?? '';
        // resolve src to absolute path so the lightbox can fetch it
        const src = rawSrc.startsWith('/') ? rawSrc : `/docs/${language}/${rawSrc.replace(/^\.\//, '')}`;
        out.push({ src, alt });
      }
    }
    return out;
  }, [content, language]);

  const components: Components = useMemo(
    () => ({
      a: HelpLink,
      img: ({ src, alt, ...rest }) => {
        const srcStr = typeof src === 'string' ? src : '';
        const resolved = srcStr.startsWith('/')
          ? srcStr
          : `/docs/${language}/${srcStr.replace(/^\.\//, '')}`;
        const index = imageList.findIndex((i) => i.src === resolved);
        return (
          <ZoomableImage
            src={resolved}
            alt={alt ?? ''}
            images={imageList}
            index={index >= 0 ? index : 0}
            {...rest}
          />
        );
      },
    }),
    [imageList, language],
  );

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-3">{t('help.loadError')}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        >
          {t('help.retry')}
        </button>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        {t('help.loadingDoc')}
      </div>
    );
  }

  return (
    <div className="prose prose-gray dark:prose-invert max-w-none p-6 eink:prose-headings:text-black! eink:prose-p:text-black! eink:prose-strong:text-black! eink:prose-li:text-black!">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
