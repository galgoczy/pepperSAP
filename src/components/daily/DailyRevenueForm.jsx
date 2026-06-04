import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Save, Palette, Calculator, AlertCircle, Star, Building, Landmark, Banknote, Radio, PartyPopper, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { useDailyRevenue } from '../../hooks/useDailyRevenue';
import { useActiveCashRegisters, useAllCashRegisterRevenue, useRegisterClosureBaselines } from '../../hooks/useCashRegisterRevenue';
import { useProtocolItems } from '../../hooks/useProtocolItems';
import { useUnitRevenueSettings } from '../../hooks/useUnitRevenueSettings';
import { useEventRevenueValidation } from '../../hooks/useEventRevenueValidation';
import { Card, Button, Input, LoadingSpinner } from '../common';
import CashRegisterSection from './CashRegisterSection';
import ProtocolItemsSection from './ProtocolItemsSection';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

const VAT_RATES = [
  { value: 27, label: '27%' },
  { value: 18, label: '18%' },
  { value: 5, label: '5%' },
  { value: 0, label: '0%' },
];

const MARK_COLORS = [
  { value: null, label: 'Nincs', className: 'bg-gray-100 border-gray-300' },
  { value: 'red', label: 'Piros', className: 'bg-red-500 border-red-600' },
  { value: 'yellow', label: 'Sárga', className: 'bg-yellow-400 border-yellow-500' },
  { value: 'green', label: 'Zöld', className: 'bg-green-500 border-green-600' },
  { value: 'blue', label: 'Kék', className: 'bg-blue-500 border-blue-600' },
  { value: 'purple', label: 'Lila', className: 'bg-purple-500 border-purple-600' },
];

// Stable key identifying a single closure (one register can have several per day).
const closureKeyOf = (registerId, closureNumber) => `${registerId}#${closureNumber}`;

// A closure's turnover = sum of the VAT buckets (gross, tips excluded), i.e. the
// "Forgalom" shown in the box. Used for the cumulative ("göngyölt") revenue check.
const closureTurnover = (data) =>
  (parseFloat(data?.vat_0_percent) || 0) +
  (parseFloat(data?.vat_5_percent) || 0) +
  (parseFloat(data?.vat_18_percent) || 0) +
  (parseFloat(data?.vat_27_percent) || 0);

const CUMULATIVE_TOLERANCE = 1; // Ft; rounding tolerance for the göngyölt check

