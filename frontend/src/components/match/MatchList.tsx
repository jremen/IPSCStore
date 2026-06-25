import { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Badge, TextInput, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, Checkbox, Select, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useUIStore } from '../../stores/uiStore';
import { useMatchExport } from '../../hooks/useMatchExport';
import { useSelection } from '../../hooks/useSelection';
import { formatDate } from '../../utils/constants';
import { FIREARM_TYPES, MATCH_LEVELS } from '../../utils/constants';
import type { FirearmType, MatchLevel } from '../../types/match';
import MatchDetail from './MatchDetail';
import WinMSSImport from '../settings/WinMSSImport';
import DeleteMatchModal from './DeleteMatchModal';
import CreateMatchModal from './CreateMatchModal';
import ImportMatchModal from './ImportMatchModal';
import BulkDeleteMatchesModal from './BulkDeleteMatchesModal';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import { TbTrash, TbFileExport, TbFileUpload } from 'react-icons/tb';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function MatchList() {
  const { matches, loading, fetchMatches, markCurrent, unmarkCurrent } = useMatchStore();
  const { activeMatchId, setActiveMatch, addToast } = useUIStore();
  const { handleExport, exporting } = useMatchExport();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [filterFirearmType, setFilterFirearmType] = useState<FirearmType | ''>('');
  const [filterLevel, setFilterLevel] = useState<MatchLevel | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  useTabMenuAction('new-match', () => setShowCreate(true));
  useTabMenuAction('import-match', () => setShowImport(true));
  useTabMenuAction('focus-search', () => searchRef.current?.focus());

  const filteredMatches = useMemo(() => {
    let result = matches;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m: any) =>
        m.name.toLowerCase().includes(q) ||
        m.organization.toLowerCase().includes(q) ||
        m.firearm_type.toLowerCase().includes(q) ||
        m.date?.includes(q)
      );
    }
    if (filterFirearmType) {
      result = result.filter((m: any) => m.firearm_type === filterFirearmType);
    }
    if (filterLevel) {
      result = result.filter((m: any) => m.match_level === filterLevel);
    }
    if (dateFrom) {
      result = result.filter((m: any) => m.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((m: any) => m.date <= dateTo);
    }
    return result;
  }, [matches, search, filterFirearmType, filterLevel, dateFrom, dateTo]);

  const matchIds = filteredMatches.map((m: any) => m.id);
  const selection = useSelection(matchIds);

  const selectedNames = selection.selectedArray
    .map((id: string) => { const m = matches.find((m: any) => m.id === id); return m ? m.name : id; });

  const handleBulkDeleted = () => {
    selection.clearSelection();
  };

  if (activeMatchId) return <MatchDetail />;

  return (
    <div className="p-4 mx-auto">
      <div className="sticky top-4 before:bg-gray-200 pb-4 dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('matches.count', { count: matches.length })}</h2>
          <div className="flex gap-2">
            <WinMSSImport />
            <Button size="sm" color="light" onClick={() => setShowImport(true)}><TbFileUpload /> {t('matches.importMatch')}</Button>
            <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('matches.newMatch')}</Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-2 flex-wrap">
          <div className="flex-1">
             <Label htmlFor="reg-search">{t('common.name')}</Label>
            <TextInput
              ref={searchRef}
              placeholder={t('matches.searchMatches')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-50"
            />
          </div>
          <div className="">
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterFirearmType')}:</Label>
            <Select value={filterFirearmType} onChange={(e) => setFilterFirearmType(e.target.value as FirearmType | '')} className="w-36">
              <option value="">{t('matches.allFirearmTypes')}</option>
              {FIREARM_TYPES.map((f) => (
                <option key={f.value} value={f.value}>{t(f.i18nKey)}</option>
              ))}
            </Select>
          </div>
          <div className="">
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterLevel')}</Label>
            <Select value={String(filterLevel)} onChange={(e) => setFilterLevel(e.target.value === '' ? '' : (Number(e.target.value) as MatchLevel))} className="w-36">
              <option value="">{t('matches.allLevels')}</option>
              {MATCH_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col">
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterDateFrom')}</Label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg mt-0.5 border border-gray-300 bg-gray-50 text-sm p-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex flex-col">
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterDateTo')}</Label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg mt-0.5 border border-gray-300 bg-gray-50 text-sm p-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <BulkActionToolbar
          selectedCount={selection.selectedCount}
          onEdit={() => {}}
          onDelete={() => setShowBulkDelete(true)}
          onClearSelection={selection.clearSelection}
        />
      </div>

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      {filteredMatches.length > 0 ? (
        <div className="overflow-x-auto w-full rounded-lg border border-gray-200 dark:border-gray-700">
          <Table striped hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell className="w-10">
                  <SelectAllCheckbox
                    allSelected={selection.allSelected}
                    someSelected={selection.someSelected}
                    onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                    selectedCount={selection.selectedCount}
                    totalCount={filteredMatches.length}
                  />
                </TableHeadCell>
                <TableHeadCell>{t('matches.name')}</TableHeadCell>
                <TableHeadCell>{t('matches.date')}</TableHeadCell>
                <TableHeadCell>{t('matches.organization')}</TableHeadCell>
                <TableHeadCell>{t('matches.firearm')}</TableHeadCell>
                <TableHeadCell>{t('matches.level')}</TableHeadCell>
                <TableHeadCell>{t('matches.shooters')}</TableHeadCell>
                <TableHeadCell></TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.map((m: any) => (
                <TableRow
                  key={m.id}
                  className={`cursor-pointer group ${selection.isSelected(m.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => setActiveMatch(m.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selection.isSelected(m.id)} onChange={() => selection.toggle(m.id)} />
                  </TableCell>
                  <TableCell className="font-medium dark:text-white whitespace-nowrap">{m.name}</TableCell>
                  <TableCell className="">{formatDate(m.date)}</TableCell>
                  <TableCell>
                    <Badge color={m.organization === 'IPSC' ? 'info' : 'purple'} size="sm">{m.organization}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color="gray" size="sm">{t(`firearmTypes.${m.firearm_type}`)}</Badge>
                  </TableCell>
                  <TableCell className="">
                    {m.match_level ? <Badge color="indigo" size="sm">L{m.match_level}</Badge> : '—'}
                  </TableCell>
                  <TableCell className="">{m.shooter_count ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      
                      <Button
                        size="xs"
                        color={m.is_current ? "green" : "gray"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (m.is_current) {
                            unmarkCurrent();
                            addToast(t('matches.unsetAsCurrent'), 'success');
                          } else {
                            markCurrent(m.id);
                            addToast(t('matches.setAsCurrentDone'), 'success');
                          }
                        }}
                      >
                        {m.is_current ? '● ' + t('matches.current') : t('matches.setAsCurrent')}
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(m.id); }}
                        size="xs"
                        color="red"
                      >
                        {t('matches.deleteMatch')}
                      </Button>
                      <Button
                        size="xs"
                        color="light"
                        title={t('matches.exportMatch')}
                        disabled={exporting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(m.id, m.name);
                        }}
                      >
                        <TbFileExport />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !loading && <p className="text-center text-gray-500 mt-8">{t('matches.empty')}</p>
      )}

      <DeleteMatchModal show={deleteTarget !== null} onClose={() => setDeleteTarget(null)} matchId={deleteTarget} />
      <CreateMatchModal show={showCreate} onClose={() => setShowCreate(false)} />
      <ImportMatchModal show={showImport} onClose={() => setShowImport(false)} onImported={fetchMatches} />
      <BulkDeleteMatchesModal
        show={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        matchIds={selection.selectedArray}
        matchNames={selectedNames}
        onDeleted={handleBulkDeleted}
      />
    </div>
  );
}
