import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PartyPopper, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { Card, Button, Modal, Badge, LoadingSpinner, EmptyState } from '../components/common';
import EventForm from '../components/events/EventForm';
import { formatDate, formatCurrency, EVENT_TYPES } from '../lib/utils';

export default function EventsPage() {
  const { isAdmin, unitId } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { events, loading, createEvent } = useEvents(isAdmin ? null : unitId);

  const handleCreate = async (data) => {
    await createEvent(data);
    setIsFormOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendezvények</h1>
          <p className="text-gray-500 mt-1">
            Projektek és rendezvények kezelése
          </p>
        </div>

        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Új rendezvény
        </Button>
      </div>

      {/* Events grid */}
      {events.length === 0 ? (
        <Card>
          <EmptyState
            icon={PartyPopper}
            title="Még nincsenek rendezvények"
            description="Hozd létre az első rendezvényt a kezdéshez"
            action={
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Új rendezvény
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="primary">
                      {EVENT_TYPES[event.event_type] || event.event_type}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>

                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    {event.name}
                  </h3>

                  <p className="text-sm text-gray-500 mb-4">
                    {formatDate(event.event_date)}
                  </p>

                  {event.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Bevétel</p>
                        <p className="font-semibold text-status-success">
                          {formatCurrency(event.total_revenue || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Költség</p>
                        <p className="font-semibold text-status-error">
                          {formatCurrency(event.total_expenses || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Event form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Új rendezvény"
        size="md"
      >
        <EventForm
          onSuccess={handleCreate}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
