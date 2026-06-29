import { useState } from 'react';
import { Card, TextInput, Button, Label, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import LanguageSelector from '../settings/LanguageSelector';

export default function AdminLoginPage() {
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const { t } = useTranslation();
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    await adminLogin(password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-sm">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {t('auth.adminTitle')}
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
          {t('auth.adminSubtitle')}
        </p>

        {error && (
          <Alert color="failure" className="mb-4">
            {error === 'Incorrect password.' ? t('auth.incorrectPassword') : error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admin-password" className="mb-1 block">
              {t('auth.adminPassword')}
            </Label>
            <TextInput
              id="admin-password"
              type="password"
              placeholder={t('auth.enterAdminPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password}
          >
            {loading ? t('auth.connecting') : t('auth.adminLogin')}
          </Button>
        </form>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
          {t('auth.defaultPasswordHint')}
        </p>
      </Card>
    </div>
  );
}