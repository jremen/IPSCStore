import { useState, useCallback, useMemo } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Modal, ModalHeader, ModalBody, TextInput, Badge, ModalFooter, Button, theme } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useEscClose } from '../../hooks/useEscClose';
import { useSquadding } from '../../hooks/useSquadding';
import SquadColumn from './SquadColumn';
import ShooterCard from './ShooterCard';
import AddShooterToSquadModal from './AddShooterToSquadModal';
import type { RegistrationWithShooter } from '../../types/scoring';
import { twMerge } from "tailwind-merge";

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
    moveShooter,
    assignShooterToSquad,
    flushPending,
    query,
    setQuery,
    totalShooterCount,
  } = useSquadding(show ? matchId : null);

  const [activeRegistration, setActiveRegistration] = useState<RegistrationWithShooter | null>(null);
  const [addShooterSquad, setAddShooterSquad] = useState<number | null>(null);

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
    // Target is a squad column: "squad-N"
    if (overId.startsWith('squad-')) {
      const squad = parseInt(overId.replace('squad-', ''), 10);
      if (!isNaN(squad)) moveShooter(shooterId, squad);
    }
  }, [moveShooter]);

  const handleAddShooter = useCallback((registrationId: string) => {
    if (addShooterSquad === null) return;
    assignShooterToSquad(registrationId, addShooterSquad);
  }, [addShooterSquad, assignShooterToSquad]);

  // Unassigned column is a separate droppable if non-empty
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
          <h3 className="mr-3">{t('squadding.title')}</h3>
          <span className="text-sm dark:text-gray-300">{t('squadding.totalCount', { count: totalShooterCount })}</span>
        </ModalHeader>
        <ModalBody>
          {squadCount === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('squadding.noStages')}</p>
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
                  {/* Unassigned column (if any shooters are unassigned) */}
                  {showUnassigned && (
                    <div className="flex flex-col min-w-[260px] max-w-[300px] bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <span className="font-semibold text-sm dark:text-white">{t('squadding.unassigned')}</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({unassigned.length})</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px] max-h-[400px]">
                        {filteredUnassigned.length > 0 ? (
                          filteredUnassigned.map((r) => (
                            <ShooterCard key={r.shooter_id} registration={r} />
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                            {query ? t('squadding.searchEmpty') : t('squadding.noShooters')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Squad columns */}
                  {Array.from({ length: squadCount }, (_, i) => i + 1).map((n) => (
                    <SquadColumn
                      key={n}
                      squadNumber={n}
                      shooters={columns[n] || []}
                      onAddShooter={() => setAddShooterSquad(n)}
                      query={query}
                    />
                  ))}
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
        </ModalFooter>
      </Modal>

      {/* Add Shooter sub-modal */}
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
