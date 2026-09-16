import { useState } from 'react';
import { User, Lock, Bell, Shield, Eye, Settings2, Star, Building, Landmark, Radio, PartyPopper, Calculator, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useAllUnitRevenueSettings } from '../hooks/useUnitRevenueSettings';
import { useStrictAccounting } from '../hooks/useStrictAccounting';
import { getToday } from '../lib/utils';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Input, Select, LoadingSpinner, DateInput } from '../components/common';
import CashRegisterOrderCard from '../components/units/CashRegisterOrderCard';
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
  const { user, profile, isAdmin, unitId, refetchProfile } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const { allSettings, loading: settingsLoading, updateSettings } = useAllUnitRevenueSettings();
  const { units } = useUnits();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [orderUnitId, setOrderUnitId] = useState('');
  const strict = useStrictAccounting();
  const [strictSaving, setStrictSaving] = useState(false);

  const saveStrict = async (next) => {
    setStrictSaving(true);
    try {
      await strict.update(next);
      toast.success('Szigorú elszámolás mód mentve');
    } catch (error) {
      console.error(error);
      toast.error('Nem sikerült menteni a beállítást');
    } finally {
      setStrictSaving(false);
    }
  };

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

      {/* Cash register display order (unit users for their own unit; admin per unit) */}
      {(isAdmin || profile?.role === 'unit') && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-gray-400" />
              Pénztárgépek sorrendje
            </div>
          }
        >
          {isAdmin ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Válaszd ki az egységet, majd állítsd be a pénztárgépek sorrendjét a
                napi jelentéshez.
              </p>
              <Select
                label="Egység"
                value={orderUnitId}
                onChange={(e) => setOrderUnitId(e.target.value)}
                options={[
                  { value: '', label: 'Válassz egységet...' },
                  ...units
                    .filter((u) => u.type === 'restaurant')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
              {orderUnitId && <CashRegisterOrderCard unitId={orderUnitId} />}
            </div>
          ) : (
            <CashRegisterOrderCard unitId={unitId} />
          )}
        </Card>
      )}

      {/* Password Section - disabled: accounts use Microsoft 365 sign-in */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" />
            Jelszó módosítása
          </div>
        }
      >
        <p className="text-sm text-gray-500 mb-4">
          A bejelentkezés Microsoft 365 fiókkal történik, ezért a jelszó itt nem módosítható.
          A jelszavadat a Microsoft fiókod beállításaiban tudod megváltoztatni.
        </p>
        <div className="space-y-4 opacity-50 pointer-events-none select-none" aria-disabled="true">
          <Input
            label="Új jelszó"
            type="password"
            value=""
            disabled
            onChange={() => {}}
          />

          <Input
            label="Új jelszó megerősítése"
            type="password"
            value=""
            disabled
            onChange={() => {}}
          />

          <div className="pt-4">
            <Button type="button" disabled>
              Jelszó megváltoztatása
            </Button>
          </div>
        </div>
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

      {/* Strict accounting mode (Admin only, system-wide) */}
      {isAdmin && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gray-400" />
              Szigorú elszámolás mód
            </div>
          }
        >
          <p className="text-sm text-gray-500 mb-4">
            Bekapcsolva egy egység addig nem tud új napot rögzíteni, amíg az előző, adatot
            tartalmazó napja nincs rendben: minden eltérést fed a megfelelő elütés, és a zárás
            sorszáma meg a göngyölt forgalom ki van töltve. Az aznapi mentést nem tiltja, csak a
            továbblépést. Üres nap nem akadály. Adminnak van felülbírálás a rögzítő oldalon.
          </p>
          {!strict.available ? (
            <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
              Ehhez előbb futtasd le a <code>20260903_system_settings.sql</code> migrációt a
              Supabase-ben. Addig a mód kikapcsoltnak számít.
            </p>
          ) : (
            <div className="space-y-4 max-w-md">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Szigorú elszámolás</p>
                  <p className="text-sm text-gray-500">
                    {strict.enabled ? 'Bekapcsolva – minden egységre érvényes' : 'Kikapcsolva'}
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={strict.enabled}
                    disabled={strictSaving || strict.loading}
                    onChange={(e) =>
                      saveStrict({
                        enabled: e.target.checked,
                        // Bekapcsoláskor a mai nap a kezdet, ha még nincs dátum.
                        since: e.target.checked ? strict.since || getToday() : strict.since,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pepper-red/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pepper-red"></div>
                </div>
              </label>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Ettől a naptól számít</label>
                <DateInput
                  value={strict.since || ''}
                  onChange={(e) => saveStrict({ since: e.target.value || null })}
                  disabled={strictSaving || strict.loading}
                />
                <p className="text-xs text-gray-500">
                  A korábbi napok rendezetlensége nem zár le semmit – a bevezetés napjától indul a
                  szabály. Ez a beállítás az adatbázisban él, minden admin ugyanazt látja.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Default unit on open (Admin only) */}
      {isAdmin && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-400" />
              Alapértelmezett egység
            </div>
          }
        >
          <p className="text-sm text-gray-500 mb-4">
            Mely egység legyen kiválasztva, amikor megnyitod a napi jelentést vagy a riportokat.
          </p>
          <div className="space-y-4 max-w-md">
            <Select
              label="Mód"
              value={settings.defaultUnitMode}
              onChange={(e) => updateSetting('defaultUnitMode', e.target.value)}
              options={[
                { value: 'default', label: 'Alapértelmezett (első egység)' },
                { value: 'remember', label: 'Legutóbb megnyitott egység' },
                { value: 'specific', label: 'Megadott egység' },
              ]}
            />
            {settings.defaultUnitMode === 'specific' && (
              <Select
                label="Egység"
                value={settings.defaultUnitId}
                onChange={(e) => updateSetting('defaultUnitId', e.target.value)}
                options={[
                  { value: '', label: 'Válassz egységet...' },
                  ...units
                    .filter((u) => u.type === 'restaurant')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
            )}
            <p className="text-xs text-gray-400">
              Ez a beállítás ehhez a böngészőhöz tartozik (helyileg tárolva).
            </p>
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
