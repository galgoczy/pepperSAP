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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isEvents, isAccountant, profile } = useAuth();

  // If no profile exists (database not set up), show all menu items for development
  const noProfileYet = !profile;

  // Menu sections
  const menuSections = [
    {
      title: null, // No title for main section
      items: [
        {
          label: 'Főoldal',
          icon: LayoutDashboard,
          to: '/',
          show: !isAccountant,
        },
        {
          label: 'Napi adatok',
          icon: CalendarDays,
          to: '/daily',
          show: noProfileYet || (!isEvents && !isAccountant),
        },
        {
          label: 'Kifizetések',
          icon: Receipt,
          to: '/expenses',
          show: noProfileYet || (!isEvents && !isAccountant),
        },
        {
          label: 'Rendezvények',
          icon: PartyPopper,
          to: '/events',
          show: noProfileYet || isAdmin || isEvents,
        },
        {
          label: 'Riportok',
          icon: FileText,
          to: '/reports',
          show: true,
        },
      ],
    },
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
          label: 'Beállítások',
          icon: Settings,
          to: '/settings',
          show: !isAccountant,
        },
      ],
    },
    {
      title: 'Ügyvitel',
      items: [
        {
          label: 'Ügyfelek',
          icon: Contact,
          to: '/contacts',
          show: true, // Everyone can see contacts
        },
        {
          label: 'Dealek',
          icon: Target,
          to: '/deals',
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
          show: true, // Everyone can see inventory (will show their unit's data later)
        },
        {
          label: 'Dokumentumok',
          icon: FolderOpen,
          to: '/documents',
          show: noProfileYet || isAdmin,
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
