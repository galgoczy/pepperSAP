import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';
import { PageLoading } from './components/common';

// Pages (lazy-loaded so each route ships in its own chunk)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DailyEntryPage = lazy(() => import('./pages/DailyEntryPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const DealsPage = lazy(() => import('./pages/DealsPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UnitsPage = lazy(() => import('./pages/UnitsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const MonthlyFinancialDataPage = lazy(() => import('./pages/MonthlyFinancialDataPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const ControllingPage = lazy(() => import('./pages/ControllingPage'));
const CashierImportPage = lazy(() => import('./pages/CashierImportPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const ComplaintsPage = lazy(() => import('./pages/ComplaintsPage'));
const DiscountsPage = lazy(() => import('./pages/DiscountsPage'));
const WebshopPage = lazy(() => import('./pages/WebshopPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const MicrosoftCallbackPage = lazy(() => import('./pages/MicrosoftCallbackPage'));
const CashManagementPage = lazy(() => import('./pages/CashManagementPage'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoading />}>
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
            <Route path="/workspace" element={<WorkspacePage />} />

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
            <Route
              path="/webshop"
              element={
                <ProtectedRoute allowedRoles={['admin', 'unit']}>
                  <WebshopPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash-management"
              element={
                <ProtectedRoute allowedRoles={['admin', 'unit']}>
                  <CashManagementPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
