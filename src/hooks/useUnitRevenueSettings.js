import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useUnitRevenueSettings(unitId) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!unitId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('unit_revenue_settings')
        .select('*')
        .eq('unit_id', unitId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Return defaults if no settings exist
      setSettings(data || {
        show_vip: true,
        show_protocol: true,
        show_mckinsey: false,
        show_ordit: false,
        show_event_revenue: false,
      });
    } catch (error) {
      console.error('Error fetching unit revenue settings:', error);
      setSettings({
        show_vip: true,
        show_protocol: true,
        show_mckinsey: false,
        show_ordit: false,
        show_event_revenue: false,
      });
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

export function useAllUnitRevenueSettings() {
  const [allSettings, setAllSettings] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [unitsResult, settingsResult] = await Promise.all([
        supabase
          .from('units')
          .select('id, name, type')
          .eq('type', 'restaurant')
          .order('name'),
        supabase
          .from('unit_revenue_settings')
          .select('*'),
      ]);

      if (unitsResult.error) throw unitsResult.error;

      const unitsData = unitsResult.data || [];
      const settingsData = settingsResult.data || [];

      // Create a map of settings by unit_id
      const settingsMap = {};
      settingsData.forEach((s) => {
        settingsMap[s.unit_id] = s;
      });

      // Merge units with their settings (or defaults)
      const merged = unitsData.map((unit) => ({
        ...unit,
        settings: settingsMap[unit.id] || {
          show_vip: true,
          show_protocol: true,
          show_mckinsey: unit.name === 'Államkincstár',
          show_ordit: false,
          show_event_revenue: false,
        },
      }));

      setUnits(unitsData);
      setAllSettings(merged);
    } catch (error) {
      console.error('Error fetching all unit revenue settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateSettings = async (unitId, newSettings) => {
    try {
      // Try to update first
      const { data: existingData } = await supabase
        .from('unit_revenue_settings')
        .select('id')
        .eq('unit_id', unitId)
        .single();

      if (existingData) {
        // Update existing
        const { error } = await supabase
          .from('unit_revenue_settings')
          .update(newSettings)
          .eq('unit_id', unitId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('unit_revenue_settings')
          .insert([{ unit_id: unitId, ...newSettings }]);

        if (error) throw error;
      }

      // Update local state
      setAllSettings((prev) =>
        prev.map((item) =>
          item.id === unitId
            ? { ...item, settings: { ...item.settings, ...newSettings } }
            : item
        )
      );

      toast.success('Beállítások mentve');
    } catch (error) {
      console.error('Error updating unit revenue settings:', error);
      toast.error('Hiba a beállítások mentésekor');
      throw error;
    }
  };

  return { allSettings, units, loading, updateSettings, refetch: fetchAll };
}
