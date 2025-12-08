import { useAuth } from '../hooks/useAuth';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import UnitDashboard from '../components/dashboard/UnitDashboard';
import EventsDashboard from '../components/dashboard/EventsDashboard';

export default function DashboardPage() {
  const { isAdmin, isEvents, isUnit } = useAuth();

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isEvents) {
    return <EventsDashboard />;
  }

  if (isUnit) {
    return <UnitDashboard />;
  }

  return null;
}
