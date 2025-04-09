'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

// Combined type for lineup members (signups and walk-ins)
interface LineupMember {
  id: string; // signup_id or walk_in_id
  type: 'signup' | 'walkin';
  name: string | null;
  email: string | null;
  signupTime: string | null; // Only for signups
  isCheckedIn: boolean;
  checkInTime: string | null; // check_in.checked_in_at or walk_in.checked_in_at
}

// Expected structure from Supabase for signups query
interface SignupData {
  id: string;
  created_at: string;
  people: {
    full_name: string | null;
    email: string;
  } | null;
  check_ins: {
    checked_in_at: string;
  } | null;
}

export default function AdminPage() {
  const [lineupMembers, setLineupMembers] = useState<LineupMember[]>([]);
  const [walkInName, setWalkInName] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [walkInStatus, setWalkInStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [walkInMessage, setWalkInMessage] = useState('');
  const [activeDateId, setActiveDateId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null); // Track ID being checked in
  const supabase = createClient();

  // Effect 1: Fetch Active Date on Mount
  useEffect(() => {
      setStatus('loading'); // Initial loading state
      setMessage('');
      setLineupMembers([]); // Reset on mount
      setActiveDateId(null); // Reset on mount

      const fetchDate = async () => {
          const { data: dateData, error: dateError } = await supabase
              .from('open_mic_dates')
              .select('id')
              .eq('is_active', true)
              .order('date', { ascending: true })
              .limit(1)
              .single();

          if (dateError || !dateData) {
              console.error('Error fetching active date:', dateError);
              setMessage('Could not find an active open mic date.');
              setStatus('error');
              // No activeDateId set, Effect 2 will handle this state
          } else {
              setActiveDateId(dateData.id);
              // Lineup data fetch is handled by Effect 2
          }
      };

      fetchDate();
  }, []); // Run only on mount

  // Effect 2: Fetch Lineup Data & Handle Subscriptions when Active Date is Known/Changes
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run when activeDateId changes; status or message changes should not restart subscriptions
  useEffect(() => {
      if (!activeDateId) {
          // If no active date ID (either initially or after an error in Effect 1).
          // Ensure status reflects this if it was previously loading from Effect 1
          if (status === 'loading') {
               // Check if a message was already set by Effect 1
               if (!message) {
                   setMessage('No active open mic date found.');
               }
               setStatus('error'); // Transition from loading to error if no ID found
          }
          return; // Stop here, nothing to fetch or subscribe to
      }

      // We have an activeDateId, fetch the data.
      // fetchLineupData handles its own status updates internally (sets to idle on success).
      fetchLineupData(activeDateId);

      // Setup subscriptions for the current activeDateId
      // Use a date-specific channel name for potentially cleaner separation
      const channelName = `admin-lineup-changes-${activeDateId}`;
      const channels = supabase
          .channel(channelName)
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'sign_ups', filter: `open_mic_date_id=eq.${activeDateId}` },
              (payload) => {
                  console.log('Sign-up change received:', payload);
                  fetchLineupData(activeDateId); // Refetch data for this specific date
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'walk_ins', filter: `open_mic_date_id=eq.${activeDateId}` },
              (payload) => {
                  console.log('Walk-in change received:', payload);
                   fetchLineupData(activeDateId);
              }
          )
          .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                  console.log(`Subscribed to ${channelName}`);
              } else if (status === 'CHANNEL_ERROR') {
                   console.error(`Subscription error on ${channelName}:`, err);
              } else if (status === 'TIMED_OUT') {
                    console.warn(`Subscription timed out on ${channelName}`);
              } else if (status === 'CLOSED') {
                    console.log(`Subscription closed for ${channelName}`);
              }
          });

      // Cleanup function for this effect
      return () => {
          console.log(`Removing channel ${channelName}`);
          supabase.removeChannel(channels);
      };

  // NOTE: supabase client instance is stable and doesn't need to be a dependency
  // fetchLineupData is implicitly stable as it doesn't depend on component state other than through arguments.
  }, [activeDateId]); 

  // This function is now primarily called by Effect 2 or subscriptions
  async function fetchLineupData(dateId: string | null) {
      if (!dateId) {
          console.warn('fetchLineupData called with null dateId');
          setLineupMembers([]);
          // Set status only if we aren't already in an error state from date fetching
          if (status !== 'error') {
            setMessage('Cannot fetch lineup without an active date.');
            setStatus('error');
          }
          return;
      }

      // Keep existing status unless it was 'loading' (from initial mount)
      const wasInitialLoad = status === 'loading';

      try {
          // Fetch Signups with explicit return type
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
              .eq('open_mic_date_id', dateId)
              .order('created_at', { ascending: true })
              .returns<SignupData[]>(); // Specify expected return type

          if (signupsError) throw signupsError;

          const signupMembers: LineupMember[] = (signupsData || []).map(signup => ({
              id: signup.id,
              type: 'signup',
              name: signup.people?.full_name || null,
              email: signup.people?.email || null,
              signupTime: signup.created_at,
              isCheckedIn: !!signup.check_ins,
              checkInTime: signup.check_ins?.checked_in_at || null,
          }));

          // Fetch Walk-ins
          const { data: walkinsData, error: walkinsError } = await supabase
              .from('walk_ins')
              .select('id, name, email, checked_in_at')
              .eq('open_mic_date_id', dateId)
              .order('checked_in_at', { ascending: true });

          if (walkinsError) throw walkinsError;

          const walkinMembers: LineupMember[] = (walkinsData || []).map(walkin => ({
              id: walkin.id,
              type: 'walkin',
              name: walkin.name,
              email: walkin.email,
              signupTime: null,
              isCheckedIn: true, // Walk-ins are checked in upon creation
              checkInTime: walkin.checked_in_at,
          }));

          setLineupMembers([...signupMembers, ...walkinMembers]);

          // Only set status back to idle if it was the initial load.
          // Subsequent updates (from subscriptions) shouldn't change the overall page status unless an error occurs.
          if (wasInitialLoad) {
              setStatus('idle');
          }
          // Clear general message on successful fetch, only if it wasn't a specific success message
          if (status !== 'success') {
            setMessage('');
          }

      } catch (error) {
          console.error('Error fetching lineup data:', error);
          // Set overall error state only on failure
          setMessage('Failed to fetch lineup data.');
          setStatus('error');
          setLineupMembers([]); // Clear lineup on error
      }
  }

  async function handleCheckIn(signupId: string) {
    setCheckingInId(signupId); // Indicate which one is being processed
    setMessage(''); // Clear previous messages
    const checkInTimeOptimistic = new Date().toISOString(); // Get timestamp for optimistic update

    try {
      const existingMemberIndex = lineupMembers.findIndex(m => m.id === signupId && m.type === 'signup');
      if (existingMemberIndex === -1) throw new Error('Signup not found');

      const existingMember = lineupMembers[existingMemberIndex];
      if (existingMember.isCheckedIn) throw new Error('Already checked in');

      // 1. Update the database
      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .insert([{ sign_up_id: signupId }])
        .select('checked_in_at') // Select the actual timestamp generated by DB
        .single();

      if (checkInError) throw checkInError;

      // Use the actual DB time if available, otherwise fall back to optimistic time
      const actualCheckInTime = checkInData?.checked_in_at || checkInTimeOptimistic;

      // 2. Update local state optimistically/immediately
      setLineupMembers(prevMembers =>
        prevMembers.map((member, index) =>
          index === existingMemberIndex
            ? { ...member, isCheckedIn: true, checkInTime: actualCheckInTime } // Update the specific member
            : member
        )
      );

      // 3. Provide feedback (message)
      // Subscription will still trigger refresh later for consistency, but UI is already updated
      setMessage(`Checked in ${existingMember.name || existingMember.email}!`);
      setStatus('success');
      // Clear message after a delay
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('Check-in error:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to check in');
      setStatus('error');
      // Optional: Revert optimistic update on error? For now, we rely on the next fetch.
    } finally {
      setCheckingInId(null); // Finished processing this ID
    }
  }

  async function handleAddWalkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!walkInName.trim()) {
      setWalkInMessage('Name is required for walk-ins.');
      setWalkInStatus('error');
      return;
    }
    if (!activeDateId) {
        setWalkInMessage('Cannot add walk-in: No active date found.');
        setWalkInStatus('error');
        return;
    }

    setWalkInStatus('loading');
    setWalkInMessage('');

    try {
      const { error: walkInError } = await supabase
        .from('walk_ins')
        .insert([{
          open_mic_date_id: activeDateId,
          name: walkInName.trim(),
          email: walkInEmail.trim() || null
        }]);

      if (walkInError) throw walkInError;

      // Subscription will trigger refresh
      setWalkInStatus('success');
      setWalkInMessage(`Added walk-in: ${walkInName.trim()}!`);
      setWalkInName('');
      setWalkInEmail('');
      // Clear message after a delay
      setTimeout(() => {
          setWalkInMessage('');
          setWalkInStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('Add walk-in error:', error);
      setWalkInStatus('error');
      setWalkInMessage(error instanceof Error ? error.message : 'Failed to add walk-in');
    }
  }

  // Calculate sorted lineup
  const sortedLineup = useMemo(() => {
    return [...lineupMembers].sort((a, b) => {
      // 1. Checked-in members first
      if (a.isCheckedIn !== b.isCheckedIn) {
        return a.isCheckedIn ? -1 : 1;
      }
      // 2. If both checked in, sort by check-in time (earliest first)
      if (a.isCheckedIn && b.isCheckedIn) {
        const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : Infinity;
        const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : Infinity;
        // Handle potential equality explicitly if needed, though unlikely with timestamps
        return timeA - timeB;
      }
      // 3. If both not checked in (only possible for signups), sort by signup time (earliest first)
      if (!a.isCheckedIn && !b.isCheckedIn) {
        const timeA = a.signupTime ? new Date(a.signupTime).getTime() : Infinity;
        const timeB = b.signupTime ? new Date(b.signupTime).getTime() : Infinity;
        return timeA - timeB;
      }
      // Should not happen given the first check, but keeps TS happy
      return 0;
    });
  }, [lineupMembers]);

  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Admin Check-In & Lineup</h1>

        {/* General Status Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
                status === 'success'
                  ? 'bg-green-50 text-green-700 border-green-100'
                  : status === 'error'
                  ? 'bg-red-50 text-red-700 border-red-100'
                  : 'bg-blue-50 text-blue-700 border-blue-100' // For loading or idle messages if any
              }`}>
            {message}
          </div>
        )}

        {/* Add Walk-in Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Add Walk-In</h2>
          <form onSubmit={handleAddWalkIn} className="space-y-4">
            <div>
              <label htmlFor="walkInName" className="block text-sm font-medium text-muted mb-1">
                Name (Required)
              </label>
              <input
                type="text"
                id="walkInName"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                placeholder="Stage name or full name"
              />
            </div>
            <div>
              <label htmlFor="walkInEmail" className="block text-sm font-medium text-muted mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                id="walkInEmail"
                value={walkInEmail}
                onChange={(e) => setWalkInEmail(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                placeholder="Enter email address"
              />
            </div>
            <button
              type="submit"
              disabled={walkInStatus === 'loading' || !activeDateId}
              className="w-full py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {walkInStatus === 'loading' ? 'Adding...' : 'Add Walk-In'}
            </button>
          </form>
          {walkInMessage && (
            <div
              className={`mt-4 p-3 rounded-lg border text-sm ${
                walkInStatus === 'success'
                  ? 'bg-green-50 text-green-700 border-green-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}
            >
              {walkInMessage}
            </div>
          )}
        </div>

        {/* Lineup Display */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Current Lineup ({sortedLineup.length} total)</h2>
             {status === 'loading' && <span className="text-sm text-muted">Loading...</span>}
          </div>
          {status === 'error' && !message && (
             <p className="text-muted">Error loading lineup. Check console.</p> // Show specific error if message isn't set
          )}
          {status !== 'loading' && !sortedLineup.length && activeDateId && (
            <p className="text-muted">No signups or walk-ins yet for the active date.</p>
          )}
           {!activeDateId && status !== 'loading' && (
             <p className="text-muted">No active open mic date found.</p>
           )}
          <div className="space-y-3">
            {sortedLineup.map((member, index) => (
              <div
                key={`${member.type}-${member.id}`}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border gap-3 sm:gap-4 ${
                  member.isCheckedIn
                    ? 'bg-green-50 border-green-100'
                    : 'bg-muted-light/5 border-border'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="font-semibold text-lg text-primary w-6 text-center shrink-0">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                            {member.name || (member.type === 'signup' ? 'Anonymous Signup' : 'Walk-in')}
                            {member.type === 'walkin' && <span className="text-xs font-normal text-muted-dark bg-muted-light/20 px-1.5 py-0.5 rounded ml-2">Walk-in</span>}
                        </div>
                        <div className="text-sm text-muted truncate">
                            {member.email || (member.type === 'signup' ? 'No email provided' : 'No email')}
                        </div>
                    </div>
                </div>
                <div className="text-sm text-right w-full sm:w-auto flex justify-end items-center gap-3 pl-9 sm:pl-0">
                    {member.isCheckedIn ? (
                        <div className="text-green-700">
                            Checked in @ {member.checkInTime ? new Date(member.checkInTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'N/A'}
                        </div>
                    ) : (
                        // Only show check-in button for signups that are NOT checked in
                        member.type === 'signup' && (
                            <button
                                onClick={() => handleCheckIn(member.id)}
                                disabled={checkingInId === member.id || checkingInId !== null} // Disable if this one or any other is being processed
                                className="py-1 px-3 bg-primary text-white rounded font-medium text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap"
                            >
                            {checkingInId === member.id ? 'Checking in...' : 'Check In'}
                            </button>
                        )
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
} 