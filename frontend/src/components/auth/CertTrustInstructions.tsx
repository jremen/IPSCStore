import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useEscClose } from '../../hooks/useEscClose';

const DISMISS_KEY = 'https_trust_dismissed';

interface CertTrustInstructionsProps {
  show: boolean;
  onClose: () => void;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function useCertTrustBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show on HTTPS and not previously dismissed
    if (window.location.protocol === 'https:' && !localStorage.getItem(DISMISS_KEY)) {
      setShowBanner(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setShowBanner(false);
  };

  return { showBanner, dismiss, isIOS: isIOS() };
}

export default function CertTrustInstructions({ show, onClose }: CertTrustInstructionsProps) {
  const { t } = useTranslation();
  useEscClose(show ? onClose : undefined);

  const ios = isIOS();

  return (
    <Modal show={show} onClose={onClose} size="md" dismissible>
      <ModalHeader>{t('auth.httpsTrustTitle')}</ModalHeader>
      <ModalBody>
        <div className="space-y-4 text-sm">
          {ios ? (
            <>
              <p className="text-gray-600 dark:text-gray-300">{t('auth.httpsTrustIosDesc')}</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-200">
                <li>{t('auth.httpsTrustIosStep1')}</li>
                <li>{t('auth.httpsTrustIosStep2')}</li>
                <li>{t('auth.httpsTrustIosStep3')}</li>
                <li>{t('auth.httpsTrustIosStep4')}</li>
                <li>{t('auth.httpsTrustIosStep5')}</li>
              </ol>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-300">{t('auth.httpsTrustAndroidDesc')}</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-200">
                <li>{t('auth.httpsTrustAndroidStep1')}</li>
                <li>{t('auth.httpsTrustAndroidStep2')}</li>
                <li>{t('auth.httpsTrustAndroidStep3')}</li>
                <li>{t('auth.httpsTrustAndroidStep4')}</li>
              </ol>
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>
          {t('common.close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
