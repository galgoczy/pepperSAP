import { useState } from 'react';
import { User, Lock, Bell, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input } from '../components/common';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { user, profile, refetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      await refetchProfile();
      toast.success('Profil sikeresen frissítve!');
    } catch (error) {
      console.error(error);
      toast.error('Hiba történt a profil frissítésekor');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Az új jelszavak nem egyeznek!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Az új jelszó legalább 6 karakter kell legyen!');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Jelszó sikeresen megváltoztatva!');
    } catch (error) {
      console.error(error);
      toast.error('Hiba történt a jelszó megváltoztatásakor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Beállítások</h1>
        <p className="text-gray-500 mt-1">Fiókod és preferenciáid kezelése</p>
      </div>

      {/* Profile Section */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            Profil adatok
          </div>
        }
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <Input
            label="Email cím"
            value={user?.email || ''}
            disabled
            helper="Az email cím nem módosítható"
          />

          <Input
            label="Teljes név"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>
                Szerepkör:{' '}
                <span className="font-medium text-pepper-red">
                  {profile?.role === 'admin' && 'Adminisztrátor'}
                  {profile?.role === 'unit' && 'Éttermi egység'}
                  {profile?.role === 'events' && 'Rendezvény egység'}
                </span>
              </span>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" loading={loading}>
              Mentés
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Section */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" />
            Jelszó módosítása
          </div>
        }
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Új jelszó"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Új jelszó megerősítése"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="pt-4">
            <Button type="submit" loading={loading}>
              Jelszó megváltoztatása
            </Button>
          </div>
        </form>
      </Card>

      {/* Notifications Section (Future) */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-400" />
            Értesítések
          </div>
        }
      >
        <p className="text-gray-500 text-sm">
          Az értesítési beállítások hamarosan elérhetőek lesznek.
        </p>
      </Card>
    </div>
  );
}
