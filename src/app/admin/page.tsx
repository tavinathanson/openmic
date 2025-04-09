'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Signup {
  id: string;
  created_at: string;
  people: {
    full_name: string | null;
    email: string;
  };
  check_ins: {
    checked_in_at: string;
  }[];
}

export default function AdminPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchSignups();
    // Subscribe to changes
    const subscription = supabase
      .channel('sign_ups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sign_ups' }, () => {
        fetchSignups();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchSignups() {
    const { data: dateData, error: dateError } = await supabase
      .from('open_mic_dates')
      .select('id')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (dateError || !dateData) return;

    const { data: signupsData, error: signupsError } = await supabase
      .from('sign_ups')
      .select(`
        id,
        created_at,
        people (
          full_name,
          email
        ),
        check_ins (
          checked_in_at
        )
      `)
      .eq('open_mic_date_id', dateData.id)
      .order('created_at', { ascending: true });

    if (signupsError) {
      console.error('Error fetching signups:', signupsError);
      return;
    }

    // Transform the data to match our Signup interface
    const transformedSignups = (signupsData || []).map(signup => ({
      id: signup.id,
      created_at: signup.created_at,
      people: {
        full_name: signup.people[0].full_name,
        email: signup.people[0].email
      },
      check_ins: signup.check_ins || []
    }));

    setSignups(transformedSignups);
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      // Find the signup by email
      const signup = signups.find(s => s.people.email === email);
      if (!signup) {
        throw new Error('No signup found with this email');
      }

      // Check if already checked in
      if (signup.check_ins.length > 0) {
        throw new Error('Already checked in');
      }

      // Create check-in
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert([{ sign_up_id: signup.id }]);

      if (checkInError) throw checkInError;

      setStatus('success');
      setMessage('Successfully checked in!');
      setEmail('');
      fetchSignups();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to check in');
    }
  }

  // Calculate lineup order
  const lineup = [...signups].sort((a, b) => {
    // First, sort by check-in status
    const aCheckedIn = a.check_ins.length > 0;
    const bCheckedIn = b.check_ins.length > 0;
    if (aCheckedIn !== bCheckedIn) {
      return aCheckedIn ? -1 : 1;
    }

    // Then, sort by signup time
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Admin Check-In</h1>

        {/* Check-in Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Check In</h2>
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                placeholder="Enter email address"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {status === 'loading' ? 'Checking in...' : 'Check In'}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                status === 'success'
                  ? 'bg-green-50 text-green-700 border-green-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Lineup Display */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Current Lineup</h2>
          <div className="space-y-4">
            {lineup.map((signup, index) => (
              <div
                key={signup.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  signup.check_ins.length > 0
                    ? 'bg-green-50 border-green-100'
                    : 'bg-muted-light/5 border-border'
                }`}
              >
                <div>
                  <div className="font-medium text-foreground">
                    {signup.people.full_name || 'Anonymous'}
                  </div>
                  <div className="text-sm text-muted">
                    {signup.people.email}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-foreground">
                    #{index + 1}
                  </div>
                  <div className="text-sm text-muted">
                    {signup.check_ins.length > 0
                      ? `Checked in: ${new Date(signup.check_ins[0].checked_in_at).toLocaleTimeString()}`
                      : 'Not checked in'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
} 