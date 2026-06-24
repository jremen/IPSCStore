import { useRef, useState, useEffect, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useEscClose } from '../../hooks/useEscClose';
import { BsCamera, BsX } from 'react-icons/bs';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser/esm/common/IScannerControls';

interface QRScannerProps {
  show: boolean;
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

type ScannerState = 'idle' | 'scanning' | 'permission-denied' | 'no-camera' | 'error';

export default function QRScanner({ show, onScan, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [state, setState] = useState<ScannerState>('idle');

  useEscClose(show ? onClose : undefined);

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current = undefined as any;
      readerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;

    // Check camera permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      setState('permission-denied');
      return;
    }

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      setState('scanning');
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error, ctrls) => {
          if (result) {
            ctrls.stop();
            controlsRef.current = null;
            onScan(result.getText());
            onClose();
          }
        }
      );
      controlsRef.current = controls;
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setState('permission-denied');
      } else if (err?.name === 'NotFoundError') {
        setState('no-camera');
      } else {
        setState('error');
      }
    }
  }, [onScan, onClose]);

  useEffect(() => {
    if (show && state === 'idle') {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [show, state, startScanner, stopScanner]);

  useEffect(() => {
    if (!show) {
      setState('idle');
      stopScanner();
    }
  }, [show, stopScanner]);

  const handleRetry = useCallback(() => {
    stopScanner();
    setState('idle');
    setTimeout(() => startScanner(), 100);
  }, [stopScanner, startScanner]);

  return (
    <Modal show={show} onClose={onClose} size="sm" dismissible>
      <ModalHeader>{t('auth.scanQr')}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {state === 'scanning' && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-black"
                style={{ aspectRatio: '1/1', objectFit: 'cover' }}
                autoPlay
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/50 rounded-xl" />
              </div>
              <p className="text-sm text-center text-gray-500 mt-2">
                {t('auth.scanQrHint')}
              </p>
            </div>
          )}

          {state === 'permission-denied' && (
            <div className="text-center py-8">
              <BsCamera className="size-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {t('auth.scanQrPermissionDenied')}
              </p>
              <Button size="sm" color="gray" onClick={handleRetry}>
                {t('auth.scanQrRetry')}
              </Button>
            </div>
          )}

          {state === 'no-camera' && (
            <div className="text-center py-8">
              <BsCamera className="size-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-300">
                {t('auth.scanQrNoCamera')}
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-8">
              <BsX className="size-12 mx-auto mb-4 text-red-400" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {t('auth.scanQrError')}
              </p>
              <Button size="sm" color="gray" onClick={handleRetry}>
                {t('auth.scanQrRetry')}
              </Button>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>
          {t('auth.scanQrCancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
