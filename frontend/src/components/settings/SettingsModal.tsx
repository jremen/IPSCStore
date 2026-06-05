import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import DatabaseSettings from './DatabaseSettings';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

export default function SettingsModal({ show, onClose }: SettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>{t('settings.title')}</ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold dark:text-white mb-2">{t('settings.language')}</h3>
            <LanguageSelector />
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <DatabaseSettings />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}
