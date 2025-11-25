'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import validator from 'email-validator';

type Status = 'loading' | 'success' | 'error' | 'idle';
type FormStatus = 'idle' | 'submitting';

// Reusable textarea component for cancellation note
function CancellationNoteField({
  id,
  value,
  onChange
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="text-left">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        Reason for cancellation (optional)
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Helpful to know what came up if you don't mind sharing"
        rows={3}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
}

function CancelContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Unified cancellation function
  async function performCancellation(params: URLSearchParams) {
    try {
      if (note) {
        params.set('note', note);
      }
      const response = await fetch(`/api/cancel?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setStatus('success');
      setMessage('Your spot has been cancelled successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to cancel signup');
    }
  }

  useEffect(() => {
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    // If we have id and type from URL, show confirmation instead of auto-canceling
    if (id && type) {
      setShowConfirmation(true);
    }
  }, [searchParams]);

  async function handleConfirmCancel() {
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (id && type) {
      setStatus('loading');
      const params = new URLSearchParams({ id, type });
      await performCancellation(params);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormStatus('submitting');
    setMessage('');

    if (!validator.validate(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      setFormStatus('idle');
      return;
    }

    const params = new URLSearchParams({ email });
    await performCancellation(params);
    setFormStatus('idle');
  }

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Cancelling your spot...
            </h1>
            <p className="text-gray-600">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Spot Cancelled
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
            {showConfirmation ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Confirm Cancellation
                </h1>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to cancel your spot? This action cannot be undone.
                </p>

                <div className="space-y-4">
                  <CancellationNoteField
                    id="confirm-note"
                    value={note}
                    onChange={setNote}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmCancel}
                      className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Yes, Cancel Spot
                    </button>
                    <Link
                      href="/"
                      className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
                    >
                      Keep Spot
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                  Cancel Your Spot
                </h1>
                <p className="text-gray-600 mb-6">
                  Enter your email address to cancel your spot
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

                  <CancellationNoteField
                    id="email-note"
                    value={note}
                    onChange={setNote}
                  />

                  <button
                    type="submit"
                    disabled={formStatus === 'submitting'}
                    className="w-full py-2 px-4 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formStatus === 'submitting' ? 'Cancelling...' : 'Cancel Spot'}
                  </button>
                </form>
              </>
            )}
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