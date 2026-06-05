import { useState } from 'react';
import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import CSVImportModal from './CSVImportModal';
import { TbFileImport } from "react-icons/tb";

interface Props {
  type: 'shooters' | 'registrations' | 'scores';
  matchId?: string;
}

export default function CSVImportExport({ type, matchId }: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  const label = type === 'shooters' ? t('import.importShooters') : type === 'registrations' ? t('import.importRegistrations') : t('import.importScores');

  return (
    <>
      <Button size="sm" color="light" onClick={() => setShow(true)}><TbFileImport className="mr-2 size-4" />{label}</Button>
      <CSVImportModal show={show} onClose={() => setShow(false)} type={type} matchId={matchId} />
    </>
  );
}
