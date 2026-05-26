import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUnits } from '../../hooks/useSupabase';
import { Button, Input, Select, DatePicker } from '../common';
import { Textarea } from '../common/Input';
import { getToday, EVENT_TYPES } from '../../lib/utils';

export default function EventForm({ event, onSuccess, onCancel }) {
  const { isAdmin, unitId: userUnitId } = useAuth();
  const { units } = useUnits();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: userUnitId || '',
    name: '',
    event_type: 'event',
    event_date: getToday(),
    description: '',
    cooking_location_id: '',
  });

  useEffect(() => {
    if (event) {
      setFormData({
        unit_id: event.unit_id || userUnitId || '',
        name: event.name || '',
        event_type: event.event_type || 'event',
        event_date: event.event_date || getToday(),
        description: event.description || '',
        cooking_location_id: event.cooking_location_id || '',
      });
    }
  }, [event, userUnitId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSuccess(formData);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventsUnits = units.filter((u) => u.type === 'events');
  const restaurantUnits = units.filter((u) => u.type === 'restaurant');

  const eventTypeOptions = Object.entries(EVENT_TYPES).map(([value, label]) => ({
    value,
    label,
  }));

  const cookingLocationOptions = [
    { value: '', label: 'Válassz helyszínt...' },
    ...restaurantUnits
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => ({ value: u.id, label: u.name })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Unit selector for admin */}
      {isAdmin && (
        <Select
          label="Egység"
          value={formData.unit_id}
          onChange={(e) => handleChange('unit_id', e.target.value)}
          options={eventsUnits.map((u) => ({ value: u.id, label: u.name }))}
          required
        />
      )}

      <Input
        label="Rendezvény neve"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        required
        placeholder="pl. Céges karácsonyi buli"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Típus"
          value={formData.event_type}
          onChange={(e) => handleChange('event_type', e.target.value)}
          options={eventTypeOptions}
          required
        />

        <DatePicker
          label="Dátum"
          value={formData.event_date}
          onChange={(e) => handleChange('event_date', e.target.value)}
          required
        />
      </div>

      <Select
        label="Főzés helye"
        value={formData.cooking_location_id}
        onChange={(e) => handleChange('cooking_location_id', e.target.value)}
        options={cookingLocationOptions}
      />

      <Textarea
        label="Leírás"
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        rows={3}
        placeholder="Rendezvény leírása, részletek..."
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Mégse
        </Button>
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" />
          {event ? 'Mentés' : 'Létrehozás'}
        </Button>
      </div>
    </form>
  );
}
