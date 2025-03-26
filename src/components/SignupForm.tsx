'use client';

import { useState, useEffect } from 'react';

type SignupType = 'comedian' | 'audience';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<SignupType>('comedian');
  const [status, setStatus] = useState<'idle' | 'loading' | 'validating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [existingName, setExistingName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showNameField, setShowNameField] = useState(false);

  // Debounced email validation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!email || !type) return;
      
      setIsValidating(true);
      try {
        const response = await fetch('/api/validate-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, type }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to validate email');
        }

        if (data.exists) {
          if (type === 'comedian' && data.full_name) {
            setExistingName(data.full_name);
            setFullName(data.full_name);
            setShowNameField(false);
          } else if (type === 'comedian') {
            setShowNameField(true);
            setExistingName(null);
            setFullName('');
          }
        } else {
          setExistingName(null);
          setFullName('');
          setShowNameField(type === 'comedian');
        }
      } catch (error) {
        console.error('Email validation error:', error);
      } finally {
        setIsValidating(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [email, type]);

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
        body: JSON.stringify({
          email,
          type,
          ...(type === 'comedian' ? { full_name: fullName } : {}),
          ...(type === 'audience' ? { number_of_people: numberOfPeople } : {})
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      setStatus('success');
      setMessage('Successfully signed up! Check your email for confirmation.');
      setEmail('');
      setFullName('');
      setNumberOfPeople(1);
      setExistingName(null);
      setShowNameField(false);
    } catch (error) {
      setStatus('error');
      // Don't show error message if user is already signed up
      if (!existingName) {
        setMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
      }
    }
  }

  const isFormValid = email && 
    (!type || type === 'audience' || (type === 'comedian' && (existingName || fullName))) &&
    !existingName;

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
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setExistingName(null);
                if (!e.target.value) {
                  setFullName('');
                  setShowNameField(false);
                }
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
            {isValidating && (
              <div className="absolute right-3 top-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>

        {type === 'comedian' && existingName && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md">
            {existingName}: you're already signed up! See you there!
          </div>
        )}

        {type === 'comedian' && isValidating && (
          <div className="p-3 bg-gray-50 text-gray-700 rounded-md">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span>Validating email...</span>
            </div>
          </div>
        )}

        {type === 'comedian' && !isValidating && showNameField && (
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Full Name or Stage Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name or stage name"
            />
          </div>
        )}

        {type === 'audience' && (
          <div>
            <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700 mb-2">
              Number of People
            </label>
            <input
              type="number"
              id="numberOfPeople"
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !isFormValid}
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