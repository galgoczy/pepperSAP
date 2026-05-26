import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  PartyPopper,
  FileText,
  FolderOpen,
  Settings,
  Building2,
  Users,
  Package,
  Contact,
  TrendingUp,
  Target,
  BarChart3,
  Calculator,
  Upload,
  LifeBuoy,
  History,
  Megaphone,
  MessageSquareWarning,
  Percent,
  ShoppingCart,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isEvents, isAccountant, profile } = useAuth();

  // If no profile exists (database not set up), show all menu items for development
  const noProfileYet = !profile;

  // Menu sections - reorganized per user request
  const menuSections = [
    // Dashboard - always visible
    {
      title: null,
      items: [
        {
          label: 'Főoldal',
          icon: LayoutDashboard,
          to: '/',
          show: !isAccountant,
        },
        {
          label: 'Pepper Placc',
          icon: MessageCircle,
          to: '/workspace',
          show: !isAccountant,
        },
      ],
    },
    // Pénzügy section
    {
      title: 'Pénzügy',
      items: [
        {
          label: 'Napi jelentés',
          icon: CalendarDays,
          to: '/daily',
          show: noProfileYet || (!isEvents && !isAccountant),
        },
        {
          label: 'Pénztárgép import',
          icon: Upload,
          to: '/cashier-import',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Kifizetések',
          icon: Receipt,
          to: '/expenses',
          show: noProfileYet || (!isEvents && !isAccountant),
        },
        {
          label: 'Webáruház',
          icon: ShoppingCart,
          to: '/webshop',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Rendezvények',
          icon: PartyPopper,
          to: '/events',
          show: noProfileYet || isAdmin || isEvents,
        },
        {
          label: 'Házipénztár',
          icon: Wallet,
          to: '/cash-management',
          show: noProfileYet || isAdmin || (!isEvents && !isAccountant),
        },
      ],
    },
    // Kontrolling section
    {
      title: 'Kontrolling',
      items: [
        {
          label: 'Jelentések',
          icon: FileText,
          to: '/reports',
          show: true,
        },
        {
          label: 'Terv-tény',
          icon: BarChart3,
          to: '/controlling',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Budget',
          icon: Calculator,
          to: '/budget',
          show: noProfileYet || isAdmin,
        },
      ],
    },
    // Dokumentumok section
    {
      title: 'Dokumentumok',
      items: [
        {
          label: 'Dokumentumtár',
          icon: FolderOpen,
          to: '/documents',
          show: noProfileYet || isAdmin,
        },
      ],
    },
    // CRM / Sales section
    {
      title: 'CRM / Sales',
      items: [
        {
          label: 'Ügyfelek',
          icon: Contact,
          to: '/contacts',
          show: true,
        },
        {
          label: 'Dealek',
          icon: Target,
          to: '/deals',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Kampányok',
          icon: Megaphone,
          to: '/campaigns',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Reklamációk',
          icon: MessageSquareWarning,
          to: '/complaints',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Kedvezmények',
          icon: Percent,
          to: '/discounts',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Sales események',
          icon: TrendingUp,
          to: '/sales',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Készletek',
          icon: Package,
          to: '/inventory',
          show: true,
        },
      ],
    },
    // Admin section
    {
      title: 'Adminisztráció',
      items: [
        {
          label: 'Egységek',
          icon: Building2,
          to: '/units',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Felhasználók',
          icon: Users,
          to: '/users',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Audit Log',
          icon: History,
          to: '/audit-log',
          show: noProfileYet || isAdmin,
        },
        {
          label: 'Támogatás',
          icon: LifeBuoy,
          to: '/support',
          show: true,
        },
        {
          label: 'Beállítások',
          icon: Settings,
          to: '/settings',
          show: !isAccountant,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg z-30',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-4 space-y-6 overflow-y-auto h-[calc(100%-5rem)]">
          {menuSections.map((section, sectionIdx) => {
            const visibleItems = section.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={sectionIdx}>
                {section.title && (
                  <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-pepper-red text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Pepper House Pénzügyi Rendszer
          </p>
          <p className="text-xs text-gray-400 text-center">
            v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
