import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield, Building2, PartyPopper } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Card } from '../common';
import toast from 'react-hot-toast';

// Test accounts for quick login
const TEST_ACCOUNTS = [
  {
    email: 'gergo@pepperhouse.hu',
    password: 'admin123',
    label: 'Admin',
    icon: Shield,
    color: 'bg-red-600 hover:bg-red-700',
  },
  {
    email: 'unit@pepperhouse.hu',
    password: 'unit123',
    label: 'Éttermi egység',
    icon: Building2,
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    email: 'events@pepperhouse.hu',
    password: 'events123',
    label: 'Rendezvény',
    icon: PartyPopper,
    color: 'bg-purple-600 hover:bg-purple-700',
  },
];

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          setError('Hibás email cím vagy jelszó');
        } else {
          setError('Hiba történt a bejelentkezés során');
        }
        return;
      }

      toast.success('Sikeres bejelentkezés!');
      navigate(from, { replace: true });
    } catch (err) {
      setError('Váratlan hiba történt');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await signIn(account.email, account.password);

      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          setError(`Teszt fiók nem található: ${account.email}. Hozd létre a Supabase-ben!`);
        } else {
          setError('Hiba történt a bejelentkezés során');
        }
        return;
      }

      toast.success('Sikeres bejelentkezés!');
      navigate(from, { replace: true });
    } catch (err) {
      setError('Váratlan hiba történt');
      console.error(err);
    } finally {
      setLoading(false);
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
            Jelentkezz be a folytatáshoz
          </p>
        </div>

        {/* Quick Login Buttons */}
        <Card className="p-4 mb-4">
          <p className="text-sm text-gray-600 mb-3 text-center font-medium">
            Gyors belépés (teszt)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => handleQuickLogin(account)}
                disabled={loading}
                className={`${account.color} text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-1 disabled:opacity-50`}
              >
                <account.icon className="h-5 w-5" />
                {account.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Login Card */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email cím"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pelda@pepperhouse.hu"
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Jelszó"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              <LogIn className="h-5 w-5" />
              Bejelentkezés
            </Button>
          </form>
        </Card>

        {/* Test Account Info */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium mb-2">
            Teszt fiókok létrehozása Supabase-ben:
          </p>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>1. Supabase Dashboard → Authentication → Users</li>
            <li>2. "Add user" gomb → email + jelszó megadása</li>
            <li>3. user_profiles táblába INSERT a role-lal</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Problémád van a bejelentkezéssel?{' '}
          <a href="mailto:support@pepperhouse.hu" className="text-pepper-red hover:underline">
            Lépj kapcsolatba velünk
          </a>
        </p>
      </div>
    </div>
  );
}
