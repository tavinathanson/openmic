'use client';

import { useState } from 'react';

type SignupType = 'comedian' | 'audience';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<SignupType>('comedian');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      setStatus('success');
      setMessage('Successfully signed up! Check your email for confirmation.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sign up as:
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setType('comedian')}
              className={`px-4 py-2 rounded ${
                type === 'comedian'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Comedian
            </button>
            <button
              type="button"
              onClick={() => setType('audience')}
              className={`px-4 py-2 rounded ${
                type === 'audience'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Audience
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {status === 'loading' ? 'Signing up...' : 'Sign Up'}
        </button>

        {message && (
          <div
            className={`p-3 rounded ${
              status === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
} 