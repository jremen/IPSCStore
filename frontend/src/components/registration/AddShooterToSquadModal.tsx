import { useState, useMemo } from 'react';
import { Button, Modal, ModalHeader, ModalBody, TextInput, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useConstLabels } from '../../hooks/useConstLabels';
import { divisionLabel } from '../../utils/constants';
import { useEscClose } from '../../hooks/useEscClose';
import type { RegistrationWithShooter } from '../../types/scoring';

interface AddShooterToSquadModalProps {
  show: boolean;
  onClose: () => void;
  targetSquad: number;
  registrations: RegistrationWithShooter[];
  onAdd: (registrationId: string) => void;
}

export default function AddShooterToSquadModal({ show, onClose, targetSquad, registrations, onAdd }: AddShooterToSquadModalProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();
  const [query, setQuery] = useState('');

  // Filter: all shooters NOT already in this squad
  const available = useMemo(() => {
    return registrations.filter((r) => r.squad !== targetSquad);
  }, [registrations, targetSquad]);

  const filtered = useMemo(() => {
    if (!query) return available;
    const q = query.toLowerCase();
    return available.filter((r) => {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      return name.includes(q);
    });
  }, [available, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };
  useEscClose(handleClose);

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <ModalHeader>{t('squadding.addShooterTitle', { number: targetSquad })}</ModalHeader>
      <ModalBody>
        <TextInput
          placeholder={t('squadding.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-4"
        />
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {filtered.length > 0 ? (
            filtered.map((r) => (
              <Button
                key={r.id}
                size="xs"
                color="light"
                onClick={() => { onAdd(r.id); handleClose(); }}
                className="w-full text-left justify-start"
              >
                <div className="font-medium text-sm dark:text-white">
                  {r.first_name} {r.last_name}
                </div>
                <div className="flex gap-1 mt-0.5">
                  <Badge color="blue" size="sm">{divisionLabel(r.effective_division)}</Badge>
                  <Badge color="gray" size="sm">{categoryLabel(r.effective_category)}</Badge>
                  <Badge color={r.effective_power_factor === 'major' ? 'warning' : 'success'} size="sm">
                    {powerFactorLabel(r.effective_power_factor)}
                  </Badge>
                  {r.squad !== null && r.squad !== undefined && (
                    <Badge color="purple" size="sm">{t('squadding.squadN', { number: r.squad })}</Badge>
                  )}
                </div>
              </Button>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">{t('squadding.searchEmpty')}</p>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
