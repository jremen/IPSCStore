import { useState, useEffect } from 'react';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generate a QR code PNG data URL for the given target URL.
 * The qrcode library is imported dynamically so it is only loaded when needed.
 */
export function useQRCode(
  url: string | null | undefined,
  options: QRCodeOptions = {}
): string | null {
  const { width = 512, margin = 2, darkColor = '#000000', lightColor = '#ffffff' } = options;
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }

    let cancelled = false;

    import('qrcode')
      .then((QRCode) => {
        if (cancelled) return;
        return QRCode.toDataURL(url, {
          width,
          margin,
          color: { dark: darkColor, light: lightColor },
        });
      })
      .then((result) => {
        if (cancelled || result === undefined) return;
        setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [url, width, margin, darkColor, lightColor]);

  return dataUrl;
}
