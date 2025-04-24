'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import validator from 'email-validator';

type Status = 'loading' | 'success' | 'error' | 'idle';
type FormStatus = 'idle' | 'submitting';

function CancelContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  async function cancelSignupByEmail() {
    try {
      const response = await fetch(`/api/cancel?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setStatus('success');
      setMessage('Your signup has been cancelled successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to cancel signup');
    }
  }

  useEffect(() => {
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    async function cancelSignupById(id: string, type: string) {
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

    if (id && type) {
      setStatus('loading');
      cancelSignupById(id, type);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormStatus('submitting');
    setMessage('');

    if (!validator.validate(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    await cancelSignupByEmail();
    setFormStatus('idle');
  }

  return (
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
            <Link
              href="/"
              className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Home
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-4xl mb-4">✕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Error
            </h1>
            <p className="text-gray-600">{message}</p>
            <Link
              href="/"
              className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Home
            </Link>
          </>
        )}

        {status === 'idle' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Cancel Your Signup
            </h1>
            <p className="text-gray-600 mb-6">
              Enter your email address to cancel your signup
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={formStatus === 'submitting'}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formStatus === 'submitting' ? 'Cancelling...' : 'Cancel Signup'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Loading...
            </h1>
            <p className="text-gray-600">Please wait a moment.</p>
          </div>
        </div>
      }>
        <CancelContent />
      </Suspense>
    </main>
  );
} 