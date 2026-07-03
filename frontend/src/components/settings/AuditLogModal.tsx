import { useState, useCallback, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner, Alert, Select } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useEscClose } from '../../hooks/useEscClose';
import type { AuditEntry } from '../../types/audit';

interface AuditLogModalProps {
  show: boolean;
  onClose: () => void;
}

export default function AuditLogModal({ show, onClose }: AuditLogModalProps) {
  const { t } = useTranslation();
  useEscClose(onClose);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pendingActionFilter, setPendingActionFilter] = useState('');
  const limit = 100;

  const load = useCallback(async (off: number, action: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditLog({ limit, offset: off, action: action || undefined, actor_role: role || undefined });
      if (off === 0) {
        setEntries(res.entries);
      } else {
        setEntries((prev) => [...prev, ...res.entries]);
      }
      setTotal(res.total);
      setOffset(off);
    } catch (err: any) {
      setError(err.message || t('settings.auditLogErrorFallback'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset when opened
  useEffect(() => {
    if (show) {
      setEntries([]);
      setTotal(0);
      setOffset(0);
      setActionFilter('');
      setRoleFilter('');
      setPendingActionFilter('');
      setError(null);
      load(0, '', '');
    }
  }, [show, load]);

  const handleRefresh = () => {
    load(0, actionFilter, roleFilter);
  };

  const handleFilterApply = () => {
    setActionFilter(pendingActionFilter);
    load(0, pendingActionFilter, roleFilter);
  };

  const handleRoleChange = (newRole: string) => {
    setRoleFilter(newRole);
    load(0, actionFilter, newRole);
  };

  const handleLoadMore = () => {
    load(offset + limit, actionFilter, roleFilter);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatTarget = (entry: AuditEntry) => {
    if (!entry.target_table) return '—';
    if (entry.target_id) return `${entry.target_table}:${entry.target_id}`;
    return entry.target_table;
  };

  return (
    <Modal show={show} onClose={onClose} size="6xl">
      <ModalHeader>{t('settings.auditLogTitle')}</ModalHeader>
      <ModalBody>
        {error && (
          <Alert color="failure" className="mb-4">
            <p>{t('settings.auditLogError')} {error}</p>
          </Alert>
        )}

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.auditLogAction')}
            </label>
            <input
              type="text"
              value={pendingActionFilter}
              onChange={(e) => setPendingActionFilter(e.target.value)}
              placeholder={t('settings.auditLogFilterAction')}
              className="block w-48 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              onKeyDown={(e) => { if (e.key === 'Enter') handleFilterApply(); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.auditLogFilterRole')}
            </label>
            <Select
              value={roleFilter}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="">{t('settings.auditLogRoleAll')}</option>
              <option value="admin">admin</option>
              <option value="scorer">scorer</option>
              <option value="anonymous">anonymous</option>
            </Select>
          </div>
          <Button color="gray" onClick={handleFilterApply}>
            {t('common.filter')}
          </Button>
          <Button color="gray" onClick={handleRefresh} disabled={loading}>
            {t('common.refresh')}
          </Button>
        </div>

        <div className="overflow-x-auto">
          {loading && entries.length === 0 ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t('settings.auditLogNoEntries')}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogTime')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogActor')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogAction')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogTarget')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogIp')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogMeta')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 whitespace-nowrap text-gray-900 dark:text-gray-100" title={entry.at}>
                      {formatTime(entry.at)}
                    </td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        entry.actor_role === 'admin'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                          : entry.actor_role === 'scorer'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {entry.actor_role}
                      </span>
                      {entry.actor_token_id && (
                        <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                          {entry.actor_token_id}
                        </span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                      {entry.action}
                    </td>
                    <td className="py-2 text-xs text-gray-600 dark:text-gray-400">
                      {formatTarget(entry)}
                    </td>
                    <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                      {entry.ip || '—'}
                    </td>
                    <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                      {entry.meta ? (
                        <details>
                          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                            {t('settings.auditLogMeta')}
                          </summary>
                          <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(entry.meta, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {loading && entries.length > 0 && (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        )}

        {!loading && entries.length < total && (
          <div className="flex justify-center py-4">
            <Button size="sm" color="gray" onClick={handleLoadMore}>
              {t('settings.auditLogLoadMore')} ({entries.length} / {total})
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-2">
          {t('settings.auditLogTotal', { count: total })}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}
