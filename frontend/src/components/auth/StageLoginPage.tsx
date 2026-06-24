import { useState, useEffect, useCallback } from 'react';
import { Card, Select, TextInput, Button, Label, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import * as offlineDB from '../../services/offlineDB';
import LanguageSelector from '../settings/LanguageSelector';
import QRScanner from './QRScanner';
import CertTrustInstructions, { useCertTrustBanner } from './CertTrustInstructions';

export default function StageLoginPage() {
  const { login, loginWithToken, loading, error } = useAuthStore();
  const { t } = useTranslation();
  const [stageId, setStageId] = useState('');
  const [password, setPassword] = useState('');
  const [stages, setStages] = useState<Array<{ id: string; name: string; stageNumber: number; matchName: string }>>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'redeeming' | 'error'>('idle');
  const [showScanner, setShowScanner] = useState(false);
  const [showCertInstructions, setShowCertInstructions] = useState(false);

  const { showBanner: showCertBanner, dismiss: dismissCertBanner, isIOS } = useCertTrustBanner();

  // Auto-redeem stageToken from URL query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stageToken = params.get('stageToken');
    if (!stageToken) return;

    setTokenStatus('redeeming');
    (async () => {
      try {
        const result = await api.auth.redeemStageLinkToken(stageToken);
        window.history.replaceState({}, '', window.location.pathname);

        const success = await loginWithToken(
          result.stageId,
          result.stageName,
          result.matchId,
          result.sessionToken
        );
        if (!success) {
          setTokenStatus('error');
        }
      } catch {
        window.history.replaceState({}, '', window.location.pathname);
        setTokenStatus('error');
      }
    })();
  }, [loginWithToken]);

  // Fetch stages
  useEffect(() => {
    async function fetchStages() {
      try {
        const result = await api.auth.getStages();
        setStages(result);
      } catch (err: any) {
        try {
          const allStages = await offlineDB.getCachedMatches().then(async (matches) => {
            const allStages: Array<{ id: string; name: string; stageNumber: number; matchName: string }> = [];
            for (const match of matches) {
              const matchStages = await offlineDB.getCachedStages(match.id);
              for (const s of matchStages) {
                allStages.push({
                  id: s.id,
                  name: s.name,
                  stageNumber: s.stage_number,
                  matchName: match.name,
                });
              }
            }
            return allStages;
          });
          if (allStages.length > 0) {
            setStages(allStages);
            setFetchError(null);
          } else {
            setFetchError(err.message);
          }
        } catch {
          setFetchError(err.message);
        }
      }
    }
    fetchStages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageId || !password) return;
    await login(stageId, password);
  };

  const handleScanResult = useCallback(async (decodedText: string) => {
    // Parse the QR code — it should be a URL with ?stageToken=...
    try {
      const url = new URL(decodedText);
      const token = url.searchParams.get('stageToken');
      if (token) {
        setTokenStatus('redeeming');
        const result = await api.auth.redeemStageLinkToken(token);
        const success = await loginWithToken(
          result.stageId,
          result.stageName,
          result.matchId,
          result.sessionToken
        );
        if (!success) {
          setTokenStatus('error');
        }
      } else {
        setTokenStatus('error');
      }
    } catch {
      setTokenStatus('error');
    }
  }, [loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {t('auth.title')}
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
          {t('auth.subtitle')}
        </p>

        {/* HTTPS trust banner */}
        {showCertBanner && (
          <Alert color="info" className="mb-4">
            <span>{t('auth.httpsTrustBanner')}</span>
            <button
              onClick={() => { dismissCertBanner(); setShowCertInstructions(true); }}
              className="underline text-blue-600 dark:text-blue-400 ml-1"
            >
              {t('auth.httpsTrustBannerLink')}
            </button>
          </Alert>
        )}

        {(error || fetchError || tokenStatus === 'error') && (
          <Alert color="failure" className="mb-4">
            {tokenStatus === 'error'
              ? t('auth.tokenExpired')
              : error || fetchError ? t(error || fetchError || 'auth.incorrectPassword') : ''}
          </Alert>
        )}

        {tokenStatus === 'redeeming' && (
          <Alert color="info" className="mb-4">
            {t('auth.tokenRedeeming')}
          </Alert>
        )}

        {stages.length === 0 && !fetchError && (
          <Alert color="info" className="mb-4">
            {t('auth.noStages')}
          </Alert>
        )}

        {/* QR Scanner button */}
        <Button
          color="purple"
          className="w-full"
          onClick={() => setShowScanner(true)}
          disabled={loading}
        >
          {t('auth.scanQr')}
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">{t('auth.orDivider')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="stage-select" className="mb-1 block">{t('auth.stage')}</Label>
            <Select
              id="stage-select"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              required
            >
              <option value="">{t('auth.selectStage')}</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {t('scoring.stage', { number: s.stageNumber })}: {s.name} ({s.matchName})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="password" className="mb-1 block">{t('auth.password')}</Label>
            <TextInput
              id="password"
              type="password"
              placeholder={t('auth.enterPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !stageId || !password}
          >
            {loading ? t('auth.connecting') : t('auth.enterStage')}
          </Button>
        </form>
      </Card>

      {/* QR Scanner Modal */}
      <QRScanner
        show={showScanner}
        onScan={handleScanResult}
        onClose={() => setShowScanner(false)}
      />

      {/* Certificate Trust Instructions Modal */}
      <CertTrustInstructions
        show={showCertInstructions}
        onClose={() => setShowCertInstructions(false)}
      />
    </div>
  );
}
