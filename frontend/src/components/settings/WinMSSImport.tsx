import { useState } from 'react';
import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import WinMSSImportModal from './WinMSSImportModal';

export default function WinMSSImport() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button size="sm" color="purple" onClick={() => setShowModal(true)}>
        {t('import.winMss.button')}
      </Button>
      <WinMSSImportModal show={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}