import { useState, useCallback, useMemo, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Modal, ModalHeader, ModalBody, TextInput, ModalFooter, Button, theme } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useEscClose } from '../../hooks/useEscClose';
import { useSquadding } from '../../hooks/useSquadding';
import { api } from '../../services/api';
import SquadColumn from './SquadColumn';
import ShooterCard from './ShooterCard';
import AddShooterToSquadModal from './AddShooterToSquadModal';
import type { RegistrationWithShooter } from '../../types/scoring';
import { twMerge } from "tailwind-merge";
import { seedGroupColors } from '../../utils/groupColors';
import { generateSquaddingPdf } from '../../utils/squaddingPdf';

interface SquaddingModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  onUpdated?: () => void;
}

export default function SquaddingModal({ show, onClose, matchId, onUpdated }: SquaddingModalProps) {
  const { t } = useTranslation();
  const {
    registrations,
    columns,
    unassigned,
    squadCount,
    effectiveSquadCount,
    moveShooter,
    assignShooterToSquad,
    addSquad,
    flushPending,
    refresh,
    query,
    setQuery,
    totalShooterCount,
  } = useSquadding(show ? matchId : null);

  const [activeRegistration, setActiveRegistration] = useState<RegistrationWithShooter | null>(null);
  const [addShooterSquad, setAddShooterSquad] = useState<number | null>(null);

  useEffect(() => {
    seedGroupColors(registrations.map((r) => r.group_id));
  }, [registrations]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleClose = useCallback(async () => {
    setQuery('');
    await flushPending();
    onUpdated?.();
    onClose();
  }, [setQuery, flushPending, onUpdated, onClose]);
  useEscClose(handleClose);

  const handleDragStart = useCallback((event: any) => {
    const { active } = event;
    const reg = active?.data?.current?.registration as RegistrationWithShooter | undefined;
    if (reg) setActiveRegistration(reg);
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    setActiveRegistration(null);

    if (!over) return;
    const shooterId = active?.data?.current?.registration?.shooter_id as string | undefined;
    if (!shooterId) return;

    const overId = over.id as string;
    if (overId.startsWith('squad-')) {
      const squad = parseInt(overId.replace('squad-', ''), 10);
      if (!isNaN(squad)) moveShooter(shooterId, squad);
    }
  }, [moveShooter]);

  const handleAddShooter = useCallback((registrationId: string) => {
    if (addShooterSquad === null) return;
    assignShooterToSquad(registrationId, addShooterSquad);
  }, [addShooterSquad, assignShooterToSquad]);

  const handleRemoveFromGroup = useCallback(async (registrationId: string) => {
    if (!matchId) return;
    await api.ungroupRegistration(matchId, registrationId);
    refresh();
  }, [matchId, refresh]);

  const handleGeneratePdf = useCallback(async () => {
    const orderedSquadNumbers = Object.keys(columns)
      .map(Number)
      .sort((a, b) => a - b);

    const matchInfo = await api.getMatch(matchId);
    const matchName = matchInfo.name || 'Squadding';
    const matchDate = matchInfo.date ? new Date(matchInfo.date).toLocaleDateString() : '';

    const doc = await generateSquaddingPdf({
      matchName,
      matchDate,
      columns,
      orderedSquadNumbers,
    });

    const blob = doc.output('blob');
    const baseName = matchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const defaultName = `${baseName}_squadding.pdf`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
  }, [columns, matchId]);

  const showUnassigned = unassigned.length > 0;

  const filteredUnassigned = useMemo(() => {
    if (!query) return unassigned;
    const q = query.toLowerCase();
    return unassigned.filter((r) => {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      return name.includes(q);
    });
  }, [unassigned, query]);

  return (
    <>
      <Modal show={show} onClose={handleClose} size="full" theme={{content: {inner: twMerge(theme.modal.content.inner, "min-h-[70vh]")}}}>
        <ModalHeader>
          <span className="flex items-baseline gap-3">
            <span className="text-xl font-semibold text-gray-900 dark:text-white">{t('squadding.title')}</span>
            <span className="text-sm dark:text-gray-300">{t('squadding.totalCount', { count: totalShooterCount })}</span>
          </span>
        </ModalHeader>
        <ModalBody>
          {squadCount === 0 && effectiveSquadCount === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">{t('squadding.noStages')}</p>
              <button
                type="button"
                onClick={addSquad}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer"
              >
                + {t('squadding.addSquad', 'Squad')}
              </button>
            </div>
          ) : (
            <>
              <TextInput
                placeholder={t('squadding.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-4 dark:[&_input]:bg-gray-800"
              />

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex flex-wrap gap-4">
                  {showUnassigned && (
                    <div className="flex flex-col min-w-65 max-w-75 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <span className="font-semibold text-sm dark:text-white">{t('squadding.unassigned')}</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({unassigned.length})</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-20 max-h-100">
                        {filteredUnassigned.length > 0 ? (
                          filteredUnassigned.map((r) => (
                            <ShooterCard key={r.shooter_id} registration={r} onRemoveFromGroup={handleRemoveFromGroup} />
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                            {query ? t('squadding.searchEmpty') : t('squadding.noShooters')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {Array.from({ length: effectiveSquadCount }, (_, i) => i + 1).map((n) => (
                    <SquadColumn
                      key={n}
                      squadNumber={n}
                      shooters={columns[n] || []}
                      onAddShooter={() => setAddShooterSquad(n)}
                      onRemoveFromGroup={handleRemoveFromGroup}
                      query={query}
                    />
                  ))}

                  <Button
                    type="button"
                    className="my-auto"
                    onClick={addSquad}
                  >
                    {t('squadding.addSquad', 'Squad')}
                  </Button>
                </div>

                <DragOverlay>
                  {activeRegistration && (
                    <ShooterCard registration={activeRegistration} isDragging />
                  )}
                </DragOverlay>
              </DndContext>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleClose} color="gray">{t('common.close')}</Button>
          <Button onClick={handleGeneratePdf} color="blue">{t('squadding.generatePdf', 'Generate PDF')}</Button>
        </ModalFooter>
      </Modal>

      {addShooterSquad !== null && (
        <AddShooterToSquadModal
          show={true}
          onClose={() => setAddShooterSquad(null)}
          targetSquad={addShooterSquad}
          registrations={registrations}
          onAdd={handleAddShooter}
        />
      )}

    </>
  );
}
