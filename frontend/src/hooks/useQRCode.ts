import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

const cache = new Map<string, string>();

export function useQRCode(
  url: string | null | undefined,
  options: QRCodeOptions = {}
): string | null {
  const { width = 512, margin = 2, darkColor = '#000000', lightColor = '#ffffff' } = options;
  const cacheKey = `${url}|${width}|${margin}|${darkColor}|${lightColor}`;
  const [dataUrl, setDataUrl] = useState<string | null>(() => {
    if (!url) return null;
    return cache.get(cacheKey) ?? null;
  });

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }

    const cached = cache.get(cacheKey);
    if (cached) {
      setDataUrl(cached);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(url, {
      width,
      margin,
      color: { dark: darkColor, light: lightColor },
    }).then(result => {
      if (cancelled) return;
      cache.set(cacheKey, result);
      setDataUrl(result);
    }).catch(() => {
      if (!cancelled) setDataUrl(null);
    });

    return () => {
      cancelled = true;
    };
  }, [url, width, margin, darkColor, lightColor]);

  return dataUrl;
}
