import { useState, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useLanUrl } from '../../hooks/useLanUrl';
import { useQRCode } from '../../hooks/useQRCode';
import { generateSingleQrPdf } from '../../utils/qrPdf';
import { triggerPrint } from '../../utils/print';
import { useEscClose } from '../../hooks/useEscClose';
import { BsPrinter, BsFilePdf, BsCopy, BsCheckCircle } from 'react-icons/bs';

export type QRCodeModalMode = 'results' | 'scoring' | 'squads';

interface QRCodeModalProps {
  show: boolean;
  onClose: () => void;
  mode: QRCodeModalMode;
}

export default function QRCodeModal({ show, onClose, mode }: QRCodeModalProps) {
  const { domainUrls } = useLanUrl();
  const { t } = useTranslation();
  useEscClose(show ? onClose : undefined);

  const isResults = mode === 'results';
  const isSquads = mode === 'squads';
  const url = isResults ? (domainUrls?.results ?? '') : isSquads ? (domainUrls?.squads ?? '') : (domainUrls?.scoring ?? '');
  // On-screen label keeps the descriptive text; print/PDF uses the short name.
  const label = isResults ? t('header.qrResultsLabel') : isSquads ? t('header.qrSquadsLabel') : t('header.qrScoringLabel');
  const printLabel = isResults ? t('header.qrResultsLink') : isSquads ? t('header.qrSquadsLink') : t('header.qrScoringLink');
  const emoji = isResults ? '🏆' : isSquads ? '📋' : '🎯';

  const qr = useQRCode(url, { width: 512, margin: 2 });
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const handlePrint = useCallback(() => {
    triggerPrint();
  }, []);

  const handlePdf = useCallback(async () => {
    if (!qr || !url) return;
    try {
      const doc = await generateSingleQrPdf({
        url,
        qr,
        label: printLabel,
      });
      doc.save(`ipsc-score-${mode}-qr-code.pdf`);
    } catch (err) {
      console.error('Failed to generate QR PDF:', err);
    }
  }, [qr, url, label, mode]);

  return (
    <Modal show={show} onClose={onClose} size="xl" dismissible>
      <ModalHeader>{t('header.qrTitle')}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col items-center text-center">
          <div className="text-2xl mb-4 font-semibold dark:text-white">
            {emoji} {label}
          </div>
          <div className="bg-white p-3 rounded-xl shadow-lg">
            {qr ? (
              <img src={qr} alt={label} className="size-64 md:size-72" />
            ) : (
              <div className="size-64 md:size-72 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <code className="text-sm bg-gray-100 dark:text-white dark:bg-gray-800 px-3 py-1 rounded break-all max-w-xs">
              {url}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              title={t('header.copyUrl')}
            >
              {copied ? <BsCheckCircle className="size-5 text-green-500" /> : <BsCopy className="size-5" />}
            </button>
          </div>
        </div>

        {/* Print-only overlay */}
        <div className="hidden print:block fixed inset-0 z-9999 bg-white p-8">
          <div className="flex flex-col items-center justify-start h-full">
            <div className="flex flex-col items-center w-full">
              {qr && <img src={qr} alt={printLabel} className="w-full max-w-[180mm] h-auto" />}
              <p className="mt-8 text-5xl font-bold">
                {printLabel}
              </p>
              <p className="text-base text-gray-600 mt-4 break-all max-w-lg">{url}</p>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handlePrint}>
          <BsPrinter className="mr-2 size-5" />
          {t('header.printQrCode')}
        </Button>
        <Button color="purple" onClick={handlePdf} disabled={!qr}>
          <BsFilePdf className="mr-2 size-5" />
          {t('header.downloadQrPdf')}
        </Button>
        <Button color="gray" onClick={onClose}>
          {t('common.close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
