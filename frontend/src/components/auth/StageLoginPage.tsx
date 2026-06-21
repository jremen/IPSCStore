import { useState, useEffect } from 'react';
import { Card, Select, TextInput, Button, Label, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import * as offlineDB from '../../services/offlineDB';
import LanguageSelector from '../settings/LanguageSelector';

export default function StageLoginPage() {
  const { login, loading, error } = useAuthStore();
  const { t } = useTranslation();
  const [stageId, setStageId] = useState('');
  const [password, setPassword] = useState('');
  const [stages, setStages] = useState<Array<{ id: string; name: string; stageNumber: number; matchName: string }>>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStages() {
      try {
        const result = await api.auth.getStages();
        setStages(result);
      } catch (err: any) {
        // Network failed — try cached stages from IndexedDB
        try {
          const allStages = await offlineDB.getCachedMatches().then(async (matches) => {
            // Get all cached stages across all matches
            const allStages: Array<{ id: string; name: string; stageNumber: number; matchName: string }> = [];
            for (const match of matches) {
              const matchStages = await offlineDB.getCachedStages(match.id);
              for (const s of matchStages) {
                allStages.push({
                  id: s.id,
                  name: s.name,
                  stageNumber: s.stage_number,
                  matchName: match.name,
                });
              }
            }
            return allStages;
          });
          if (allStages.length > 0) {
            setStages(allStages);
            setFetchError(null);
          } else {
            setFetchError(err.message);
          }
        } catch {
          setFetchError(err.message);
        }
      }
    }
    fetchStages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageId || !password) return;
    await login(stageId, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {t('auth.title')}
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
          {t('auth.subtitle')}
        </p>

        {(error || fetchError) && (
          <Alert color="failure" className="mb-4">
            {error || fetchError ? t(error || fetchError || 'auth.incorrectPassword') : ''}
          </Alert>
        )}

        {stages.length === 0 && !fetchError && (
          <Alert color="info" className="mb-4">
            {t('auth.noStages')}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="stage-select" className="mb-1 block">{t('auth.stage')}</Label>
            <Select
              id="stage-select"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              required
            >
              <option value="">{t('auth.selectStage')}</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {t('scoring.stage', { number: s.stageNumber })}: {s.name} ({s.matchName})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="password" className="mb-1 block">{t('auth.password')}</Label>
            <TextInput
              id="password"
              type="password"
              placeholder={t('auth.enterPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !stageId || !password}
          >
            {loading ? t('auth.connecting') : t('auth.enterStage')}
          </Button>
        </form>
      </Card>
    </div>
  );
}