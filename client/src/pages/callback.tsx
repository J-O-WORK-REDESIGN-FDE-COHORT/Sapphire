import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AuthService } from '@/services/authService';

export default function CallbackPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const user = await AuthService.handleCallback();
        console.log('✅ Callback successful, user authenticated:', user.profile);
        
        // Get the return URL from state, default to dashboard
        const returnUrl = (user.state as any)?.returnUrl === "/" ? '/dashboard' : (user.state as any)?.returnUrl || '/dashboard';
        
        // Small delay to ensure user is stored in session
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force a full page reload to ensure useAuth picks up the new user
        // This is the most reliable way to ensure the auth state is synchronized
        window.location.href = returnUrl;
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        
        // Redirect to home after error
        setTimeout(() => {
          setLocation('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

// Made with Bob
