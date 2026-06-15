import { useState } from 'react';
import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import WinMSSImportModal from './WinMSSImportModal';
import { TbDatabaseImport } from "react-icons/tb";
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function WinMSSImport() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  useTabMenuAction('winmss-import', () => setShowModal(true));

  return (
    <>
      <Button size="sm" color="light" onClick={() => setShowModal(true)}>
        <TbDatabaseImport className="mr-2 size-4" />
        {t('import.winMss.button')}
      </Button>
      <WinMSSImportModal show={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
