import { useState } from 'react';
import { Badge, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { useConstLabels } from '../../hooks/useConstLabels';
import { divisionLabel } from '../../utils/constants';
import { groupColor } from '../../utils/groupColors';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import type { useSelection } from '../../hooks/useSelection';
import type { RegistrationWithShooter } from '../../types/scoring';
import { TbGripVertical } from "react-icons/tb";

interface RegistrationTableProps {
  registrations: any[];
  totalCount: number;
  selection: ReturnType<typeof useSelection<string>>;
  onEdit: (r: any) => void;
  onRemove: (regId: string) => void;
  onUngroup: (regId: string) => void;
  onDragToGroup: (sourceId: string, targetId: string) => void;
}

function GripHandle({ registration }: { registration: RegistrationWithShooter }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `reg-drag-${registration.id}`,
    data: { registration },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex ml-auto items-center justify-center cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300"
    >
      <TbGripVertical className="size-5" />
    </div>
  );
}

function RegistrationRow({
  r,
  idx,
  selection,
  onEdit,
  onRemove,
  onUngroup,
}: {
  r: any;
  idx: number;
  selection: RegistrationTableProps['selection'];
  onEdit: (r: any) => void;
  onRemove: (regId: string) => void;
  onUngroup: (regId: string) => void;
}) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `reg-drop-${r.id}`,
    data: { registration: r },
  });

  const groupId = r.group_id;
  const groupBorderColor = groupId ? groupColor(groupId) : undefined;

  return (
    <TableRow
      ref={setDropRef}
      className={`${r.is_dq ? 'bg-red-50 dark:bg-red-900/20' : selection.isSelected(r.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      {/* Checkbox */}
      <TableCell className="w-4! pr-0">
        <Checkbox className="size-5 cursor-pointer" checked={selection.isSelected(r.id)} onChange={() => selection.toggle(r.id)} />
      </TableCell>

      <TableCell className="font-mono text-gray-500">{idx + 1}</TableCell>
      <TableCell className="font-medium dark:text-white whitespace-nowrap">
        {r.first_name} {r.last_name}
      </TableCell>
      <TableCell>
        <Badge color="blue" size="xs">{divisionLabel(r.effective_division)}</Badge>
      </TableCell>
      <TableCell>
        <Badge color="gray" size="xs">{categoryLabel(r.effective_category)}</Badge>
      </TableCell>
      <TableCell>
        <Badge color={r.effective_power_factor === 'major' ? 'warning' : 'success'} size="xs">{powerFactorLabel(r.effective_power_factor)}</Badge>
      </TableCell>
      <TableCell className="font-mono">{r.squad === null || r.squad === undefined ? '—' : Number(r.squad)}</TableCell>
      <TableCell>
        {r.is_dq ? (
          <Badge color="failure" size="sm">{t('registration.dq')}</Badge>
        ) : (
          <Badge color="success" size="sm">{t('registration.active')}</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="xs" color="blue" onClick={(e) => { e.stopPropagation(); onEdit(r); }}>{t('common.edit')}</Button>
          <Button size="xs" color="red" onClick={(e) => { e.stopPropagation(); onRemove(r.id); }}>{t('common.remove')}</Button>
          
        </div>
      </TableCell>
      <TableCell className="p-0 w-8 min-w-8 relative">
        <GripHandle registration={r} />
        <div
          className="w-1.5 h-full absolute top-0 right-0 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: groupBorderColor || 'transparent' }}
          title={groupBorderColor ? t('registration.ungroup') : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (groupBorderColor) {
              e.stopPropagation();
              onUngroup(r.id);
            }
          }}
        />
      </TableCell>
    </TableRow>
  );
}

export default function RegistrationTable({ registrations, totalCount, selection, onEdit, onRemove, onUngroup, onDragToGroup }: RegistrationTableProps) {
  const { t } = useTranslation();
  const [activeRegistration, setActiveRegistration] = useState<RegistrationWithShooter | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  if (registrations.length === 0) return null;

  const handleDragStart = (event: any) => {
    const { active } = event;
    const reg = active?.data?.current?.registration as RegistrationWithShooter | undefined;
    if (reg) setActiveRegistration(reg);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveRegistration(null);

    if (!over) return;

    const sourceReg = active.data?.current?.registration;
    const targetReg = over.data?.current?.registration;
    if (!sourceReg || !targetReg) return;
    if (sourceReg.id === targetReg.id) return;

    onDragToGroup(sourceReg.id, targetReg.id);
  };

  return (
    <div className="overflow-x-auto rounded-lg">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Table striped theme={{ root: { shadow: 'hidden' } }}>
          <TableHead>
            <TableRow>
              <TableHeadCell className="w-4 pr-0!">
                <SelectAllCheckbox
                  allSelected={selection.allSelected}
                  someSelected={selection.someSelected}
                  onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                  selectedCount={selection.selectedCount}
                  totalCount={totalCount}
                />
              </TableHeadCell>
              <TableHeadCell className="w-2!">#</TableHeadCell>
              <TableHeadCell>{t('common.name')}</TableHeadCell>
              <TableHeadCell>{t('shooters.division')}</TableHeadCell>
              <TableHeadCell>{t('shooters.category')}</TableHeadCell>
              <TableHeadCell>PF</TableHeadCell>
              <TableHeadCell>{t('registration.squad')}</TableHeadCell>
              <TableHeadCell />
              <TableHeadCell>{t('common.actions')}</TableHeadCell>
              <TableHeadCell className="w-8" />
            </TableRow>
          </TableHead>
          <TableBody>
            {registrations.map((r, idx) => (
              <RegistrationRow
                key={r.id}
                r={r}
                idx={idx}
                selection={selection}
                onEdit={onEdit}
                onRemove={onRemove}
                onUngroup={onUngroup}
              />
            ))}
          </TableBody>
        </Table>

        <DragOverlay>
          {activeRegistration && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pl-3 shadow-lg opacity-90 min-w-37.5">
              <div className="font-medium text-sm dark:text-white">
                {activeRegistration.first_name} {activeRegistration.last_name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {divisionLabel(activeRegistration.effective_division)}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
