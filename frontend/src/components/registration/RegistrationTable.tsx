import { Badge, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { useConstLabels } from '../../hooks/useConstLabels';
import { divisionLabel } from '../../utils/constants';
import { groupColor } from '../../utils/groupColors';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import type { useSelection } from '../../hooks/useSelection';
import type { RegistrationWithShooter } from '../../types/scoring';

interface RegistrationTableProps {
  registrations: any[];
  totalCount: number;
  selection: ReturnType<typeof useSelection<string>>;
  onEdit: (r: any) => void;
  onRemove: (regId: string) => void;
  onUngroup: (regId: string) => void;
  onGroupRows: (registrationIds: string[]) => void;
  onDragToGroup: (sourceId: string, targetId: string) => void;
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

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `reg-drag-${r.id}`,
    data: { registration: r },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `reg-drop-${r.id}`,
    data: { registration: r },
  });

  const groupId = r.group_id;
  const groupBorderColor = groupId ? groupColor(groupId) : undefined;

  return (
    <TableRow
      ref={(node) => { setDragRef(node); setDropRef(node); }}
      className={`${r.is_dq ? 'bg-red-50 dark:bg-red-900/20' : selection.isSelected(r.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-blue-400' : ''} relative`}
      {...attributes}
      {...listeners}
    >
      {/* Group left border */}
      <TableCell className="!p-0 !w-1 !min-w-1">
        {groupBorderColor && (
          <div className="h-full w-1" style={{ backgroundColor: groupBorderColor }} />
        )}
      </TableCell>
      <TableCell>
        <Checkbox checked={selection.isSelected(r.id)} onChange={() => selection.toggle(r.id)} />
      </TableCell>
      <TableCell className="font-mono text-gray-500">{idx + 1}</TableCell>
      <TableCell className="font-medium dark:text-white whitespace-nowrap">
        {r.first_name} {r.last_name}
      </TableCell>
      <TableCell>
        <Badge color="blue" size="sm">{divisionLabel(r.effective_division)}</Badge>
      </TableCell>
      <TableCell>
        <Badge color="gray" size="sm">{categoryLabel(r.effective_category)}</Badge>
      </TableCell>
      <TableCell>
        <Badge color={r.effective_power_factor === 'major' ? 'warning' : 'success'} size="sm">{powerFactorLabel(r.effective_power_factor)}</Badge>
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
          {groupId && (
            <Button size="xs" color="yellow" onClick={(e) => { e.stopPropagation(); onUngroup(r.id); }}>{t('registration.ungroup')}</Button>
          )}
          <Button size="xs" color="red" onClick={(e) => { e.stopPropagation(); onRemove(r.id); }}>{t('common.remove')}</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function RegistrationTable({ registrations, totalCount, selection, onEdit, onRemove, onUngroup, onGroupRows, onDragToGroup }: RegistrationTableProps) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  if (registrations.length === 0) return null;

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sourceReg = active.data?.current?.registration;
    const targetReg = over.data?.current?.registration;
    if (!sourceReg || !targetReg) return;

    onDragToGroup(sourceReg.id, targetReg.id);
  };

  return (
    <div className="overflow-x-auto rounded-lg">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table striped theme={{ root: { shadow: 'hidden' } }}>
          <TableHead>
            <TableRow>
              <TableHeadCell className="w-1" />
              <TableHeadCell className="w-10">
                <SelectAllCheckbox
                  allSelected={selection.allSelected}
                  someSelected={selection.someSelected}
                  onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                  selectedCount={selection.selectedCount}
                  totalCount={totalCount}
                />
              </TableHeadCell>
              <TableHeadCell>#</TableHeadCell>
              <TableHeadCell>{t('common.name')}</TableHeadCell>
              <TableHeadCell>{t('shooters.division')}</TableHeadCell>
              <TableHeadCell>{t('shooters.category')}</TableHeadCell>
              <TableHeadCell>PF</TableHeadCell>
              <TableHeadCell>{t('registration.squad')}</TableHeadCell>
              <TableHeadCell />
              <TableHeadCell>{t('common.actions')}</TableHeadCell>
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
      </DndContext>
    </div>
  );
}
