import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Microsoft OAuth callback handler
 * This page receives the authorization code from Microsoft and sends it back to the opener
 */
export default function MicrosoftCallbackPage() {
  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const state = params.get('state');

    // Verify state matches (CSRF protection)
    const savedState = sessionStorage.getItem('ms_auth_state');

    if (state && savedState && state !== savedState) {
      // State mismatch - possible CSRF attack
      if (window.opener) {
        window.opener.postMessage({
          type: 'microsoft-auth-callback',
          error: 'state_mismatch',
          error_description: 'A biztonsági ellenőrzés sikertelen. Próbáld újra.',
        }, window.location.origin);
      }
      window.close();
      return;
    }

    // Send result back to opener
    if (window.opener) {
      window.opener.postMessage({
        type: 'microsoft-auth-callback',
        code,
        error,
        error_description: errorDescription,
      }, window.location.origin);

      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 500);
    } else {
      // If no opener, redirect to main page
      window.location.href = '/documents';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <Loader2 className="h-12 w-12 animate-spin text-pepper-red mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Bejelentkezés folyamatban...
        </h1>
        <p className="text-gray-500">
          Ez az ablak automatikusan bezáródik.
        </p>
      </div>
    </div>
  );
}
