import { useState } from 'react';
import { Button, Label, TextInput, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function AdminPasswordSection() {
  const { t } = useTranslation();
  const adminToken = useAuthStore((s) => s.adminToken);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async () => {
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('auth.passwordMismatch') });
      return;
    }

    if (newPassword.length < 10) {
      setMessage({ type: 'error', text: t('auth.passwordTooShort') });
      return;
    }

    setSaving(true);
    try {
      const result = await api.auth.changeAdminPassword(currentPassword, newPassword, adminToken!);
      if (result.success) {
        setMessage({ type: 'success', text: t('auth.passwordChanged') });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.error || t('auth.incorrectPassword') });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('auth.incorrectPassword') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold dark:text-white mb-2">{t('auth.changePassword')}</h3>
      <div className="space-y-3">
        <div>
          <Label htmlFor="current-password" className="mb-1 block">
            {t('auth.currentPassword')}
          </Label>
          <TextInput
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="new-password" className="mb-1 block">
            {t('auth.newPassword')}
          </Label>
          <TextInput
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm-password" className="mb-1 block">
            {t('auth.confirmNewPassword')}
          </Label>
          <TextInput
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {message && (
          <Alert color={message.type === 'success' ? 'success' : 'failure'}>
            {message.text}
          </Alert>
        )}

        <Button
          onClick={handleChangePassword}
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          size="sm"
        >
          {saving ? t('auth.connecting') : t('auth.changePassword')}
        </Button>
      </div>
    </div>
  );
}