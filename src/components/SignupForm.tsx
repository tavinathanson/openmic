'use client';

import { useState, useEffect } from 'react';
import validator from 'email-validator';

type SignupType = 'comedian' | 'audience';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<SignupType>('comedian');
  const [status, setStatus] = useState<'idle' | 'loading' | 'validating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<string>('1');
  const [existingName, setExistingName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showNameField, setShowNameField] = useState(false);
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Debounced email validation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!email) {
        setEmailError(null);
        return;
      }

      // First validate email format
      if (!validator.validate(email)) {
        setEmailError('Please enter a valid email address');
        return;
      }

      // Then check if it exists in our system
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

        setEmailError(null);
        if (data.exists) {
          if (data.full_name) {
            setExistingName(data.full_name);
            setFullName(data.full_name);
            setShowNameField(false);
          } else {
            setShowNameField(true);
            setExistingName(null);
            setFullName('');
          }
          setAlreadySignedUp(data.already_signed_up);
        } else {
          setExistingName(null);
          setFullName('');
          setShowNameField(true);
          setAlreadySignedUp(false);
        }
      } catch (error) {
        console.error('Email validation error:', error);
        setEmailError('Failed to validate email. Please try again.');
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    // Validate email format again before submission
    if (!validator.validate(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    // Validate number of people
    const numPeople = parseInt(numberOfPeople);
    if (isNaN(numPeople) || numPeople < 1) {
      setStatus('error');
      setMessage('Number of people must be at least 1');
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type,
          full_name: existingName || fullName,
          number_of_people: numPeople
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      setStatus('success');
      setMessage('You\'re signed up! You\'ll also get a confirmation email.');
      setEmail('');
      setFullName('');
      setNumberOfPeople('1');
      setExistingName(null);
      setShowNameField(false);
      setAlreadySignedUp(true);
      setEmailError(null);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
      // If the error indicates already signed up, update the state
      if (error instanceof Error && error.message.includes('already signed up')) {
        setAlreadySignedUp(true);
      }
    }
  }

  const isFormValid = email && 
    !emailError &&
    (existingName || (fullName && fullName.trim().length > 0)) &&
    numberOfPeople &&
    !alreadySignedUp;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="block text-lg font-medium text-foreground mb-3">
          What are you signing up as?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('comedian')}
            className={`flex items-center gap-3 p-4 rounded-lg font-medium transition-all duration-200 ${
              type === 'comedian'
                ? 'bg-primary text-white shadow-sm hover:bg-primary-light'
                : 'bg-muted-light/5 text-muted hover:bg-muted-light/10'
            }`}
          >
            <span className="text-xl">🎤</span>
            <div className="text-left">
              <div className="text-base">I&apos;m a comedian</div>
              <div className="text-xs opacity-80">Performing solo or bringing guests</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setType('audience')}
            className={`flex items-center gap-3 p-4 rounded-lg font-medium transition-all duration-200 ${
              type === 'audience'
                ? 'bg-primary text-white shadow-sm hover:bg-primary-light'
                : 'bg-muted-light/5 text-muted hover:bg-muted-light/10'
            }`}
          >
            <span className="text-xl">🎟️</span>
            <div className="text-left">
              <div className="text-base">I&apos;m here to watch</div>
              <div className="text-xs opacity-80">Bring your friends!</div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <div className="relative">
          <label htmlFor="email" className="block text-sm font-medium text-muted mb-2">
            Your email
          </label>
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
                setEmailError(null);
              }
            }}
            required
            className={`w-full px-4 py-3 bg-card border ${
              emailError ? 'border-red-500' : 'border-border'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-lg`}
            placeholder="Enter your email"
          />
          {isValidating && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            </div>
          )}
          {emailError && (
            <p className="mt-1 text-sm text-red-500">{emailError}</p>
          )}
        </div>
      </div>

      {type === 'comedian' && existingName && alreadySignedUp && (
        <div className="p-4 bg-primary-light/10 text-primary-dark rounded-lg border border-primary-light/20">
          {existingName}: you&apos;re already signed up for this date! See you there!
        </div>
      )}

      {type === 'comedian' && existingName && !alreadySignedUp && (
        <div className="p-4 bg-primary-light/5 text-primary-dark rounded-lg border border-primary-light/10">
          Name: {existingName}
        </div>
      )}

      {type === 'audience' && existingName && alreadySignedUp && (
        <div className="p-4 bg-primary-light/10 text-primary-dark rounded-lg border border-primary-light/20">
          {existingName}: you&apos;re already signed up for this date! See you there!
        </div>
      )}

      {type === 'audience' && existingName && !alreadySignedUp && (
        <div className="p-4 bg-primary-light/5 text-primary-dark rounded-lg border border-primary-light/10">
          Name: {existingName}
        </div>
      )}

      {isValidating && (
        <div className="p-4 bg-muted-light/5 text-muted rounded-lg border border-muted-light/10">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-transparent"></div>
            <span>Checking if you&apos;ve signed up before...</span>
          </div>
        </div>
      )}

      {!isValidating && showNameField && (
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-muted mb-2">
            {type === 'comedian' ? 'Your full name or stage name' : 'Your name'}
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-lg"
            placeholder={type === 'comedian' ? 'Enter your full name or stage name' : 'Enter your name'}
          />
        </div>
      )}

      {(type === 'comedian' || type === 'audience') && !alreadySignedUp && (
        <div>
          <label htmlFor="numberOfPeople" className="block text-sm font-medium text-muted mb-2">
            Rough count of people in your group{type === 'comedian' ? ' (including yourself)' : ''}
          </label>
          <div className="relative">
            <input
              type="number"
              id="numberOfPeople"
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(e.target.value)}
              min="1"
              required
              className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-lg"
              placeholder={type === 'comedian' ? "Your best guess (including yourself)" : "Your best guess"}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !isFormValid || alreadySignedUp}
        className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium text-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {status === 'loading' ? 'Signing up...' : alreadySignedUp ? 'Already Signed Up' : 'Sign Up'}
      </button>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            status === 'success'
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-700 border-red-100'
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
} 