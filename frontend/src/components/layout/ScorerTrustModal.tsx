import { useState, useEffect, useCallback } from 'react';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, ToggleSwitch } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useQRCode } from '../../hooks/useQRCode';
import { useEscClose } from '../../hooks/useEscClose';
import { useLanUrl } from '../../hooks/useLanUrl';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { connectToEventStream } from '../../services/sse';
import { BsCopy, BsCheckCircle, BsXCircle, BsTrash } from 'react-icons/bs';

export interface ScorerTrustModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ScorerTrustModal({ show, onClose }: ScorerTrustModalProps) {
  const { t } = useTranslation();
  const adminToken = useAuthStore((s) => s.adminToken);
  const { domainUrls } = useLanUrl();
  const [trustToken, setTrustToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [deviceMode, setDeviceMode] = useState<'silent' | 'pending'>('pending');
  const [settingMode, setSettingMode] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<number | null>(null);

  useEscClose(show ? onClose : undefined);

  const fetchAll = useCallback(async (initial = false) => {
    if (!adminToken) return;
    if (initial) setLoading(true);
    setError(null);
    try {
      const [info, sess, modeRes] = await Promise.all([
        api.auth.getScorerTrustInfo(adminToken),
        api.auth.getActiveScorerSessions(adminToken),
        api.auth.getScorerDeviceMode(adminToken),
      ]);
      if (info.error) {
        setError(info.error);
      } else {
        setTrustToken(info.trustToken);
        if (!info.trustToken) {
          setError(t('auth.trustNoTokenYet'));
        }
      }
      setSessions(sess);
      if (modeRes.mode) setDeviceMode(modeRes.mode as 'silent' | 'pending');
    } catch (err: any) {
      setError(err?.message || t('auth.trustLoadError'));
    }
    if (initial) setLoading(false);
  }, [adminToken, t]);

  useEffect(() => {
    if (!show) return;
    fetchAll(true);
    const sse = connectToEventStream(null);
    const refresh = () => fetchAll();
    const unsubs = [
      sse.subscribe('scorer:session:created', refresh),
      sse.subscribe('scorer:session:approved', refresh),
      sse.subscribe('scorer:session:revoked', refresh),
      sse.subscribe('scorer:session:rotated', refresh),
      sse.subscribe('scorer:device:mode-changed', refresh),
    ];
    return () => {
      unsubs.forEach((u) => u());
      sse.close();
    };
  }, [show, fetchAll]);

  const handleModeToggle = async () => {
    if (!adminToken) return;
    const newMode = deviceMode === 'silent' ? 'pending' : 'silent';
    setSettingMode(true);
    try {
      await api.auth.setScorerDeviceMode(adminToken, newMode);
      setDeviceMode(newMode);
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
    setSettingMode(false);
  };

  // Build QR URL: ${origin}/scoring?trustToken=${token}
  const qrUrl = trustToken && domainUrls?.scoring
    ? `${domainUrls.scoring}?trustToken=${trustToken}`
    : null;
  const qr = useQRCode(qrUrl, { width: 512, margin: 2 });

  const handleRotate = async () => {
    if (!adminToken) return;
    if (!confirm(t('auth.trustRotateConfirm'))) return;
    setRotating(true);
    setError(null);
    try {
      const result = await api.auth.rotateScorerTrust(adminToken);
      if (result.error) {
        setError(result.error);
      } else {
        setTrustToken(result.trustToken);
        setSessions([]);
      }
    } catch (err: any) {
      setError(err?.message || t('auth.trustRotateError'));
    }
    setRotating(false);
  };

  const handleApprove = async (sessionId: string) => {
    if (!adminToken) return;
    try {
      await api.auth.approveScorerSession(adminToken, sessionId);
      await fetchAll();
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
  };

  const handleRevoke = async (sessionId: string, deviceLabel: string | null) => {
    if (!adminToken) return;
    if (!confirm(t('auth.trustRevokeConfirm', { device: deviceLabel || t('auth.trustUnknownDevice') }))) return;
    try {
      await api.auth.revokeScorerSession(adminToken, sessionId);
      await fetchAll();
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!adminToken) return;
    setCleaningUp(true);
    setCleanupResult(null);
    try {
      const result = await api.auth.cleanupDuplicateScorerSessions(adminToken);
      if (result.error) {
        setError(result.error);
      } else {
        setCleanupResult(result.deleted);
        await fetchAll();
      }
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
    setCleaningUp(false);
  };

  const handleCopyUrl = useCallback(async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = qrUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [qrUrl]);

  const pendingSessions = sessions.filter((s: any) => !s.approved_at);
  const activeSessions = sessions.filter((s: any) => s.approved_at);

  return (
    <Modal show={show} onClose={onClose} size="5xl" dismissible>
      <ModalHeader>{t('auth.trustTitle')}</ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
        ) : (
          <div className="lg:flex gap-8">
            <div className="lg:w-1/2 space-y-4">

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.trustDescription')}
              </p>

              {error && (
                <Alert color="failure">
                  {error}
                </Alert>
              )}

              {/* Device approval mode toggle */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('auth.trustDeviceModeLabel')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {deviceMode === 'silent' ? t('auth.trustDeviceModeSilent') : t('auth.trustDeviceModePending')}
                  </p>
                </div>
                <ToggleSwitch
                  checked={deviceMode === 'pending'}
                  onChange={handleModeToggle}
                  disabled={settingMode}
                  label=""
                />
              </div>

              {/* QR code */}
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl shadow-lg inline-block">
                  {qr ? (
                    <img src={qr} alt="QR" className="size-64 md:size-72" />
                  ) : (
                    <div className="size-64 md:size-72 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
                  )}
                </div>
              </div>

              {/* URL + copy button */}
              <div className="flex items-center justify-center gap-2">
                <code className="text-xs bg-gray-100 dark:text-white dark:bg-gray-800 px-2 py-1 rounded break-all max-w-md">
                  {qrUrl}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                  title={t('header.copyUrl')}
                >
                  {copied ? <BsCheckCircle className="size-4 text-green-500" /> : <BsCopy className="size-4" />}
                </button>
              </div>
            </div>

            {/* Active sessions */}
            <div className="dark:text-white max-lg:mt-4 lg:w-1/2">
              <h3 className="text-lg font-medium mb-4">
                {t('auth.trustActiveSessions')} ({sessions.length})
              </h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="text-xs text-gray-500">{t('auth.trustNoSessions')}</p>
                ) : (
                  <>
                    {/* Pending first */}
                    {pendingSessions.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 px-1">
                          {t('auth.trustPending')} ({pendingSessions.length})
                        </p>
                        {pendingSessions.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                            <div className="flex flex-col min-w-0">
                              <span className="dark:text-white truncate">{s.device_label || t('auth.trustUnknownDevice')}</span>
                              {s.device_id && <span className="text-gray-400 text-base font-mono">{t('auth.trustDeviceId')}:&nbsp;{s.device_id.slice(0, 8)}…</span>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="xs" color="blue" onClick={() => handleApprove(s.id)}>
                                {t('auth.trustApprove')}
                              </Button>
                              <Button size="xs" color="red" onClick={() => handleRevoke(s.id, s.device_label)}>
                                <BsXCircle className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Active sessions */}
                    {activeSessions.length > 0 && (
                      <div className="space-y-1">
                        {activeSessions.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <div className="flex flex-col min-w-0">
                              <span className="dark:text-white truncate">{s.device_label || t('auth.trustUnknownDevice')}</span>
                              {s.device_id && <span className="text-gray-400 text-base font-mono">{t('auth.trustDeviceId')}:&nbsp;{s.device_id.slice(0, 8)}…</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-gray-500">{new Date(s.last_used_at).toLocaleString()}</span>
                              <Button size="xs" color="red" onClick={() => handleRevoke(s.id, s.device_label)}>
                                <BsXCircle className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Clean up duplicates */}
                    {sessions.length > 1 && (
                      <div className="pt-2 flex items-center gap-2">
                        <Button size="xs" color="gray" onClick={handleCleanupDuplicates} disabled={cleaningUp}>
                          <BsTrash className="size-3 mr-1" />
                          {cleaningUp ? t('common.loading') : t('auth.trustCleanupDuplicates')}
                        </Button>
                        {cleanupResult !== null && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {t('auth.trustCleanupResult', { count: cleanupResult })}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="flex justify-between">
        <Button color="red" onClick={handleRotate} disabled={rotating}>
          {rotating ? t('common.loading') : t('auth.trustRotate')}
        </Button>
        <Button color="gray" onClick={onClose}>
          {t('common.close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
