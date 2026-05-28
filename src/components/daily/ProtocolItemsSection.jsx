import { useState } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Package, Utensils } from 'lucide-react';
import { Button, Input, Modal } from '../common';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useProjectNumberSuggestions } from '../../hooks/useProtocolItems';

const PACKAGE_OPTIONS = [
  { value: 1, label: '1 - Alap' },
  { value: 2, label: '2 - Standard' },
  { value: 3, label: '3 - Prémium' },
  { value: 4, label: '4 - Luxus' },
  { value: 5, label: '5 - VIP' },
];

const VAT_RATES = [
  { value: 27, label: '27%' },
  { value: 18, label: '18%' },
  { value: 5, label: '5%' },
  { value: 0, label: '0%' },
];

function BekeszitesForm({ item, onSave, onCancel }) {
  const { suggestions, fetchSuggestions } = useProjectNumberSuggestions();
  const [formData, setFormData] = useState({
    item_type: 'bekeszites',
    order_number: item?.order_number || '',
    cost_center: item?.cost_center || '',
    duka_number: item?.duka_number || '',
    project_number: item?.project_number || '',
    item_date: item?.item_date || new Date().toISOString().split('T')[0],
    start_time: item?.start_time || '',
    end_time: item?.end_time || '',
    customer: item?.customer || '',
    guest_count: item?.guest_count || '',
    package_type: item?.package_type || '',
    is_refill: item?.is_refill || false,
    location: item?.location || '',
    amount: item?.amount || '',
    vat_rate: item?.vat_rate ?? 27,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'project_number') {
      fetchSuggestions(value);
      setShowSuggestions(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Input
          label="Rendelési szám"
          value={formData.order_number}
          onChange={(e) => handleChange('order_number', e.target.value)}
        />
        <Input
          label="Költséghely"
          value={formData.cost_center}
          onChange={(e) => handleChange('cost_center', e.target.value)}
        />
        <Input
          label="DUKA szám"
          value={formData.duka_number}
          onChange={(e) => handleChange('duka_number', e.target.value)}
        />
        <div className="relative">
          <Input
            label="Projektszám"
            value={formData.project_number}
            onChange={(e) => handleChange('project_number', e.target.value)}
            onFocus={() => {
              fetchSuggestions(formData.project_number);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
              {suggestions.map((s) => (
                <button
                  key={s.project_number}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                  onClick={() => {
                    handleChange('project_number', s.project_number);
                    setShowSuggestions(false);
                  }}
                >
                  <span className="font-medium">{s.project_number}</span>
                  {s.description && (
                    <span className="text-gray-500 ml-2">({s.description})</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          label="Dátum"
          type="date"
          value={formData.item_date}
          onChange={(e) => handleChange('item_date', e.target.value)}
        />
        <Input
          label="Kezdés"
          type="time"
          value={formData.start_time}
          onChange={(e) => handleChange('start_time', e.target.value)}
        />
        <Input
          label="Vége"
          type="time"
          value={formData.end_time}
          onChange={(e) => handleChange('end_time', e.target.value)}
        />
        <Input
          label="Megrendelő"
          value={formData.customer}
          onChange={(e) => handleChange('customer', e.target.value)}
        />
        <Input
          label="Létszám (fő)"
          type="number"
          min="0"
          value={formData.guest_count}
          onChange={(e) => handleChange('guest_count', e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Csomag
          </label>
          <select
            value={formData.package_type}
            onChange={(e) => handleChange('package_type', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pepper-red focus:ring-pepper-red"
          >
            <option value="">Válassz...</option>
            {PACKAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_refill}
              onChange={(e) => handleChange('is_refill', e.target.checked)}
              className="h-4 w-4 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
            />
            <span className="text-sm text-gray-700">Utántöltés</span>
          </label>
        </div>
        <Input
          label="Helyszín"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
        />
        <Input
          label="Összeg"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          suffix="Ft"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ÁFA kulcs
          </label>
          <select
            value={formData.vat_rate}
            onChange={(e) => handleChange('vat_rate', parseFloat(e.target.value))}
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Mégse
        </Button>
        <Button type="submit">
          {item ? 'Mentés' : 'Hozzáadás'}
        </Button>
      </div>
    </form>
  );
}

function EttermiForm({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    item_type: 'ettermi',
    duka_number: item?.duka_number || '',
    cost_center: item?.cost_center || '',
    customer: item?.customer || '',
    item_date: item?.item_date || new Date().toISOString().split('T')[0],
    consumption_time: item?.consumption_time || '',
    guest_count: item?.guest_count || '',
    amount: item?.amount || '',
    vat_rate: item?.vat_rate ?? 27,
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Input
          label="DUKA szám"
          value={formData.duka_number}
          onChange={(e) => handleChange('duka_number', e.target.value)}
        />
        <Input
          label="Költséghely"
          value={formData.cost_center}
          onChange={(e) => handleChange('cost_center', e.target.value)}
        />
        <Input
          label="Megrendelő"
          value={formData.customer}
          onChange={(e) => handleChange('customer', e.target.value)}
        />
        <Input
          label="Dátum"
          type="date"
          value={formData.item_date}
          onChange={(e) => handleChange('item_date', e.target.value)}
        />
        <Input
          label="Időpont"
          type="time"
          value={formData.consumption_time}
          onChange={(e) => handleChange('consumption_time', e.target.value)}
        />
        <Input
          label="Létszám (fő)"
          type="number"
          min="0"
          value={formData.guest_count}
          onChange={(e) => handleChange('guest_count', e.target.value)}
        />
        <Input
          label="Összeg"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          suffix="Ft"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ÁFA kulcs
          </label>
          <select
            value={formData.vat_rate}
            onChange={(e) => handleChange('vat_rate', parseFloat(e.target.value))}
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Mégse
        </Button>
        <Button type="submit">
          {item ? 'Mentés' : 'Hozzáadás'}
        </Button>
      </div>
    </form>
  );
}

function ItemSummaryRow({ item, onEdit, onDelete }) {
  const isBekeszites = item.item_type === 'bekeszites';

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {isBekeszites ? (
          <Package className="h-4 w-4 text-blue-500" />
        ) : (
          <Utensils className="h-4 w-4 text-green-500" />
        )}
        <div>
          <div className="text-sm font-medium text-gray-900">
            {item.item_date && formatDate(item.item_date)}
            {item.order_number && ` - ${item.order_number}`}
            {item.customer && ` - ${item.customer}`}
          </div>
          <div className="text-xs text-gray-500">
            {isBekeszites ? 'Bekészítés' : 'Éttermi fogyasztás'}
            {item.guest_count && ` • ${item.guest_count} fő`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-900">
          {formatCurrency(item.amount)}
        </span>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="p-1 text-gray-400 hover:text-blue-500"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="p-1 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ProtocolItemsSection({
  items,
  totalAmount,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  // Simple mode props (when no items)
  protocolNet,
  protocolGross,
  protocolVatRate,
  onProtocolNetChange,
  onProtocolGrossChange,
  onProtocolVatChange,
}) {
  const [isExpanded, setIsExpanded] = useState(items.length > 0);
  const [showBekeszitesModal, setShowBekeszitesModal] = useState(false);
  const [showEttermiModal, setShowEttermiModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const hasItems = items.length > 0;

  const handleSaveBekeszites = async (data) => {
    if (editingItem) {
      await onUpdateItem(editingItem.id, data);
    } else {
      await onCreateItem(data);
    }
    setShowBekeszitesModal(false);
    setEditingItem(null);
  };

  const handleSaveEttermi = async (data) => {
    if (editingItem) {
      await onUpdateItem(editingItem.id, data);
    } else {
      await onCreateItem(data);
    }
    setShowEttermiModal(false);
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (item.item_type === 'bekeszites') {
      setShowBekeszitesModal(true);
    } else {
      setShowEttermiModal(true);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt a tételt?')) {
      await onDeleteItem(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle between simple and detailed mode */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {hasItems ? `${items.length} tétel` : 'Részletezés'}
        </button>

        {hasItems && (
          <div className="text-right">
            <span className="text-sm text-gray-500">Összesen: </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Simple mode: just net/gross/vat inputs */}
      {!hasItems && !isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Nettó összeg"
            type="number"
            step="0.01"
            value={protocolNet}
            onChange={(e) => onProtocolNetChange(e.target.value)}
            suffix="Ft"
          />
          <Input
            label="Bruttó összeg"
            type="number"
            step="0.01"
            value={protocolGross}
            onChange={(e) => onProtocolGrossChange(e.target.value)}
            suffix="Ft"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ÁFA kulcs
            </label>
            <select
              value={protocolVatRate}
              onChange={(e) => onProtocolVatChange(e.target.value)}
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
      )}

      {/* Detailed mode: items list + add buttons */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Items list */}
          {items.map((item) => (
            <ItemSummaryRow
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {/* Add buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setShowBekeszitesModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <Package className="h-4 w-4" />
              Bekészítés
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setShowEttermiModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <Utensils className="h-4 w-4" />
              Éttermi fogyasztás
            </Button>
          </div>

          {/* Simple input when expanded but no items */}
          {!hasItems && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-3">
                Vagy adj meg egyösszegű bevételt:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Nettó összeg"
                  type="number"
                  step="0.01"
                  value={protocolNet}
                  onChange={(e) => onProtocolNetChange(e.target.value)}
                  suffix="Ft"
                />
                <Input
                  label="Bruttó összeg"
                  type="number"
                  step="0.01"
                  value={protocolGross}
                  onChange={(e) => onProtocolGrossChange(e.target.value)}
                  suffix="Ft"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ÁFA kulcs
                  </label>
                  <select
                    value={protocolVatRate}
                    onChange={(e) => onProtocolVatChange(e.target.value)}
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
            </div>
          )}
        </div>
      )}

      {/* Bekészítés modal */}
      <Modal
        isOpen={showBekeszitesModal}
        onClose={() => {
          setShowBekeszitesModal(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Bekészítés szerkesztése' : 'Új bekészítés'}
        size="lg"
      >
        <BekeszitesForm
          item={editingItem}
          onSave={handleSaveBekeszites}
          onCancel={() => {
            setShowBekeszitesModal(false);
            setEditingItem(null);
          }}
        />
      </Modal>

      {/* Éttermi fogyasztás modal */}
      <Modal
        isOpen={showEttermiModal}
        onClose={() => {
          setShowEttermiModal(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Éttermi fogyasztás szerkesztése' : 'Új éttermi fogyasztás'}
        size="md"
      >
        <EttermiForm
          item={editingItem}
          onSave={handleSaveEttermi}
          onCancel={() => {
            setShowEttermiModal(false);
            setEditingItem(null);
          }}
        />
      </Modal>
    </div>
  );
}
