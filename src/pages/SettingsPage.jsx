import { useState } from 'react';
import { User, Lock, Bell, Shield, Eye, Settings2, Star, Building, Landmark, Radio, PartyPopper } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useAllUnitRevenueSettings } from '../hooks/useUnitRevenueSettings';
import { Card, Button, Input, LoadingSpinner } from '../components/common';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const REVENUE_TYPES = [
  { key: 'show_vip', label: 'VIP', icon: Star, color: 'text-amber-500' },
  { key: 'show_protocol', label: 'Protokoll', icon: Building, color: 'text-blue-500' },
  { key: 'show_mckinsey', label: 'McKinsey', icon: Landmark, color: 'text-emerald-600' },
  { key: 'show_ordit', label: 'Ordit', icon: Radio, color: 'text-orange-500' },
  { key: 'show_event_revenue', label: 'Rendezvény', icon: PartyPopper, color: 'text-purple-500' },
];

export default function SettingsPage() {
  const { user, profile, isAdmin, refetchProfile } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const { allSettings, loading: settingsLoading, updateSettings } = useAllUnitRevenueSettings();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
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
    <div className="space-y-6 max-w-3xl">
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

      {/* Unit Revenue Settings - Admin only */}
      {isAdmin && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-gray-400" />
              Bevétel típusok megjelenítése
            </div>
          }
        >
          <p className="text-sm text-gray-500 mb-4">
            Állítsd be, mely bevétel típusok jelenjenek meg az egyes egységek napi jelentésében.
          </p>

          {settingsLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              {allSettings.map((unit) => (
                <div key={unit.id} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{unit.name}</h4>
                  <div className="flex flex-wrap gap-3">
                    {REVENUE_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isChecked = unit.settings[type.key] ?? false;
                      return (
                        <label
                          key={type.key}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all
                            ${isChecked
                              ? 'bg-gray-50 border-gray-300'
                              : 'bg-white border-gray-200 opacity-60'
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              updateSettings(unit.id, {
                                [type.key]: e.target.checked,
                              });
                            }}
                            className="h-4 w-4 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
                          />
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          <span className="text-sm text-gray-700">{type.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Display Settings (Admin only) */}
      {isAdmin && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-gray-400" />
              Megjelenítési beállítások
            </div>
          }
        >
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Tartalék mutatása</p>
                <p className="text-sm text-gray-500">
                  Ha kikapcsolod, a tartalék nem jelenik meg a házipénztárban és a riportokban
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.showReserve}
                  onChange={(e) => updateSetting('showReserve', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pepper-red/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pepper-red"></div>
              </div>
            </label>
          </div>
        </Card>
      )}

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
