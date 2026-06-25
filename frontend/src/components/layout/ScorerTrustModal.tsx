import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useQRCode } from '../../hooks/useQRCode';
import { useEscClose } from '../../hooks/useEscClose';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { BsCopy, BsCheckCircle } from 'react-icons/bs';

export interface ScorerTrustModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ScorerTrustModal({ show, onClose }: ScorerTrustModalProps) {
  const { t } = useTranslation();
  const { adminToken } = useAuthStore();
  const [trustToken, setTrustToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(false);

  useEscClose(show ? onClose : undefined);

  // Fetch current trust info on open
  useEffect(() => {
    if (!show || !adminToken) return;
    (async () => {
      setLoading(true);
      try {
        const info = await api.auth.getScorerTrustInfo(adminToken);
        setTrustToken(info.trustToken);
        const sess = await api.auth.getActiveScorerSessions(adminToken);
        setSessions(sess);
      } catch {
        // Failed to fetch trust info
      }
      setLoading(false);
    })();
  }, [show, adminToken]);

  // Build QR URL: ${origin}/hodnotenie?trustToken=${token}
  // Always points to /hodnotenie (the scorer page), regardless of which page the admin is on.
  // When scanned by iPhone camera, opens Safari at /hodnotenie with ?trustToken=... auto-redeemed.
  const qrUrl = trustToken
    ? `${window.location.origin}/hodnotenie?trustToken=${trustToken}`
    : null;
  const qr = useQRCode(qrUrl, { width: 512, margin: 2 });

  const handleRotate = async () => {
    if (!adminToken) return;
    if (!confirm(t('auth.trustRotateConfirm'))) return;
    setRotating(true);
    try {
      const result = await api.auth.rotateScorerTrust(adminToken);
      setTrustToken(result.trustToken);
      setSessions([]);
    } catch (err) {
      console.error('Failed to rotate trust token:', err);
    }
    setRotating(false);
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

  return (
    <Modal show={show} onClose={onClose} size="xl" dismissible>
      <ModalHeader>{t('auth.trustTitle')}</ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.trustDescription')}
            </p>

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

            {/* Active sessions */}
            <div>
              <Button
                size="xs"
                color="gray"
                onClick={() => setShowSessions(!showSessions)}
                className="mb-2"
              >
                {t('auth.trustActiveSessions')} ({sessions.length})
              </Button>
              {showSessions && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-gray-500">{t('auth.trustNoSessions')}</p>
                  ) : (
                    sessions.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <span className="dark:text-white">{s.device_label || t('auth.trustUnknownDevice')}</span>
                        <span className="text-gray-500">{new Date(s.last_used_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
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
