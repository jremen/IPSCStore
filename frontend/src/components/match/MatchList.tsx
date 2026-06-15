import { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Badge, TextInput, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDate } from '../../utils/constants';
import MatchDetail from './MatchDetail';
import WinMSSImport from '../settings/WinMSSImport';
import DeleteMatchModal from './DeleteMatchModal';
import DeleteAllMatchesModal from './DeleteAllMatchesModal';
import CreateMatchModal from './CreateMatchModal';
import { TbTrash } from 'react-icons/tb';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function MatchList() {
  const { matches, loading, fetchMatches, markCurrent, unmarkCurrent } = useMatchStore();
  const { activeMatchId, setActiveMatch, addToast } = useUIStore();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  useTabMenuAction('new-match', () => setShowCreate(true));
  useTabMenuAction('delete-all-matches', () => {
    if (matches.length > 0) setShowDeleteAll(true);
  });
  useTabMenuAction('focus-search', () => searchRef.current?.focus());

  const filteredMatches = useMemo(() => {
    if (!search) return matches;
    const q = search.toLowerCase();
    return matches.filter((m: any) =>
      m.name.toLowerCase().includes(q) ||
      m.organization.toLowerCase().includes(q) ||
      m.firearm_type.toLowerCase().includes(q) ||
      m.date?.includes(q)
    );
  }, [matches, search]);

  if (activeMatchId) return <MatchDetail />;

  return (
    <div className="p-4 mx-auto">
      <div className="sticky top-4 before:bg-gray-200 pb-4 dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('matches.count', { count: matches.length })}</h2>
          <div className="flex gap-2">
            {matches.length > 0 && (
              <Button size="sm" color="red" onClick={() => setShowDeleteAll(true)}><TbTrash /> {t('matches.deleteAll')}</Button>
            )}
            <WinMSSImport />
            <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('matches.newMatch')}</Button>
          </div>
        </div>

        <TextInput
          ref={searchRef}
          placeholder={t('matches.searchMatches')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      {filteredMatches.length > 0 ? (
        <div className="overflow-x-auto w-full rounded-lg border border-gray-200 dark:border-gray-700">
          <Table striped hoverable className="">
            <TableHead>
              <TableRow>
                <TableHeadCell>{t('matches.name')}</TableHeadCell>
                <TableHeadCell>{t('matches.date')}</TableHeadCell>
                <TableHeadCell>{t('matches.organization')}</TableHeadCell>
                <TableHeadCell>{t('matches.firearm')}</TableHeadCell>
                <TableHeadCell>{t('matches.shooters')}</TableHeadCell>
                <TableHeadCell></TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.map((m: any) => (
                <TableRow key={m.id} className="cursor-pointer group" onClick={() => setActiveMatch(m.id)}>
                  <TableCell className="font-medium dark:text-white whitespace-nowrap">{m.name}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(m.date)}</TableCell>
                  <TableCell>
                    <Badge color={m.organization === 'IPSC' ? 'info' : 'purple'} size="sm">{m.organization}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color="gray" size="sm">{m.firearm_type}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{m.shooter_count ?? '—'}</TableCell>
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
      <DeleteAllMatchesModal show={showDeleteAll} onClose={() => setShowDeleteAll(false)} />
      <CreateMatchModal show={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
