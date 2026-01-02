import { useState } from 'react';
import { Loader2, Shield, Store, PartyPopper, Trash2 } from 'lucide-react';
import { Button, Card } from '../common';
import { supabase } from '../../lib/supabase';

// Function to clear all stored data (Safari-compatible)
const clearAllStoredData = async () => {
  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keysToRemove.push(key);
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  // Try to clear IndexedDB (Safari-compatible)
  const knownDatabases = [
    'supabase-auth',
    'supabase.auth.token',
    'supabase-local-storage'
  ];
  for (const dbName of knownDatabases) {
    try {
      indexedDB.deleteDatabase(dbName);
    } catch (e) {
      // Ignore
    }
  }

  // Also try enumeration for browsers that support it
  if (typeof indexedDB.databases === 'function') {
    try {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    } catch (e) {
      // Ignore
    }
  }
};

// Test accounts for quick login
const TEST_ACCOUNTS = [
  {
    email: 'gergo@pepperhouse.hu',
    label: 'Gergo',
    role: 'Admin',
    icon: Shield,
    color: 'bg-red-600 hover:bg-red-700',
  },
  {
    email: 'szentkiralyi@pepperhouse.hu',
    label: 'Szentkirályi',
    role: 'Étterem',
    icon: Store,
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    email: 'rendezveny@pepperhouse.hu',
    label: 'Rendezvény',
    role: 'Events',
    icon: PartyPopper,
    color: 'bg-purple-600 hover:bg-purple-700',
  },
];

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(null);
  const [error, setError] = useState('');

  const handleMicrosoftLogin = async (loginHint = null) => {
    setError('');
    setLoading(true);
    if (loginHint) setLoadingAccount(loginHint);

    try {
      const options = {
        scopes: 'email profile openid',
        redirectTo: `${window.location.origin}/`,
      };

      // Add login_hint to pre-fill the email
      if (loginHint) {
        options.queryParams = {
          login_hint: loginHint,
        };
      }

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options,
      });

      if (signInError) {
        console.error('Microsoft login error:', signInError);
        setError('Hiba történt a bejelentkezés során');
        setLoading(false);
        setLoadingAccount(null);
        return;
      }

      // OAuth will redirect, so we don't need to do anything else
    } catch (err) {
      console.error('Login error:', err);
      setError('Váratlan hiba történt');
      setLoading(false);
      setLoadingAccount(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://pepperhouse.hu/wp-content/uploads/2022/03/cropped-pepper_logo2.png"
            alt="Pepper House"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Pénzügyi Nyilvántartó Rendszer
          </h1>
          <p className="text-gray-500 mt-2">
            Jelentkezz be Microsoft 365 fiókkal
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <Button
            onClick={() => handleMicrosoftLogin()}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading && !loadingAccount ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                Bejelentkezés Microsoft 365-tel
              </>
            )}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Használd a @pepperhouse.hu céges fiókodat
            </p>
          </div>
        </Card>

        {/* Quick Login Buttons for Testing */}
        <div className="mt-4">
          <p className="text-xs text-gray-500 text-center mb-3">
            Gyors belépés teszteléshez:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TEST_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isLoading = loadingAccount === account.email;
              return (
                <button
                  key={account.email}
                  onClick={() => handleMicrosoftLogin(account.email)}
                  disabled={loading}
                  className={`${account.color} text-white rounded-lg p-3 flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  <span className="text-xs font-medium">{account.label}</span>
                  <span className="text-[10px] opacity-80">{account.role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Troubleshooting Button */}
        <div className="mt-6 text-center">
          <button
            onClick={async () => {
              if (window.confirm('Ez törli az összes tárolt adatot és újratölti az oldalt. Folytatod?')) {
                await clearAllStoredData();
                window.location.reload();
              }
            }}
            className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Nem tölt be az oldal? Kattints ide az adatok törléséhez
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Problémád van a bejelentkezéssel?{' '}
          <a href="mailto:gergo@pepperhouse.hu" className="text-pepper-red hover:underline">
            Lépj kapcsolatba velünk
          </a>
        </p>
      </div>
    </div>
  );
}
