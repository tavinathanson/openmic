'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CancelPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      setStatus('error');
      setMessage('Invalid cancellation link');
      return;
    }

    async function cancelSignup() {
      try {
        const response = await fetch(`/api/cancel?id=${id}&type=${type}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        setStatus('success');
        setMessage('Your signup has been cancelled successfully.');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to cancel signup');
      }
    }

    cancelSignup();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Cancelling your signup...
              </h1>
              <p className="text-gray-600">Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-green-500 text-4xl mb-4">✓</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Signup Cancelled
              </h1>
              <p className="text-gray-600">{message}</p>
              <a
                href="/"
                className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Return to Home
              </a>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-red-500 text-4xl mb-4">✕</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Error
              </h1>
              <p className="text-gray-600">{message}</p>
              <a
                href="/"
                className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Return to Home
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
} 