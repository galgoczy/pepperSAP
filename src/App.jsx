import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DailyEntryPage from './pages/DailyEntryPage';
import ExpensesPage from './pages/ExpensesPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ReportsPage from './pages/ReportsPage';
import DocumentsPage from './pages/DocumentsPage';
import ContactsPage from './pages/ContactsPage';
import SalesPage from './pages/SalesPage';
import DealsPage from './pages/DealsPage';
import InventoryPage from './pages/InventoryPage';
import SettingsPage from './pages/SettingsPage';
import UnitsPage from './pages/UnitsPage';
import UsersPage from './pages/UsersPage';
import MonthlyFinancialDataPage from './pages/MonthlyFinancialDataPage';
import BudgetPage from './pages/BudgetPage';
import ControllingPage from './pages/ControllingPage';
import CashierImportPage from './pages/CashierImportPage';
import SupportPage from './pages/SupportPage';
import AuditLogPage from './pages/AuditLogPage';
import CampaignsPage from './pages/CampaignsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import DiscountsPage from './pages/DiscountsPage';
import MicrosoftCallbackPage from './pages/MicrosoftCallbackPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/microsoft/callback" element={<MicrosoftCallbackPage />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/daily"
              element={
                <ProtectedRoute allowedRoles={['admin', 'unit']}>
                  <DailyEntryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute allowedRoles={['admin', 'unit']}>
                  <ExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute allowedRoles={['admin', 'events']}>
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'events']}>
                  <EventDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/documents"
              element={
                <ProtectedRoute requireAdmin>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route
              path="/sales"
              element={
                <ProtectedRoute requireAdmin>
                  <SalesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals"
              element={
                <ProtectedRoute requireAdmin>
                  <DealsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/support" element={<SupportPage />} />

            {/* Admin only routes */}
            <Route
              path="/units"
              element={
                <ProtectedRoute requireAdmin>
                  <UnitsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requireAdmin>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/monthly-data"
              element={
                <ProtectedRoute requireAdmin>
                  <MonthlyFinancialDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/budget"
              element={
                <ProtectedRoute requireAdmin>
                  <BudgetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/controlling"
              element={
                <ProtectedRoute requireAdmin>
                  <ControllingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cashier-import"
              element={
                <ProtectedRoute requireAdmin>
                  <CashierImportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-log"
              element={
                <ProtectedRoute requireAdmin>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute requireAdmin>
                  <CampaignsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/complaints"
              element={
                <ProtectedRoute requireAdmin>
                  <ComplaintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/discounts"
              element={
                <ProtectedRoute requireAdmin>
                  <DiscountsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
