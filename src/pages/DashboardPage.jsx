import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import UnitDashboard from '../components/dashboard/UnitDashboard';
import EventsDashboard from '../components/dashboard/EventsDashboard';

export default function DashboardPage() {
  const { isAdmin, isEvents, isUnit, isAccountant } = useAuth();

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isEvents) {
    return <EventsDashboard />;
  }

  if (isUnit) {
    return <UnitDashboard />;
  }

  // Accountant users are redirected to reports page
  if (isAccountant) {
    return <Navigate to="/reports" replace />;
  }

  return null;
}
