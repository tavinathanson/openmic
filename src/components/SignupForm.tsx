'use client';

import { useState, useEffect } from 'react';
import validator from 'email-validator';
import { slotsFullRef, decrementSlotRef } from './SlotCounter';
import { trackRegistration } from '@/utils/metaPixel';
import { createClient } from '@/utils/supabase/client';
import { getActiveOpenMicDate, isComedianSignupWindowOpen, getComedianSignupOpenDate } from '@/lib/openMic';

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
  const [firstMicEver, setFirstMicEver] = useState(false);
  const [isWaitlist, setIsWaitlist] = useState(false);
  const [areSlotsFull, setAreSlotsFull] = useState(false);
  const [existingSignupIsWaitlist, setExistingSignupIsWaitlist] = useState(false);
  const [willSupport, setWillSupport] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [userCaptchaAnswer, setUserCaptchaAnswer] = useState('');
  const [comedianWindowOpen, setComedianWindowOpen] = useState<boolean | null>(null);
  const [signupOpensDate, setSignupOpensDate] = useState<string | null>(null);

  // Generate captcha question
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    let question;
    if (operation === '+') {
      answer = num1 + num2;
      question = `${num1} + ${num2}`;
    } else {
      // Ensure positive result for subtraction
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      answer = larger - smaller;
      question = `${larger} - ${smaller}`;
    }
    
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
    setUserCaptchaAnswer('');
  };

  // Generate captcha on mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Check if comedian signup window is open
  useEffect(() => {
    async function checkSignupWindow() {
      try {
        const supabase = createClient();
        const data = await getActiveOpenMicDate(supabase);
        const isOpen = isComedianSignupWindowOpen(data.date);
        setComedianWindowOpen(isOpen);

        if (!isOpen) {
          const opensDate = getComedianSignupOpenDate(data.date);
          setSignupOpensDate(opensDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }));
        }
      } catch (error) {
        console.error('Error checking signup window:', error);
        // Default to open if we can't check (fail open)
        setComedianWindowOpen(true);
      }
    }
    checkSignupWindow();
  }, []);

  // Reset state when type changes
  useEffect(() => {
    setAlreadySignedUp(false);
    setExistingSignupIsWaitlist(false);
    setAreSlotsFull(false);
    setIsWaitlist(false);
    setStatus('idle');
    setMessage('');
  }, [type]);

  // Update slotsFull state when ref changes
  useEffect(() => {
    const checkSlots = () => {
      setAreSlotsFull(slotsFullRef.current);
    };
    
    // Initial check
    checkSlots();
    
    // Check every second for changes
    const interval = setInterval(checkSlots, 1000);
    return () => clearInterval(interval);
  }, []);

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
          body: JSON.stringify({ email: email.toLowerCase(), type }),
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
          setExistingSignupIsWaitlist(data.is_waitlist);
          // Reset first mic ever if email exists
          setFirstMicEver(false);
        } else {
          setExistingName(null);
          setFullName('');
          setShowNameField(true);
          setAlreadySignedUp(false);
          setExistingSignupIsWaitlist(false);
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
    
    // Prevent double submission
    if (status === 'loading') {
      return;
    }
    
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

    // Validate captcha
    if (userCaptchaAnswer.trim() !== captchaAnswer) {
      setStatus('error');
      setMessage('Incorrect answer. Please try again.');
      generateCaptcha(); // Generate new question
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          type,
          full_name: existingName || fullName,
          number_of_people: numPeople,
          first_mic_ever: type === 'comedian' ? firstMicEver : false,
          will_support: willSupport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      setStatus('success');
      setIsWaitlist(data.is_waitlist || false);
      setMessage(data.message || 'You\'re signed up! You\'ll also get a confirmation email.');

      // Immediately decrement slot counter for comedian signups (not waitlist)
      // Wrapped in try-catch to ensure signup confirmation is never affected
      try {
        if (type === 'comedian' && !data.is_waitlist) {
          decrementSlotRef.current();
        }
      } catch {
        // Silently ignore - slot counter will sync via realtime subscription anyway
      }
      setEmail('');
      setFullName('');
      setNumberOfPeople('1');
      setExistingName(null);
      setShowNameField(false);
      setAlreadySignedUp(true);
      setEmailError(null);
      generateCaptcha(); // Generate new captcha after successful submission
      
      // Track registration conversion
      trackRegistration();
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
    !isValidating &&
    (existingName || (fullName && fullName.trim().length > 0)) &&
    numberOfPeople &&
    !alreadySignedUp &&
    userCaptchaAnswer.trim() !== '';

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

      {type === 'comedian' && comedianWindowOpen === false && (
        <div className="p-6 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Comedian signups open {signupOpensDate}</span>
          </div>
          <p className="text-sm">
            <a href="https://www.tavicomedy.com/#updates" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              Join my list
            </a>{' '}
            to get occasional reminders!
          </p>
        </div>
      )}

      {type === 'comedian' && comedianWindowOpen !== false && (
        <div className="p-4 bg-primary-light/5 text-primary-dark rounded-lg border border-primary-light/10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><b>5 minutes</b> per comedian, or <b>7 minutes</b> if you bring 1+ non-performing guests</span>
          </div>
        </div>
      )}

      {/* Hide the rest of the form if comedian window is closed */}
      {(type !== 'comedian' || comedianWindowOpen !== false) && (
        <>
      {type === 'comedian' && !areSlotsFull && (
        <div className="text-sm text-muted text-center mb-4">
          No worries if plans change! Canceling your spot is easy.
        </div>
      )}

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
          {existingName}: {existingSignupIsWaitlist ? 'you\'re already on the waitlist!' : 'you\'re already signed up for this date! See you there!'}
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
            Rough count of people in your group{type === 'comedian' ? ', including yourself (other comedians sign up separately)' : ''}
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

      {type === 'comedian' && showNameField && !alreadySignedUp && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 p-4 bg-muted-light/5 rounded-lg border border-muted-light/10">
            <input
              type="checkbox"
              id="firstMicEver"
              checked={firstMicEver}
              onChange={(e) => setFirstMicEver(e.target.checked)}
              className="h-4 w-4 rounded border-muted-light text-primary focus:ring-primary"
            />
            <label htmlFor="firstMicEver" className="text-sm text-muted-dark font-medium">
              This is my first time ever performing comedy! (Free cookie 🍪)
            </label>
          </div>
        </div>
      )}

      {!alreadySignedUp && (
        <div className="p-4 bg-muted-light/5 text-muted-dark rounded-lg border border-muted-light/10">
          <p className="text-sm mb-3">
            This open mic is only possible thanks to our hosts at Crave. To keep the show going, please support them with a purchase if you can. This is not required, but is very much appreciated!
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="supportCrave"
              checked={willSupport}
              onChange={(e) => setWillSupport(e.target.checked)}
              className="h-4 w-4 rounded border-muted-light text-primary focus:ring-primary"
            />
            <label htmlFor="supportCrave" className="text-sm font-medium">
              I&apos;ll grab a bite or drink to help keep this mic free! ☕
            </label>
          </div>
        </div>
      )}

      {!alreadySignedUp && (
        <div>
          <label htmlFor="captcha" className="block text-sm font-medium text-muted mb-2">
            Quick math check to catch bots: What is {captchaQuestion}?
          </label>
          <input
            type="text"
            id="captcha"
            value={userCaptchaAnswer}
            onChange={(e) => {
              setUserCaptchaAnswer(e.target.value);
              if (status === 'error') {
                setStatus('idle');
                setMessage('');
              }
            }}
            required
            className={`w-full px-4 py-3 bg-card border ${
              status === 'error' && message.includes('Incorrect answer') ? 'border-red-500' : 'border-border'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-lg`}
            placeholder="Enter your answer"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || isValidating || !isFormValid || alreadySignedUp}
        className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium text-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {status === 'loading' 
          ? (type === 'comedian' && areSlotsFull ? 'Adding to waitlist...' : 'Signing up...')
          : alreadySignedUp 
            ? 'Already Signed Up' 
            : type === 'comedian' && areSlotsFull
              ? 'Add to Waitlist'
              : 'Sign Up'}
      </button>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            status === 'success'
              ? isWaitlist
                ? 'bg-green-50 text-green-700 border-green-100'
                : 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-700 border-red-100'
          }`}
        >
          {message}
        </div>
      )}
        </>
      )}
    </form>
  );
} 