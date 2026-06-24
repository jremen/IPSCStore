import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, Select } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useQRCode } from '../../hooks/useQRCode';
import { useEscClose } from '../../hooks/useEscClose';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { BsArrowLeft, BsArrowRight, BsCopy, BsCheckCircle, BsTrash } from 'react-icons/bs';
import useStageLinkModal, { MintedToken } from "../../hooks/useStageLinkModal";

export interface StageLinkModalProps {
  show: boolean;
  onClose: () => void;
  activeMatchId?: string | null;
}

export default function StageLinkModal({ show, onClose }: StageLinkModalProps) {
  const { t } = useTranslation();
  const { activeMatchId } = useUIStore();
  useEscClose(show ? onClose : undefined);

  const {
      currentMinted,
      stages,
      mintedTokens,
      handleGenerate,
      handleGenerateAll,
      handleRevokeAll,
      selectedStageId,
      setSelectedStageId,
      loading,
      ttl,
      setTtl,
      navigatePrev,
      navigateNext,
      handleClose
    } = useStageLinkModal({show, onClose, activeMatchId});

  return (
    <Modal show={show} onClose={handleClose} size="4xl" dismissible>
      <ModalHeader>{t('auth.tokenTitle')}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('auth.tokenDescription')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left column: TTL + stage list */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">{t('auth.tokenTtl')}:</Label>
                <Select
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  className="w-25"                  
                >
                  <option value={1 * 60 * 60}>1 {t('auth.tokenHour')}</option>
                  <option value={4 * 60 * 60}>4 {t('auth.tokenHours')}</option>
                  <option value={5 * 60 * 60}>5 {t('auth.tokenHours')}</option>
                  <option value={8 * 60 * 60}>8 {t('auth.tokenHours')}</option>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-4 text-gray-500">{t('common.loading')}</div>
              ) : stages.length === 0 ? (
                <div className="text-center py-4 text-gray-500">{t('auth.tokenNoStages')}</div>
              ) : (
                <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                  {stages.map((stage) => {
                    const minted = mintedTokens.find(t => t.stageId === stage.id);
                    const isSelected = selectedStageId === stage.id;
                    return (
                      <div
                        key={stage.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700'
                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex-1 dark:text-white min-w-0" onClick={() => {
                          if (minted) setSelectedStageId(stage.id);
                        }}>
                          <span className="font-medium text-sm truncate block">
                            {t('scoring.stage', { number: stage.stageNumber })}: {stage.name}
                          </span>
                          {minted && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {t('auth.tokenActive')}
                            </span>
                          )}
                        </div>
                        <Button
                          size="xs"
                          color={minted ? 'gray' : 'blue'}
                          onClick={() => handleGenerate(stage.id)}
                          className="ml-2 shrink-0"
                        >
                          {minted ? t('auth.tokenRegenerate') : t('auth.tokenGenerate')}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {stages.length > 1 && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" color="blue" onClick={handleGenerateAll}>
                    {t('auth.tokenGenerateAll')}
                  </Button>
                  {mintedTokens.length > 0 && (
                    <Button size="sm" color="red" onClick={handleRevokeAll}>
                      <BsTrash className="mr-1" />
                      {t('auth.tokenRevokeAll')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Right column: QR preview */}
            <div className="md:col-span-7">
              {currentMinted ? (
                <SelectedStageQr
                  minted={currentMinted}
                  mintedTokens={mintedTokens}
                  onPrev={navigatePrev}
                  onNext={navigateNext}
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-75 text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed rounded-lg">
                  {t('auth.tokenSelectStage')}
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>
          {t('common.close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function SelectedStageQr({ minted, mintedTokens, onPrev, onNext }: {
  minted: MintedToken;
  mintedTokens: MintedToken[];
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const qr = useQRCode(minted.url, { width: 512, margin: 2 });
  const [copied, setCopied] = useState(false);

  const currentIndex = mintedTokens.findIndex(t => t.stageId === minted.stageId);
  const hasMultiple = mintedTokens.length > 1;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(minted.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = minted.url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [minted.url]);

  return (
    <div className="p-4 border rounded-lg dark:border-gray-600 h-full flex flex-col">
      {/* Header with prev/next arrows and stage title */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <Button
          size="xs"
          color="gray"
          onClick={onPrev}
          disabled={!hasMultiple}
        >
          <BsArrowLeft className="mr-1" />
          {t('common.prev')}
        </Button>
        <div className="text-center dark:text-white flex-1 min-w-0">
          <h3 className="font-semibold truncate">
            {t('scoring.stage', { number: minted.stageNumber })}: {minted.stageName}
          </h3>
          {hasMultiple && (
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">
              {currentIndex + 1} / {mintedTokens.length}
            </p>
          )}
        </div>
        <Button
          size="xs"
          color="gray"
          onClick={onNext}
          disabled={!hasMultiple}
        >
          {t('common.next')}
          <BsArrowRight className="ml-1" />
        </Button>
      </div>

      {/* QR code */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white p-3 rounded-xl shadow-lg inline-block">
          {qr ? (
            <img src={qr} alt="QR" className="w-56 h-56 md:w-72 md:h-72" />
          ) : (
            <div className="w-56 h-56 md:w-72 md:h-72 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
          )}
        </div>
      </div>

      {/* URL + copy button */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <code className="text-xs bg-gray-100 dark:text-white dark:bg-gray-800 px-2 py-1 rounded break-all max-w-md">
          {minted.url}
        </code>
        <button
          onClick={handleCopy}
          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
          title={t('header.copyUrl')}
        >
          {copied ? <BsCheckCircle className="size-4 text-green-500" /> : <BsCopy className="size-4" />}
        </button>
      </div>

      {/* Expiry */}
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-2 text-center">
        {t('auth.tokenExpiresAt')} {new Date(minted.expiresAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
