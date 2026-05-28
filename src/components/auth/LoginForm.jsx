import { useState } from 'react';
import { Loader2, Shield, Store, PartyPopper, Trash2, UserCog } from 'lucide-react';
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
    disabled: true,
  },
  {
    email: 'szentkiralyi@pepperhouse.hu',
    label: 'Szentkirályi',
    role: 'Étterem',
    icon: Store,
    color: 'bg-blue-600 hover:bg-blue-700',
    disabled: false,
  },
  {
    email: 'rendezveny@pepperhouse.hu',
    label: 'Rendezvény',
    role: 'Events',
    icon: PartyPopper,
    color: 'bg-purple-600 hover:bg-purple-700',
    disabled: false,
  },
];

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(null);
  const [error, setError] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Email login error:', signInError);
        setError('Hibás email vagy jelszó');
        setLoading(false);
        return;
      }

      // Success - the auth state change will handle redirect
    } catch (err) {
      console.error('Login error:', err);
      setError('Váratlan hiba történt');
      setLoading(false);
    }
  };

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

          {/* Test Admin Quick Login - disabled */}
          <div className="mt-6 pt-6 border-t">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="A teszt admin belépés ki van kapcsolva"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed"
            >
              <UserCog className="h-5 w-5" />
              TESZT ADMIN belépés
            </button>
          </div>

          {/* Email/Password Login Toggle */}
          <div className="mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowEmailLogin(!showEmailLogin)}
              className="text-sm text-gray-500 hover:text-gray-700 w-full text-center"
            >
              {showEmailLogin ? '← Vissza' : 'Egyéb email/jelszó →'}
            </button>

            {showEmailLogin && (
              <form onSubmit={handleEmailLogin} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent"
                    placeholder="admin@test.local"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jelszó
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Bejelentkezés'
                  )}
                </Button>
              </form>
            )}
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
              const isDisabled = loading || account.disabled;
              return (
                <button
                  key={account.email}
                  onClick={() => !account.disabled && handleMicrosoftLogin(account.email)}
                  disabled={isDisabled}
                  className={`${account.disabled ? 'bg-gray-300 cursor-not-allowed' : account.color} text-white rounded-lg p-3 flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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
