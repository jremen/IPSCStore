import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, TextInput, Button, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { isOnlineSync } from '../../services/connectivity';
import LanguageSelector from '../settings/LanguageSelector';

export default function StageLoginPage() {
  const { loginWithTrustToken, autoLogin, loading, error, isLocalNetwork } = useAuthStore();
  const { t } = useTranslation();
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore — iOS Safari standalone
      (window.navigator.standalone === true);
  }, []);

  const isOffline = !isOnlineSync();

  // Auto-redeem ?trustToken=... from URL query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trustToken = params.get('trustToken');
    if (!trustToken) return;

    (async () => {
      const ok = await loginWithTrustToken(trustToken);
      if (ok) {
        // Don't strip ?trustToken= — keep it visible so user can copy/paste if needed
      }
    })();
  }, [loginWithTrustToken]);

  // Check for existing cookie-based session on mount (PWA flow: user scanned in Safari, now opens PWA)
  useEffect(() => {
    const sessionToken = localStorage.getItem('auth_scorer_token');
    if (sessionToken) return;
    if (autoLoginAttempted) return;
    setAutoLoginAttempted(true);
    autoLogin();
  }, [autoLogin, autoLoginAttempted]);

  const handlePasteSubmit = useCallback(async () => {
    let raw = pastedUrl.trim();
    if (!raw) {
      setPasteError(t('auth.trustPasteInvalid'));
      return;
    }
    // iOS Safari may copy URLs without the http:// protocol prefix
    if (!/^https?:\/\//i.test(raw)) {
      raw = 'http://' + raw;
    }
    try {
      const url = new URL(raw);
      const token = url.searchParams.get('trustToken');
      if (!token) {
        setPasteError(t('auth.trustPasteNoToken'));
        return;
      }
      setPasteError('');
      await loginWithTrustToken(token);
    } catch {
      setPasteError(t('auth.trustPasteInvalid'));
    }
  }, [pastedUrl, loginWithTrustToken, t]);

  const handleCheckLogin = useCallback(async () => {
    await autoLogin();
  }, [autoLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {t('auth.trustTitle')}
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
          {t('auth.trustSubtitle')}
        </p>

        {error && (
          <Alert color="failure" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Offline + not PWA → guide user to open the installed app */}
        {isOffline && !isStandalone && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              {t('auth.offlineNoDataTitle')}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t('auth.offlineNoDataHint')}
            </p>
          </div>
        )}

        {/* iOS-specific instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📱 {t('auth.trustIosNote')}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>{t('auth.trustStep1')}</li>
            <li>{t('auth.trustStep2Ios')}</li>
            <li>{t('auth.trustStep3Ios')}</li>
          </ol>
        </div>

        {/* Primary action: I've scanned the QR code */}
        <Button
          color="blue"
          className="w-full mb-2"
          onClick={handleCheckLogin}
          disabled={loading}
        >
          {loading ? t('auth.connecting') : t('auth.trustCheckButton')}
        </Button>

        {/* Secondary action: paste link */}
        <Button
          color="gray"
          size="sm"
          className="w-full"
          onClick={() => { setPasteMode(!pasteMode); setPasteError(''); }}
        >
          {pasteMode ? t('common.cancel') : t('auth.trustPasteToggle')}
        </Button>

        {pasteMode && (
          <div className="mt-4 space-y-2">
            <TextInput
              type="url"
              placeholder={t('auth.trustPastePlaceholder')}
              value={pastedUrl}
              onChange={(e) => { setPastedUrl(e.target.value); setPasteError(''); }}
            />
            {pasteError && (
              <Alert color="failure" className="text-sm py-2">
                {pasteError}
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={handlePasteSubmit}
              disabled={!pastedUrl.trim() || loading}
            >
              {t('common.submit')}
            </Button>
          </div>
        )}

        {isLocalNetwork && (
          <div className="text-center mt-4">
            {isStandalone ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                🔒 {t('auth.adminNote')}
              </p>
            ) : (
              <a href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                🔒 {t('auth.adminLogin')}
              </a>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
