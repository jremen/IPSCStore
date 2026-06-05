import { useState } from 'react';
import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import CSVImportModal from './CSVImportModal';

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
      <Button size="xs" color="blue" onClick={() => setShow(true)}>{label}</Button>
      <CSVImportModal show={show} onClose={() => setShow(false)} type={type} matchId={matchId} />
    </>
  );
}