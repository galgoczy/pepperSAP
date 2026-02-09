import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Settings, Eye, Building2, PartyPopper, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export default function Navbar({ onMenuClick, isSidebarOpen }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [units, setUnits] = useState([]);
  const {
    user,
    profile,
    signOut,
    isTestAdmin,
    viewAsRole,
    setViewMode,
    resetViewMode,
    actualRole,
  } = useAuth();
  const navigate = useNavigate();

  // Fetch units for view mode selection
  useEffect(() => {
    if (isTestAdmin) {
      supabase
        .from('units')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => setUnits(data || []));
    }
  }, [isTestAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-40 h-16">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>

          <Link to="/" className="flex items-center">
            <img
              src="https://pepperhouse.hu/wp-content/uploads/2022/03/cropped-pepper_logo2.png"
              alt="Pepper House"
              className="h-10"
            />
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Unit name display */}
          {profile?.unit_name && (
            <span className="hidden sm:block text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {profile.unit_name}
            </span>
          )}

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-pepper-red rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {profile?.full_name || user?.email}
              </span>
            </button>

            {/* Dropdown menu */}
            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.full_name || 'Felhasználó'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-pepper-red font-medium mt-1">
                      {actualRole === 'admin' && 'Adminisztrátor'}
                      {actualRole === 'unit' && 'Éttermi egység'}
                      {actualRole === 'events' && 'Rendezvény egység'}
                    </p>
                    {viewAsRole && (
                      <div className="mt-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Nézet: {viewAsRole === 'unit' ? 'Egység' : viewAsRole === 'events' ? 'Rendezvény' : 'Admin'}
                      </div>
                    )}
                  </div>

                  {/* View mode switcher - only for test admin */}
                  {isTestAdmin && (
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Teszt nézet váltás
                      </p>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            resetViewMode();
                            setIsProfileOpen(false);
                            navigate('/');
                          }}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                            !viewAsRole
                              ? 'bg-pepper-red text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Shield className="h-4 w-4" />
                          Admin nézet
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => {
                              const unitSelect = document.getElementById('unit-select');
                              if (unitSelect) unitSelect.classList.toggle('hidden');
                            }}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                              viewAsRole === 'unit'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <Building2 className="h-4 w-4" />
                            Egység nézet
                          </button>
                          <div id="unit-select" className="hidden mt-1 ml-6 space-y-1">
                            {units.filter(u => u.type === 'restaurant').map((unit) => (
                              <button
                                key={unit.id}
                                onClick={() => {
                                  setViewMode('unit', unit.id);
                                  setIsProfileOpen(false);
                                  navigate('/');
                                }}
                                className="block w-full px-3 py-1.5 text-xs text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded"
                              >
                                {unit.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const eventsUnit = units.find(u => u.type === 'events');
                            setViewMode('events', eventsUnit?.id);
                            setIsProfileOpen(false);
                            navigate('/');
                          }}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                            viewAsRole === 'events'
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <PartyPopper className="h-4 w-4" />
                          Rendezvény nézet
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="py-1">
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                      Beállítások
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Kijelentkezés
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
