import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useDailyRevenue(unitId, date) {
  const [revenue, setRevenue] = useState(null);
  const [cashRegisterTotals, setCashRegisterTotals] = useState({
    vat_0_percent: 0,
    vat_5_percent: 0,
    vat_18_percent: 0,
    vat_27_percent: 0,
    tips: 0,
    cash_payment: 0,
    card_payment: 0,
  });
  const [cashRegisterDetails, setCashRegisterDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = useCallback(async () => {
    if (!unitId || !date) {
      setRevenue(null);
      setCashRegisterTotals({
        vat_0_percent: 0,
        vat_5_percent: 0,
        vat_18_percent: 0,
        vat_27_percent: 0,
        tips: 0,
        cash_payment: 0,
        card_payment: 0,
      });
      setCashRegisterDetails([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch daily_revenue record
      const { data: dailyRevenue, error } = await supabase
        .from('daily_revenue')
        .select('*')
        .eq('unit_id', unitId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setRevenue(dailyRevenue || null);

      // If we have a daily_revenue record, fetch cash register data with register info
      if (dailyRevenue?.id) {
        const { data: cashRegisterData, error: crError } = await supabase
          .from('cash_register_revenue')
          .select(`
            *,
            cash_registers (
              id,
              ap_number,
              name
            )
          `)
          .eq('daily_revenue_id', dailyRevenue.id);

        if (!crError && cashRegisterData) {
          // Store detailed data for per-register display
          setCashRegisterDetails(cashRegisterData);

          // Aggregate all cash register data
          const totals = cashRegisterData.reduce(
            (acc, cr) => ({
              vat_0_percent: acc.vat_0_percent + (parseFloat(cr.vat_0_percent) || 0),
              vat_5_percent: acc.vat_5_percent + (parseFloat(cr.vat_5_percent) || 0),
              vat_18_percent: acc.vat_18_percent + (parseFloat(cr.vat_18_percent) || 0),
              vat_27_percent: acc.vat_27_percent + (parseFloat(cr.vat_27_percent) || 0),
              tips: acc.tips + (parseFloat(cr.tips) || 0),
              cash_payment: acc.cash_payment + (parseFloat(cr.cash_payment) || 0),
              card_payment: acc.card_payment + (parseFloat(cr.card_payment) || 0),
            }),
            {
              vat_0_percent: 0,
              vat_5_percent: 0,
              vat_18_percent: 0,
              vat_27_percent: 0,
              tips: 0,
              cash_payment: 0,
              card_payment: 0,
            }
          );
          setCashRegisterTotals(totals);
        } else {
          setCashRegisterDetails([]);
        }
      } else {
        setCashRegisterTotals({
          vat_0_percent: 0,
          vat_5_percent: 0,
          vat_18_percent: 0,
          vat_27_percent: 0,
          tips: 0,
          cash_payment: 0,
          card_payment: 0,
        });
        setCashRegisterDetails([]);
      }
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
      toast.error('Hiba a napi forgalom betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, date]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const saveRevenue = async (revenueData) => {
    // Remove mark_color if null to avoid errors when column doesn't exist
    const { mark_color, ...restData } = revenueData;

    // Numeric fields that should be converted to null if empty
    const numericFields = [
      'total_revenue', 'customer_count',
      'vip_loading', 'vip_revenue',
      'protocol_net', 'protocol_gross', 'protocol_vat_rate',
      'mckinsey_net', 'mckinsey_gross', 'mckinsey_vat_rate',
      'extra_cash_revenue'
    ];

    // Convert empty strings to null for numeric fields
    const cleanedData = Object.fromEntries(
      Object.entries(restData).map(([key, value]) => [
        key,
        value === '' ? null : (numericFields.includes(key) ? parseFloat(value) || null : value)
      ])
    );

    const dataToSave = {
      ...cleanedData,
      unit_id: unitId,
      date: date,
      ...(mark_color !== null && mark_color !== undefined && { mark_color }),
    };

    console.log('Attempting to save:', dataToSave);

    try {
      let result;
      if (revenue?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('daily_revenue')
          .update(dataToSave)
          .eq('id', revenue.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('daily_revenue')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      setRevenue(result);
      toast.success('Napi forgalom sikeresen mentve!');
      return result;
    } catch (error) {
      console.error('Error saving daily revenue:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Data attempted to save:', dataToSave);
      toast.error(`Hiba: ${error.message || error.code || 'Ismeretlen hiba'}`);
      throw error;
    }
  };

  return {
    revenue,
    cashRegisterTotals,
    cashRegisterDetails,
    loading,
    refetch: fetchRevenue,
    saveRevenue,
  };
}

export function useHouseCash(unitId, date) {
  const [houseCash, setHouseCash] = useState(null);
  const [previousDayClosing, setPreviousDayClosing] = useState(null);
  const [calculatedData, setCalculatedData] = useState({
    officialExpenses: 0,         // Hivatalos (számlás) kifizetések összesen
    nonOfficialExpenses: 0,      // Nem számlás kifizetések összesen
    totalCashRegisterCash: 0,    // Összes pénztárgép készpénz bevétel
    totalCashRegisterCard: 0,    // Összes pénztárgép bankkártya bevétel
    totalCashRegisterRevenue: 0, // Összes pénztárgép forgalom (ÁFA összesen)
    softwareRevenue: 0,          // Szoftver bevétel
    totalDiscrepancies: 0,       // Összes HUF elütés
    adjustedCash: 0,             // Készpénz - elütések (korrigált készpénz)
  });
  const [discrepancyDetails, setDiscrepancyDetails] = useState([]); // All discrepancy entries
  const [loading, setLoading] = useState(true);

  const fetchHouseCash = useCallback(async () => {
    if (!unitId || !date) {
      setHouseCash(null);
      setPreviousDayClosing(null);
      setCalculatedData({
        officialExpenses: 0,
        nonOfficialExpenses: 0,
        totalCashRegisterCash: 0,
        totalCashRegisterCard: 0,
        totalCashRegisterRevenue: 0,
        softwareRevenue: 0,
        totalDiscrepancies: 0,
        adjustedCash: 0,
      });
      setDiscrepancyDetails([]);
      setLoading(false);
      return;
    }

    try {
      // Calculate previous day
      const currentDate = new Date(date);
      currentDate.setDate(currentDate.getDate() - 1);
      const previousDay = currentDate.toISOString().split('T')[0];

      // Fetch all needed data in parallel
      const [currentResult, previousResult, expensesResult, dailyRevenueResult] = await Promise.all([
        supabase
          .from('house_cash')
          .select('*')
          .eq('unit_id', unitId)
          .eq('date', date)
          .maybeSingle(),
        supabase
          .from('house_cash')
          .select('official_total')
          .eq('unit_id', unitId)
          .eq('date', previousDay)
          .maybeSingle(),
        supabase
          .from('expenses')
          .select('amount, is_official, payment_method')
          .eq('unit_id', unitId)
          .eq('invoice_date', date),
        supabase
          .from('daily_revenue')
          .select('id, total_revenue')
          .eq('unit_id', unitId)
          .eq('date', date)
          .maybeSingle(),
      ]);

      if (currentResult.error) throw currentResult.error;
      if (previousResult.error && previousResult.error.code !== 'PGRST116') {
        console.error('Error fetching previous day:', previousResult.error);
      }

      // Calculate expenses
      const expenses = expensesResult.data || [];
      // Hivatalos (számlás) kifizetések - minden is_official=true
      const officialExpenses = expenses
        .filter(e => e.is_official === true)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      // Nem számlás kifizetések - is_official=false
      const nonOfficialExpenses = expenses
        .filter(e => e.is_official === false)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

      // Fetch cash register revenues separately if we have a daily_revenue record
      let cashRegisterRevenues = [];
      if (dailyRevenueResult.data?.id) {
        const { data: crData, error: crError } = await supabase
          .from('cash_register_revenue')
          .select(`
            cash_payment, card_payment,
            vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips,
            discrepancies, discrepancy_amount, discrepancy_currency, discrepancy_note,
            cash_registers (ap_number, name)
          `)
          .eq('daily_revenue_id', dailyRevenueResult.data.id);

        if (!crError) {
          cashRegisterRevenues = crData || [];
        }
      }

      // Calculate cash register totals
      const totalCashRegisterCash = cashRegisterRevenues.reduce(
        (sum, cr) => sum + (parseFloat(cr.cash_payment) || 0), 0
      );
      const totalCashRegisterCard = cashRegisterRevenues.reduce(
        (sum, cr) => sum + (parseFloat(cr.card_payment) || 0), 0
      );
      const totalCashRegisterRevenue = cashRegisterRevenues.reduce(
        (sum, cr) => sum +
          (parseFloat(cr.vat_0_percent) || 0) +
          (parseFloat(cr.vat_5_percent) || 0) +
          (parseFloat(cr.vat_18_percent) || 0) +
          (parseFloat(cr.vat_27_percent) || 0) +
          (parseFloat(cr.tips) || 0),
        0
      );

      // Calculate total HUF discrepancies from all cash registers
      // Handle both new array format and old single field format
      let totalDiscrepancies = 0;
      const allDiscrepancies = [];

      cashRegisterRevenues.forEach(cr => {
        const registerName = cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Pénztárgép';

        // New array format
        if (cr.discrepancies && Array.isArray(cr.discrepancies)) {
          cr.discrepancies.forEach(disc => {
            if (disc.currency === 'HUF') {
              totalDiscrepancies += parseFloat(disc.amount) || 0;
            }
            allDiscrepancies.push({
              ...disc,
              registerName,
            });
          });
        }
        // Old single field format (fallback)
        else if (cr.discrepancy_amount && parseFloat(cr.discrepancy_amount) !== 0) {
          if (cr.discrepancy_currency === 'HUF') {
            totalDiscrepancies += parseFloat(cr.discrepancy_amount) || 0;
          }
          allDiscrepancies.push({
            amount: cr.discrepancy_amount,
            currency: cr.discrepancy_currency || 'HUF',
            note: cr.discrepancy_note || '',
            registerName,
          });
        }
      });

      // Adjusted cash = total cash - HUF discrepancies
      const adjustedCash = totalCashRegisterCash - totalDiscrepancies;

      // Software revenue
      const softwareRevenue = parseFloat(dailyRevenueResult.data?.total_revenue) || 0;

      setHouseCash(currentResult.data || null);
      setPreviousDayClosing(previousResult.data?.official_total || null);
      setDiscrepancyDetails(allDiscrepancies);
      setCalculatedData({
        officialExpenses,
        nonOfficialExpenses,
        totalCashRegisterCash,
        totalCashRegisterCard,
        totalCashRegisterRevenue,
        softwareRevenue,
        totalDiscrepancies,
        adjustedCash,
      });
    } catch (error) {
      console.error('Error fetching house cash:', error);
      toast.error('Hiba a házipénztár betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, date]);

  useEffect(() => {
    fetchHouseCash();
  }, [fetchHouseCash]);

  const saveHouseCash = async (cashData) => {
    try {
      // Convert empty strings to null for numeric fields
      const cleanedData = Object.fromEntries(
        Object.entries(cashData).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      const dataToSave = {
        ...cleanedData,
        unit_id: unitId,
        date: date,
      };

      let result;
      if (houseCash?.id) {
        const { data, error } = await supabase
          .from('house_cash')
          .update(dataToSave)
          .eq('id', houseCash.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('house_cash')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      setHouseCash(result);
      toast.success('Házipénztár sikeresen mentve!');
      return result;
    } catch (error) {
      console.error('Error saving house cash:', error);
      toast.error('Hiba a házipénztár mentésekor');
      throw error;
    }
  };

  return {
    houseCash,
    previousDayClosing,
    calculatedData,
    discrepancyDetails,
    loading,
    refetch: fetchHouseCash,
    saveHouseCash,
  };
}

export function useDailyRevenueList(unitId, startDate, endDate) {
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenues = useCallback(async () => {
    try {
      let query = supabase
        .from('daily_revenue')
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRevenues(data || []);
    } catch (error) {
      console.error('Error fetching revenues:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, startDate, endDate]);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  return {
    revenues,
    loading,
    refetch: fetchRevenues,
  };
}
