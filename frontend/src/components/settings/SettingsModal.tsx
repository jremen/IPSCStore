import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import DatabaseSettings from './DatabaseSettings';
import AdminPasswordSection from './AdminPasswordSection';
import { useEscClose } from '../../hooks/useEscClose';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

export default function SettingsModal({ show, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  useEscClose(onClose);

  return (
    <Modal show={show} onClose={onClose} size="7xl">
      <ModalHeader>{t('settings.title')}</ModalHeader>
      <ModalBody>
        <div className="lg:grid grid-cols-2 gap-12">
          <div>
            <h3 className="text-lg font-semibold dark:text-white mb-2">{t('settings.language')}</h3>
            <LanguageSelector />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <AdminPasswordSection />
            </div>
          </div>
          
            <DatabaseSettings />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}
