import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, LoadingSpinner } from '../common';
import { formatCurrency } from '../../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Banknote,
  AlertTriangle,
} from 'lucide-react';

// Hungarian month names
const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
];

export default function MonthlyTableReport({ yearMonth, onDataLoaded }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReportData() {
      if (!yearMonth) return;

      setLoading(true);
      setError(null);

      try {
        // Parse month range
        const [year, month] = yearMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        // Fetch all required data in parallel
        const [
          unitsResult,
          dailyRevenueResult,
          houseCashResult,
          expensesResult,
          eventsResult,
          eventRevenuesResult,
          eventExpensesResult,
          monthlyDataResult,
        ] = await Promise.all([
          // Units
          supabase.from('units').select('*').eq('is_active', true),

          // Daily revenue for all units in the month
          supabase
            .from('daily_revenue')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate),

          // House cash for all units in the month
          supabase
            .from('house_cash')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate),

          // All expenses in the month
          supabase
            .from('expenses')
            .select('*')
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate),

          // Events in the month
          supabase
            .from('events')
            .select('*')
            .gte('event_date', startDate)
            .lte('event_date', endDate),

          // Event revenues
          supabase
            .from('event_revenues')
            .select('*, events!inner(*)')
            .gte('events.event_date', startDate)
            .lte('events.event_date', endDate),

          // Event expenses
          supabase
            .from('event_expenses')
            .select('*, events!inner(*)')
            .gte('events.event_date', startDate)
            .lte('events.event_date', endDate),

          // Monthly financial data (manual entries)
          supabase
            .from('monthly_financial_data')
            .select('*')
            .eq('year_month', yearMonth),
        ]);

        // Check for errors
        const results = [
          unitsResult, dailyRevenueResult, houseCashResult,
          expensesResult, eventsResult, eventRevenuesResult,
          eventExpensesResult, monthlyDataResult
        ];

        for (const result of results) {
          if (result.error) throw result.error;
        }

        // Process data
        const units = unitsResult.data || [];
        const restaurantUnits = units.filter(u => u.type === 'restaurant');
        const eventsUnit = units.find(u => u.type === 'events');

        const dailyRevenue = dailyRevenueResult.data || [];
        // houseCash data available for future use
        const _houseCash = houseCashResult.data || [];
        const expenses = expensesResult.data || [];
        const events = eventsResult.data || [];
        const eventRevenues = eventRevenuesResult.data || [];
        const eventExpenses = eventExpensesResult.data || [];
        const monthlyData = monthlyDataResult.data || [];

        // Build report data structure
        const report = {
          yearMonth,
          monthName: `${year}. ${MONTH_NAMES[month - 1]}`,
          units: [],
          eventsUnit: null,
          specialCategories: [],
          totals: {
            revenue: 0,
            costs: 0,
            profit: 0,
          },
        };

        // Process each restaurant unit
        for (const unit of restaurantUnits) {
          const unitDailyRevenue = dailyRevenue.filter(r => r.unit_id === unit.id);
          const unitExpenses = expenses.filter(e => e.unit_id === unit.id);
          const unitMonthlyData = monthlyData.find(m => m.unit_id === unit.id) || {};

          // Calculate revenue
          const totalRevenue = unitDailyRevenue.reduce((sum, r) => sum + (parseFloat(r.total_revenue) || 0), 0);

          // Calculate costs from expenses
          const cashExpenses = unitExpenses
            .filter(e => e.payment_method === 'cash')
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

          const efoExpenses = unitExpenses
            .filter(e => e.is_efo)
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

          // Monthly data fields
          const transferExpenses = parseFloat(unitMonthlyData.transfer_expenses) || 0;
          const paidWages = parseFloat(unitMonthlyData.paid_wages) || 0;
          const wageContributions = parseFloat(unitMonthlyData.wage_contributions) || 0;
          const equipmentExpenses = parseFloat(unitMonthlyData.equipment_expenses) || 0;
          const rentUtilities = parseFloat(unitMonthlyData.rent_utilities) || 0;
          const rawMaterialDist = parseFloat(unitMonthlyData.raw_material_distribution) || 0;
          const wageDist = parseFloat(unitMonthlyData.wage_distribution) || 0;
          const subvention = parseFloat(unitMonthlyData.subvention) || 0;

          const totalCosts = cashExpenses + efoExpenses + transferExpenses +
            paidWages + wageContributions + equipmentExpenses + rentUtilities +
            rawMaterialDist + wageDist;

          const totalRevenueWithSubvention = totalRevenue + subvention;
          const profit = totalRevenueWithSubvention - totalCosts;

          report.units.push({
            id: unit.id,
            name: unit.name,
            revenue: {
              daily: totalRevenue,
              subvention,
              total: totalRevenueWithSubvention,
            },
            costs: {
              cashExpenses,
              efoExpenses,
              transferExpenses,
              paidWages,
              wageContributions,
              equipmentExpenses,
              rentUtilities,
              rawMaterialDist,
              wageDist,
              total: totalCosts,
            },
            profit,
          });

          report.totals.revenue += totalRevenueWithSubvention;
          report.totals.costs += totalCosts;
        }

        // Process events unit
        if (eventsUnit) {
          const eventsRevenue = eventRevenues.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
          const eventsExpensesTotal = eventExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
          const eventsUnitMonthlyData = monthlyData.find(m => m.unit_id === eventsUnit.id) || {};

          const transferExpenses = parseFloat(eventsUnitMonthlyData.transfer_expenses) || 0;
          const totalCosts = eventsExpensesTotal + transferExpenses;

          report.eventsUnit = {
            id: eventsUnit.id,
            name: eventsUnit.name,
            eventCount: events.length,
            revenue: {
              total: eventsRevenue,
            },
            costs: {
              eventExpenses: eventsExpensesTotal,
              transferExpenses,
              total: totalCosts,
            },
            profit: eventsRevenue - totalCosts,
          };

          report.totals.revenue += eventsRevenue;
          report.totals.costs += totalCosts;
        }

        // Process special categories
        const k0Data = monthlyData.find(m => m.category === 'K0') || {};
        const k00Data = monthlyData.find(m => m.category === 'K00') || {};
        const bankCostsData = monthlyData.find(m => m.category === 'bank_costs') || {};

        // K0
        const k0Revenue = parseFloat(k0Data.k0_revenue) || 0;
        const k0Costs = (parseFloat(k0Data.transfer_expenses) || 0) +
          (parseFloat(k0Data.paid_wages) || 0) +
          (parseFloat(k0Data.wage_contributions) || 0);

        report.specialCategories.push({
          id: 'K0',
          name: 'K0',
          revenue: k0Revenue,
          costs: k0Costs,
          profit: k0Revenue - k0Costs,
        });

        report.totals.revenue += k0Revenue;
        report.totals.costs += k0Costs;

        // K00
        const k00Costs = parseFloat(k00Data.transfer_expenses) || 0;
        report.specialCategories.push({
          id: 'K00',
          name: 'K00',
          revenue: 0,
          costs: k00Costs,
          profit: -k00Costs,
        });

        report.totals.costs += k00Costs;

        // Bank costs
        const bankCosts = parseFloat(bankCostsData.bank_costs_amount) || 0;
        report.specialCategories.push({
          id: 'bank_costs',
          name: 'Bankköltségek',
          revenue: 0,
          costs: bankCosts,
          profit: -bankCosts,
        });

        report.totals.costs += bankCosts;

        // Calculate total profit
        report.totals.profit = report.totals.revenue - report.totals.costs;

        setReportData(report);

        // Callback for export functionality
        if (onDataLoaded) {
          onDataLoaded(report);
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [yearMonth, onDataLoaded]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center gap-3 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <p>Hiba történt az adatok betöltésekor: {error}</p>
        </div>
      </Card>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Összes bevétel</p>
              <p className="text-xl font-bold text-green-800">
                {formatCurrency(reportData.totals.revenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-red-700">Összes költség</p>
              <p className="text-xl font-bold text-red-800">
                {formatCurrency(reportData.totals.costs)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 ${reportData.totals.profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-3">
            <Banknote className={`h-8 w-8 ${reportData.totals.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            <div>
              <p className={`text-sm ${reportData.totals.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Eredmény</p>
              <p className={`text-xl font-bold ${reportData.totals.profit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                {formatCurrency(reportData.totals.profit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Restaurant Units */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            Éttermi egységek
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Egység</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Napi bevétel</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Szubvenció</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 bg-green-50">Bevétel összesen</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Készpénz költség</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">EFO</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Utalásos</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Bér+járulék</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Eszköz/Bérlet</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Disztrib.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 bg-red-50">Költség összesen</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 bg-blue-50">Eredmény</th>
              </tr>
            </thead>
            <tbody>
              {reportData.units.map((unit, idx) => (
                <tr key={unit.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-gray-900">{unit.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(unit.revenue.daily)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(unit.revenue.subvention)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold bg-green-50 text-green-800">
                    {formatCurrency(unit.revenue.total)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(unit.costs.cashExpenses)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(unit.costs.efoExpenses)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(unit.costs.transferExpenses)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(unit.costs.paidWages + unit.costs.wageContributions)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(unit.costs.equipmentExpenses + unit.costs.rentUtilities)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(unit.costs.rawMaterialDist + unit.costs.wageDist)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold bg-red-50 text-red-800">
                    {formatCurrency(unit.costs.total)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold bg-blue-50 ${unit.profit >= 0 ? 'text-blue-800' : 'text-orange-700'}`}>
                    {formatCurrency(unit.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Events Unit */}
      {reportData.eventsUnit && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-200 bg-purple-50">
            <h3 className="font-semibold text-gray-900">
              🎉 {reportData.eventsUnit.name} ({reportData.eventsUnit.eventCount} esemény)
            </h3>
          </div>
          <div className="p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Bevétel</p>
                <p className="text-lg font-semibold text-green-700">
                  {formatCurrency(reportData.eventsUnit.revenue.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Költség</p>
                <p className="text-lg font-semibold text-red-700">
                  {formatCurrency(reportData.eventsUnit.costs.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Eredmény</p>
                <p className={`text-lg font-semibold ${reportData.eventsUnit.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {formatCurrency(reportData.eventsUnit.profit)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Special Categories */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-gray-500" />
            Speciális kategóriák
          </h3>
        </div>
        <div className="divide-y">
          {reportData.specialCategories.map(cat => (
            <div key={cat.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{cat.name}</p>
              </div>
              <div className="flex gap-8 text-right">
                <div>
                  <p className="text-xs text-gray-500">Bevétel</p>
                  <p className="font-mono">{formatCurrency(cat.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Költség</p>
                  <p className="font-mono">{formatCurrency(cat.costs)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Eredmény</p>
                  <p className={`font-mono font-semibold ${cat.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {formatCurrency(cat.profit)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
