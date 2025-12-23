import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Card } from '../common';
import { supabase } from '../../lib/supabase';

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMicrosoftLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile openid',
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (signInError) {
        console.error('Microsoft login error:', signInError);
        setError('Hiba történt a bejelentkezés során');
        setLoading(false);
        return;
      }

      // OAuth will redirect, so we don't need to do anything else
    } catch (err) {
      console.error('Login error:', err);
      setError('Váratlan hiba történt');
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
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
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

        {/* Allowed accounts info */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">
            Engedélyezett fiókok:
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• gergo@pepperhouse.hu (admin)</li>
            <li>• info@pepperhouse.hu (admin)</li>
            <li>• szentkiralyi@pepperhouse.hu (Szentkirályi egység)</li>
            <li>• rendezveny@pepperhouse.hu (Rendezvények)</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Problémád van a bejelentkezéssel?{' '}
          <a href="mailto:gergo@pepperhouse.hu" className="text-pepper-red hover:underline">
            Lépj kapcsolatba velünk
          </a>
        </p>
      </div>
    </div>
  );
}