export default function DailyRevenueForm({ date, unitId, unitName }) {
  const { revenue, loading: revenueLoading, saveRevenue, ensureRevenueExists } = useDailyRevenue(unitId, date);
  const { cashRegisters, loading: registersLoading } = useActiveCashRegisters(unitId, date);
  const { revenues: cashRegisterRevenues, saveAllRevenues } = useAllCashRegisterRevenue(revenue?.id);
  const { settings: revenueSettings, loading: settingsLoading, updateSettings: updateRevenueSettings } = useUnitRevenueSettings(unitId);
  const multiClosuresEnabled = revenueSettings?.multiple_closures_enabled ?? false;
  const { items: protocolItems, totalAmount: protocolItemsTotal, createItem: createProtocolItem, updateItem: updateProtocolItem, deleteItem: deleteProtocolItem, setDailyRevenueId } = useProtocolItems(revenue?.id);
  const { validationResult: eventValidation, validateEventRevenue } = useEventRevenueValidation(unitId, date);

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    total_revenue: '',
    guest_count: '',
    mark_color: null,
    software_revenue_manual_override: false,
    // VIP fields
    vip_loading: '',
    vip_revenue: '',
    // Protocol revenue (simple mode)
    protocol_net: '',
    protocol_gross: '',
    protocol_vat_rate: 27,
    // McKinsey revenue
    mckinsey_net: '',
    mckinsey_gross: '',
    mckinsey_vat_rate: 27,
    // Extra cash revenue
    extra_cash_revenue: '',
    // Actual tips (recorded only, not used in any calculation)
    actual_tips: '',
    // Ordit revenue (new)
    ordit_net: '',
    ordit_gross: '',
    ordit_vat_rate: 27,
    // Event revenue (new)
    event_revenue_net: '',
    event_revenue_gross: '',
    event_revenue_vat_rate: 27,
  });
  const [expandedRegisters, setExpandedRegisters] = useState({});
  const cashRegisterDataRef = useRef({});
  const [perRegisterSoftwareSum, setPerRegisterSoftwareSum] = useState(0);
  const [perRegisterGuestSum, setPerRegisterGuestSum] = useState(0);
  const [perRegisterTipsSum, setPerRegisterTipsSum] = useState(0);

  // Multiple closures per register: manually added closures and removed ones.
  const [extraClosures, setExtraClosures] = useState([]); // [{ registerId, closureNumber }]
  const [removedKeys, setRemovedKeys] = useState(() => new Set());
  const [closureValidations, setClosureValidations] = useState({}); // key -> warnings

  // Chronologically-previous closure per register (for sequence / cumulative checks)
  const registerIds = useMemo(() => cashRegisters.map((r) => r.id), [cashRegisters]);
  const { baselines } = useRegisterClosureBaselines(registerIds, date);

  // Existing saved closures indexed by closure key.
  const existingByKey = useMemo(() => {
    const map = {};
    cashRegisterRevenues.forEach((r) => {
      map[closureKeyOf(r.cash_register_id, r.closure_number ?? 1)] = r;
    });
    return map;
  }, [cashRegisterRevenues]);

  // The list of closures to render: every register has closure #1, plus any
  // extra closures the user added, minus the ones they removed. Ordered by
  // register (as in cashRegisters) then by closure number.
  const closureList = useMemo(() => {
    const result = [];
    cashRegisters.forEach((register) => {
      const existingNums = cashRegisterRevenues
        .filter((r) => r.cash_register_id === register.id)
        .map((r) => r.closure_number ?? 1);
      const extraNums = extraClosures
        .filter((c) => c.registerId === register.id)
        .map((c) => c.closureNumber);
      const nums = Array.from(new Set([1, ...existingNums, ...extraNums]))
        .filter((n) => !removedKeys.has(closureKeyOf(register.id, n)))
        .sort((a, b) => a - b);
      nums.forEach((n) => {
        result.push({ register, closureNumber: n, key: closureKeyOf(register.id, n) });
      });
    });
    return result;
  }, [cashRegisters, cashRegisterRevenues, extraClosures, removedKeys]);

  useEffect(() => {
    const expanded = {};
    closureList.forEach((c, index) => {
      expanded[c.key] = index === 0 || closureList.length <= 2 || c.closureNumber > 1;
    });
    setExpandedRegisters(expanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashRegisters]);

  useEffect(() => {
    if (revenue) {
      setFormData({
        total_revenue: revenue.total_revenue || '',
        guest_count: revenue.guest_count || '',
        mark_color: revenue.mark_color || null,
        software_revenue_manual_override: revenue.software_revenue_manual_override || false,
        vip_loading: revenue.vip_loading || '',
        vip_revenue: revenue.vip_revenue || '',
        protocol_net: revenue.protocol_net || '',
        protocol_gross: revenue.protocol_gross || '',
        protocol_vat_rate: revenue.protocol_vat_rate ?? 27,
        mckinsey_net: revenue.mckinsey_net || '',
        mckinsey_gross: revenue.mckinsey_gross || '',
        mckinsey_vat_rate: revenue.mckinsey_vat_rate ?? 27,
        extra_cash_revenue: revenue.extra_cash_revenue || '',
        actual_tips: revenue.actual_tips || '',
        ordit_net: revenue.ordit_net || '',
        ordit_gross: revenue.ordit_gross || '',
        ordit_vat_rate: revenue.ordit_vat_rate ?? 27,
        event_revenue_net: revenue.event_revenue_net || '',
        event_revenue_gross: revenue.event_revenue_gross || '',
        event_revenue_vat_rate: revenue.event_revenue_vat_rate ?? 27,
      });
    } else {
      setFormData({
        total_revenue: '',
        guest_count: '',
        mark_color: null,
        software_revenue_manual_override: false,
        vip_loading: '',
        vip_revenue: '',
        protocol_net: '',
        protocol_gross: '',
        protocol_vat_rate: 27,
        mckinsey_net: '',
        mckinsey_gross: '',
        mckinsey_vat_rate: 27,
        extra_cash_revenue: '',
        actual_tips: '',
        ordit_net: '',
        ordit_gross: '',
        ordit_vat_rate: 27,
        event_revenue_net: '',
        event_revenue_gross: '',
        event_revenue_vat_rate: 27,
      });
    }
  }, [revenue, date]);

  const mergedForKey = useCallback(
    (key) => cashRegisterDataRef.current[key] || existingByKey[key] || {},
    [existingByKey]
  );

  // Recompute the cross-closure sums and the per-closure validations (closure
  // sequence number and cumulative "göngyölt" revenue). Returns the software
  // revenue sum so callers can mirror it into total_revenue.
  const recomputeDerived = useCallback(() => {
    let software = 0;
    let guests = 0;
    let tips = 0;
    const validations = {};

    const byRegister = {};
    closureList.forEach((c) => {
      (byRegister[c.register.id] = byRegister[c.register.id] || []).push(c);
    });

    Object.entries(byRegister).forEach(([registerId, closures]) => {
      const base = baselines[registerId];
      let predecessor = base ? { sequence: base.sequence, cumulative: base.cumulative } : null;

      closures.forEach((c) => {
        const data = mergedForKey(c.key);
        software += parseFloat(data.software_revenue) || 0;
        guests += parseInt(data.guest_count, 10) || 0;
        tips += parseFloat(data.tips) || 0;

        const turnover = closureTurnover(data);
        const seq =
          data.closure_sequence === '' || data.closure_sequence == null
            ? null
            : parseInt(data.closure_sequence, 10);
        const cum =
          data.cumulative_revenue === '' || data.cumulative_revenue == null
            ? null
            : parseFloat(data.cumulative_revenue);

        let sequenceWarning = null;
        let expectedSequence = null;
        if (predecessor && predecessor.sequence != null) {
          expectedSequence = predecessor.sequence + 1;
          if (seq != null && seq !== expectedSequence) sequenceWarning = expectedSequence;
        }

        let cumulativeWarning = null;
        let expectedCumulative = null;
        if (predecessor && predecessor.cumulative != null) {
          expectedCumulative = predecessor.cumulative + turnover;
          if (cum != null && Math.abs(cum - expectedCumulative) > CUMULATIVE_TOLERANCE) {
            cumulativeWarning = expectedCumulative;
          }
        }

        validations[c.key] = {
          sequenceWarning,
          expectedSequence,
          cumulativeWarning,
          expectedCumulative,
        };

        // Chain: the next closure of this register is checked against this one.
        predecessor = { sequence: seq, cumulative: cum };
      });
    });

    setPerRegisterSoftwareSum(software);
    setPerRegisterGuestSum(guests);
    setPerRegisterTipsSum(tips);
    setClosureValidations(validations);
    return software;
  }, [closureList, baselines, mergedForKey]);

  useEffect(() => {
    recomputeDerived();
  }, [recomputeDerived]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Generic net/gross/vat handler factory
  const createVatHandlers = (prefix) => ({
    handleNetChange: (value) => {
      const net = parseFloat(value) || 0;
      const vatRate = formData[`${prefix}_vat_rate`] / 100;
      const gross = Math.round(net * (1 + vatRate));
      setFormData((prev) => ({
        ...prev,
        [`${prefix}_net`]: value,
        [`${prefix}_gross`]: gross > 0 ? gross.toString() : '',
      }));
    },
    handleGrossChange: (value) => {
      const gross = parseFloat(value) || 0;
      const vatRate = formData[`${prefix}_vat_rate`] / 100;
      const net = Math.round(gross / (1 + vatRate));
      setFormData((prev) => ({
        ...prev,
        [`${prefix}_gross`]: value,
        [`${prefix}_net`]: net > 0 ? net.toString() : '',
      }));
    },
    handleVatChange: (value) => {
      const vatRate = parseFloat(value) / 100;
      const net = parseFloat(formData[`${prefix}_net`]) || 0;
      const gross = Math.round(net * (1 + vatRate));
      setFormData((prev) => ({
        ...prev,
        [`${prefix}_vat_rate`]: parseFloat(value),
        [`${prefix}_gross`]: gross > 0 ? gross.toString() : '',
      }));
    },
  });

  const protocolHandlers = createVatHandlers('protocol');
  const mckinseyHandlers = createVatHandlers('mckinsey');
  const orditHandlers = createVatHandlers('ordit');
  const eventRevenueHandlers = createVatHandlers('event_revenue');

  // Wrapper to ensure daily_revenue exists before creating protocol items
  const handleCreateProtocolItem = async (itemData) => {
    console.log('handleCreateProtocolItem called, current revenue:', revenue);
    let revenueId = revenue?.id;
    if (!revenueId) {
      console.log('No revenue ID, creating new daily_revenue...');
      const newRevenue = await ensureRevenueExists();
      console.log('ensureRevenueExists returned:', newRevenue);
      if (newRevenue?.id) {
        revenueId = newRevenue.id;
        setDailyRevenueId(revenueId);
      }
    }
    if (revenueId) {
      console.log('Calling createProtocolItem with revenueId:', revenueId);
      return createProtocolItem(itemData, revenueId);
    } else {
      console.error('No revenue ID available, cannot create protocol item');
      throw new Error('Nem sikerült a napi adatot létrehozni');
    }
  };

  // Validate event revenue when it changes
  useEffect(() => {
    if (formData.event_revenue_gross && revenueSettings?.show_event_revenue) {
      validateEventRevenue(formData.event_revenue_gross);
    }
  }, [formData.event_revenue_gross, validateEventRevenue, revenueSettings?.show_event_revenue]);

  const handleCashRegisterChange = (key, data) => {
    cashRegisterDataRef.current[key] = data;
    const software = recomputeDerived();
    if (!formData.software_revenue_manual_override && software > 0) {
      setFormData((prev) => ({ ...prev, total_revenue: software.toString() }));
    }
  };

  const toggleExpand = (key) => {
    setExpandedRegisters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Add another closure for a register on this day.
  const addClosure = (registerId) => {
    const nums = closureList
      .filter((c) => c.register.id === registerId)
      .map((c) => c.closureNumber);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    setExtraClosures((prev) => [...prev, { registerId, closureNumber: next }]);
    setExpandedRegisters((prev) => ({ ...prev, [closureKeyOf(registerId, next)]: true }));
  };

  // Remove a closure (only additional ones, i.e. closure number > 1).
  const removeClosure = (registerId, closureNumber) => {
    if (closureNumber <= 1) return;
    const key = closureKeyOf(registerId, closureNumber);
    setRemovedKeys((prev) => new Set(prev).add(key));
    setExtraClosures((prev) =>
      prev.filter((c) => !(c.registerId === registerId && c.closureNumber === closureNumber))
    );
    delete cashRegisterDataRef.current[key];
  };

  // Fields that belong to a cash_register_revenue row (everything else on an
  // existing row — id, joins, timestamps — must not be sent back).
  const CLOSURE_FIELDS = [
    'software_revenue', 'guest_count',
    'vat_0_percent', 'vat_5_percent', 'vat_18_percent', 'vat_27_percent',
    'tips', 'discrepancies',
    'cash_payment', 'card_payment', 'szep_card_payment',
    'terminal_card', 'terminal_szep', 'terminal_discrepancy_note',
    'closure_sequence', 'cumulative_revenue',
  ];

  const buildClosuresToSave = () =>
    closureList.map((c) => {
      const src = mergedForKey(c.key);
      const fields = {};
      CLOSURE_FIELDS.forEach((f) => {
        if (src[f] !== undefined) fields[f] = src[f];
      });
      return {
        cash_register_id: c.register.id,
        closure_number: c.closureNumber,
        ...fields,
      };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitId) return;

    setSaving(true);
    try {
      // If protocol items exist, override protocol_gross with items total
      const protocolGrossToSave = protocolItems.length > 0
        ? protocolItemsTotal.toString()
        : formData.protocol_gross;

      const savedRevenue = await saveRevenue({
        ...formData,
        protocol_gross: protocolGrossToSave,
        // Actual tips: sum of the per-closure tip amounts (recorded only, not
        // part of any turnover calculation).
        actual_tips: perRegisterTipsSum,
        // Guest count: sum of the per-closure values when present, otherwise the
        // manually entered value.
        guest_count: perRegisterGuestSum > 0 ? perRegisterGuestSum : formData.guest_count,
      });

      if (closureList.length > 0 && savedRevenue?.id) {
        await saveAllRevenues(buildClosuresToSave(), savedRevenue.id);
        // Added / removed closures are now reflected in the refetched data.
        setExtraClosures([]);
        setRemovedKeys(new Set());
      }

      toast.success('Napi adatok sikeresen mentve!');
    } catch (error) {
      console.error('Error saving daily revenue:', error);
    } finally {
      setSaving(false);
    }
  };

  const totalCashRegisterRevenue = closureList.reduce(
    (sum, c) => sum + closureTurnover(mergedForKey(c.key)),
    0
  );

  const loading = revenueLoading || registersLoading || settingsLoading;

  if (!unitId) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">
          Válassz ki egy egységet a folytatáshoz
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Determine which sections to show based on settings
  const showVip = revenueSettings?.show_vip ?? true;
  const showProtocol = revenueSettings?.show_protocol ?? true;
  const showMcKinsey = revenueSettings?.show_mckinsey ?? false;
  const showOrdit = revenueSettings?.show_ordit ?? false;
  const showEventRevenue = revenueSettings?.show_event_revenue ?? false;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Software revenue */}
      <Card title="Éttermi szoftver forgalom">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Teljes forgalom
              </label>
              {perRegisterSoftwareSum > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.software_revenue_manual_override}
                    onChange={(e) => {
                      const isManual = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        software_revenue_manual_override: isManual,
                        total_revenue: isManual ? prev.total_revenue : perRegisterSoftwareSum.toString(),
                      }));
                    }}
                    className="h-4 w-4 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
                  />
                  Kézi megadás
                </label>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              value={formData.total_revenue}
              onChange={(e) => {
                handleChange('total_revenue', e.target.value);
                if (perRegisterSoftwareSum > 0) {
                  handleChange('software_revenue_manual_override', true);
                }
              }}
              suffix="Ft"
            />
            {perRegisterSoftwareSum > 0 && !formData.software_revenue_manual_override && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Automatikusan összegezve a pénztárgépekből
              </p>
            )}
            {perRegisterSoftwareSum > 0 && formData.software_revenue_manual_override && (
              <p className="text-xs text-gray-500 mt-1">
                Pénztárgépek összege: {formatCurrency(perRegisterSoftwareSum)}
              </p>
            )}
          </div>
          {perRegisterGuestSum > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Napi fogyasztói létszám (összesen)
              </label>
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900">
                {perRegisterGuestSum} fő
              </div>
              <p className="text-xs text-gray-500 mt-1">
                A pénztárgépeknél megadott létszámok összege
              </p>
            </div>
          ) : (
            <Input
              label="Napi fogyasztói létszám"
              type="number"
              step="1"
              min="0"
              value={formData.guest_count}
              onChange={(e) => handleChange('guest_count', e.target.value)}
              suffix="fő"
              helper="Add meg kézzel, vagy töltsd ki a pénztárgépeknél (akkor automatikusan összegződik)"
            />
          )}
        </div>
      </Card>

      {/* Cash registers section (entry) */}
      {cashRegisters.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">
              Nincsenek aktív pénztárgépek
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Először vegyél fel pénztárgépeket az Egységek menüben
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-pepper-red" />
                Pénztárgépek ({cashRegisters.length})
              </h2>
              {/* Unit-level toggle: multiple closures per register per day */}
              <button
                type="button"
                role="switch"
                aria-checked={multiClosuresEnabled}
                onClick={() => updateRevenueSettings({ multiple_closures_enabled: !multiClosuresEnabled })}
                className="flex items-center gap-2 text-sm text-gray-600"
                title="Egység-szintű beállítás"
              >
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    multiClosuresEnabled ? 'bg-pepper-red' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      multiClosuresEnabled ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </span>
                Több zárás / nap
              </button>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Összes forgalom</div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(totalCashRegisterRevenue)}
              </div>
            </div>
          </div>

          {cashRegisters.map((register) => {
            const registerClosures = closureList.filter((c) => c.register.id === register.id);
            // When the toggle is off, only the first closure is shown; any extra
            // closures stay in the data (totals/save) but are hidden from entry.
            const visibleClosures = multiClosuresEnabled
              ? registerClosures
              : registerClosures.filter((c) => c.closureNumber === 1);
            const multiple = visibleClosures.length > 1;
            return (
              <div key={register.id} className="space-y-3">
                {visibleClosures.map((c) => (
                  <CashRegisterSection
                    key={c.key}
                    register={register}
                    existingData={existingByKey[c.key]}
                    onChange={(data) => handleCashRegisterChange(c.key, data)}
                    expanded={expandedRegisters[c.key]}
                    onToggleExpand={() => toggleExpand(c.key)}
                    unitName={unitName}
                    date={date}
                    closureLabel={multiple ? `${c.closureNumber}. zárás` : null}
                    onRemove={c.closureNumber > 1 ? () => removeClosure(register.id, c.closureNumber) : null}
                    validation={closureValidations[c.key]}
                  />
                ))}
                {multiClosuresEnabled && (
                  <button
                    type="button"
                    onClick={() => addClosure(register.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-pepper-red border-2 border-dashed border-pepper-red border-opacity-40 rounded-lg hover:bg-pepper-red hover:bg-opacity-5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    További zárás a mai napra ({register.ap_number})
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIP Section */}
      {showVip && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              VIP
            </div>
          }
        >
          <p className="text-sm text-gray-500 mb-4">
            VIP adatok - csak tájékoztató jellegű, nem számít bele a forgalomba
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="VIP töltés"
              type="number"
              step="0.01"
              value={formData.vip_loading}
              onChange={(e) => handleChange('vip_loading', e.target.value)}
              suffix="Ft"
            />
            <Input
              label="VIP forgalom"
              type="number"
              step="0.01"
              value={formData.vip_revenue}
              onChange={(e) => handleChange('vip_revenue', e.target.value)}
              suffix="Ft"
            />
          </div>
        </Card>
      )}

      {/* Protocol Revenue Section */}
      {showProtocol && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-500" />
              Protokoll bevétel
              {protocolItems.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({protocolItems.length} tétel)
                </span>
              )}
            </div>
          }
        >
          <ProtocolItemsSection
            items={protocolItems}
            totalAmount={protocolItemsTotal}
            onCreateItem={handleCreateProtocolItem}
            onUpdateItem={updateProtocolItem}
            onDeleteItem={deleteProtocolItem}
            protocolNet={formData.protocol_net}
            protocolGross={formData.protocol_gross}
            protocolVatRate={formData.protocol_vat_rate}
            onProtocolNetChange={protocolHandlers.handleNetChange}
            onProtocolGrossChange={protocolHandlers.handleGrossChange}
            onProtocolVatChange={protocolHandlers.handleVatChange}
          />
        </Card>
      )}

      {/* McKinsey Revenue Section */}
      {showMcKinsey && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-600" />
              McKinsey bevétel
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Nettó összeg"
              type="number"
              step="0.01"
              value={formData.mckinsey_net}
              onChange={(e) => mckinseyHandlers.handleNetChange(e.target.value)}
              suffix="Ft"
            />
            <Input
              label="Bruttó összeg"
              type="number"
              step="0.01"
              value={formData.mckinsey_gross}
              onChange={(e) => mckinseyHandlers.handleGrossChange(e.target.value)}
              suffix="Ft"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ÁFA kulcs
              </label>
              <select
                value={formData.mckinsey_vat_rate}
                onChange={(e) => mckinseyHandlers.handleVatChange(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pepper-red focus:ring-pepper-red"
              >
                {VAT_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Ordit Revenue Section */}
      {showOrdit && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-orange-500" />
              Ordit bevétel
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Nettó összeg"
              type="number"
              step="0.01"
              value={formData.ordit_net}
              onChange={(e) => orditHandlers.handleNetChange(e.target.value)}
              suffix="Ft"
            />
            <Input
              label="Bruttó összeg"
              type="number"
              step="0.01"
              value={formData.ordit_gross}
              onChange={(e) => orditHandlers.handleGrossChange(e.target.value)}
              suffix="Ft"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ÁFA kulcs
              </label>
              <select
                value={formData.ordit_vat_rate}
                onChange={(e) => orditHandlers.handleVatChange(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pepper-red focus:ring-pepper-red"
              >
                {VAT_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Event Revenue Section */}
      {showEventRevenue && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-purple-500" />
              Rendezvény bevétel
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Nettó összeg"
                type="number"
                step="0.01"
                value={formData.event_revenue_net}
                onChange={(e) => eventRevenueHandlers.handleNetChange(e.target.value)}
                suffix="Ft"
              />
              <Input
                label="Bruttó összeg"
                type="number"
                step="0.01"
                value={formData.event_revenue_gross}
                onChange={(e) => eventRevenueHandlers.handleGrossChange(e.target.value)}
                suffix="Ft"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ÁFA kulcs
                </label>
                <select
                  value={formData.event_revenue_vat_rate}
                  onChange={(e) => eventRevenueHandlers.handleVatChange(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pepper-red focus:ring-pepper-red"
                >
                  {VAT_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event validation feedback */}
            {eventValidation && formData.event_revenue_gross && (
              <div className={`flex items-start gap-2 p-3 rounded-lg ${
                eventValidation.matches
                  ? 'bg-green-50 text-green-800'
                  : 'bg-amber-50 text-amber-800'
              }`}>
                {eventValidation.matches ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p>{eventValidation.message}</p>
                  {eventValidation.hasEvents && eventValidation.events && (
                    <p className="text-xs mt-1 opacity-75">
                      Rendezvények: {eventValidation.events.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Extra Cash Revenue */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" />
            Egyéb készpénz bevétel
          </div>
        }
      >
        <Input
          label="Összeg"
          type="number"
          step="0.01"
          value={formData.extra_cash_revenue}
          onChange={(e) => handleChange('extra_cash_revenue', e.target.value)}
          suffix="Ft"
          helper="Egyéb, pénztárgépen kívüli hivatalos készpénz bevétel"
        />
        <div className="mt-4">
          <Input
            label="Borravaló (pénztárgépenként összesítve)"
            type="text"
            value={formatCurrency(perRegisterTipsSum)}
            readOnly
            disabled
            helper="A pénztárgépeknél rögzített borravalók összege (a forgalomba nem számít bele)"
          />
        </div>
      </Card>

      {/* Color marking */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-600" />
            Megjelölés színnel
          </div>
        }
      >
        <p className="text-sm text-gray-500 mb-3">
          Jelöld meg ezt a napot egy színnel a könnyebb áttekinthetőség érdekében
        </p>
        <div className="flex flex-wrap gap-3">
          {MARK_COLORS.map((color) => (
            <button
              key={color.value || 'none'}
              type="button"
              onClick={() => handleChange('mark_color', color.value)}
              className={`
                w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center
                ${color.className}
                ${formData.mark_color === color.value
                  ? 'ring-2 ring-offset-2 ring-pepper-red scale-110'
                  : 'hover:scale-105'
                }
              `}
              title={color.label}
            >
              {formData.mark_color === color.value && (
                <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
        {formData.mark_color && (
          <p className="mt-3 text-sm text-gray-600">
            Kiválasztott szín: <span className="font-medium">{MARK_COLORS.find(c => c.value === formData.mark_color)?.label}</span>
          </p>
        )}
      </Card>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button type="submit" loading={saving} size="lg">
          <Save className="h-4 w-4" />
          {revenue ? 'Frissítés' : 'Mentés'}
        </Button>
      </div>
    </form>
  );
}
