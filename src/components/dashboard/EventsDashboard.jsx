import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PartyPopper,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Badge, LoadingSpinner } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, EVENT_TYPES } from '../../lib/utils';

export default function EventsDashboard() {
  const { unitId, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    activeEvents: [],
    recentEvents: [],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!unitId) return;

      try {
        // Fetch events for this unit
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('unit_id', unitId)
          .order('event_date', { ascending: false });

        if (!events?.length) {
          setStats({
            totalRevenue: 0,
            totalExpenses: 0,
            activeEvents: [],
            recentEvents: [],
          });
          setLoading(false);
          return;
        }

        // Fetch all revenues and expenses
        const eventIds = events.map((e) => e.id);

        const [revenuesResult, expensesResult] = await Promise.all([
          supabase
            .from('event_revenues')
            .select('event_id, amount')
            .in('event_id', eventIds),
          supabase
            .from('event_expenses')
            .select('event_id, amount')
            .in('event_id', eventIds),
        ]);

        const revenues = revenuesResult.data || [];
        const expenses = expensesResult.data || [];

        // Calculate totals
        const totalRevenue = revenues.reduce(
          (sum, r) => sum + (parseFloat(r.amount) || 0),
          0
        );
        const totalExpenses = expenses.reduce(
          (sum, e) => sum + (parseFloat(e.amount) || 0),
          0
        );

        // Create revenue and expense maps by event
        const revenueByEvent = {};
        const expenseByEvent = {};

        revenues.forEach((r) => {
          revenueByEvent[r.event_id] = (revenueByEvent[r.event_id] || 0) + parseFloat(r.amount);
        });

        expenses.forEach((e) => {
          expenseByEvent[e.event_id] = (expenseByEvent[e.event_id] || 0) + parseFloat(e.amount);
        });

        // Enrich events with totals
        const enrichedEvents = events.map((event) => ({
          ...event,
          total_revenue: revenueByEvent[event.id] || 0,
          total_expenses: expenseByEvent[event.id] || 0,
        }));

        // Get upcoming events (date >= today)
        const today = new Date().toISOString().split('T')[0];
        const activeEvents = enrichedEvents.filter(
          (e) => e.event_date >= today
        );

        setStats({
          totalRevenue,
          totalExpenses,
          activeEvents: activeEvents.slice(0, 5),
          recentEvents: enrichedEvents.slice(0, 5),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [unitId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const profit = stats.totalRevenue - stats.totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.unit_name || 'Rendezvény vezérlőpult'}
          </h1>
          <p className="text-gray-500 mt-1">
            Üdvözöljük! Itt láthatja a rendezvények összesített adatait.
          </p>
        </div>

        <Link to="/events">
          <Button>
            <Plus className="h-4 w-4" />
            Új rendezvény
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-200 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Összes bevétel</p>
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-200 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">Összes költség</p>
              <p className="text-2xl font-bold text-red-800">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className={
            profit >= 0
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
              : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
          }
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-lg ${
                profit >= 0 ? 'bg-blue-200' : 'bg-orange-200'
              }`}
            >
              {profit >= 0 ? (
                <TrendingUp
                  className={`h-6 w-6 ${
                    profit >= 0 ? 'text-blue-700' : 'text-orange-700'
                  }`}
                />
              ) : (
                <TrendingDown className="h-6 w-6 text-orange-700" />
              )}
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  profit >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}
              >
                Eredmény
              </p>
              <p
                className={`text-2xl font-bold ${
                  profit >= 0 ? 'text-blue-800' : 'text-orange-800'
                }`}
              >
                {formatCurrency(profit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming events */}
      <Card
        title="Közelgő rendezvények"
        action={
          <Link to="/events">
            <Button variant="ghost" size="sm">
              Összes megtekintése
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      >
        {stats.activeEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nincsenek közelgő rendezvények</p>
            <Link to="/events" className="mt-2 inline-block">
              <Button size="sm" className="mt-2">
                <Plus className="h-4 w-4" />
                Új rendezvény
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.activeEvents.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pepper-red bg-opacity-10 rounded-lg">
                      <PartyPopper className="h-5 w-5 text-pepper-red" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="primary" size="sm">
                          {EVENT_TYPES[event.event_type]}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(event.event_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Recent events with results */}
      <Card title="Legutóbbi rendezvények eredményei">
        {stats.recentEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Még nincsenek rendezvények
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recentEvents.map((event) => {
              const eventProfit = event.total_revenue - event.total_expenses;
              return (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(event.event_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          eventProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(eventProfit)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(event.total_revenue)} bevétel
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
