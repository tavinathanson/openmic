'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

// Combined type for lineup members (signups and walk-ins)
// Similar to admin, but we only need checked-in info for sorting
interface LineupMember {
  id: string; // signup_id or walk_in_id
  type: 'signup' | 'walkin';
  name: string | null;
  // Email is not shown publicly
  isCheckedIn: boolean;
  checkInTime: string | null; // check_in.checked_in_at or walk_in.checked_in_at
  // Signup time is not needed for public view sorting
}

// Expected structure from Supabase for signups query
// Only fetch necessary fields for public view
interface SignupData {
  id: string;
  people: {
    full_name: string | null;
  } | null;
  check_ins: {
    checked_in_at: string;
  }[];
}

export default function LineupPage() {
  const [lineupMembers, setLineupMembers] = useState<LineupMember[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [activeDateId, setActiveDateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = createClient();

  // Effect 1: Fetch Active Date on Mount
  useEffect(() => {
      setStatus('loading');
      setErrorMessage(null);
      setLineupMembers([]);
      setActiveDateId(null);

      const fetchDate = async () => {
          const { data: dateData, error: dateError } = await supabase
              .from('open_mic_dates')
              .select('id')
              .eq('is_active', true)
              .order('date', { ascending: true })
              .limit(1)
              .single();

          if (dateError || !dateData) {
              console.error('Error fetching active date for lineup:', dateError);
              setErrorMessage('Could not find an active open mic date.');
              setStatus('error');
          } else {
              setActiveDateId(dateData.id);
              // Effect 2 will handle fetching data now
          }
      };

      fetchDate();
  }, []); // Run only on mount

  // Effect 2: Fetch Lineup Data & Handle Subscriptions when Active Date is Known/Changes
  useEffect(() => {
      if (!activeDateId) {
          if (status === 'loading') {
              // If still loading from effect 1 and no ID found, it's an error
              if (!errorMessage) {
                  setErrorMessage('No active open mic date found.');
              }
              setStatus('error');
          }
          return; // Stop if no active date
      }

      // Fetch initial data for the active date
      fetchLineupData(activeDateId);

      // Setup subscriptions for the current activeDateId
      const channelName = `public-lineup-changes-${activeDateId}`;
      const channels = supabase
          .channel(channelName)
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'sign_ups', filter: `open_mic_date_id=eq.${activeDateId}` },
              (payload) => {
                  console.log('(Public) Sign-up change received:', payload);
                  fetchLineupData(activeDateId); // Refetch data
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'check_ins' }, // Filter happens in fetchLineupData
              (payload) => {
                  console.log('(Public) Check-in change received:', payload);
                  fetchLineupData(activeDateId);
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'walk_ins', filter: `open_mic_date_id=eq.${activeDateId}` },
              (payload) => {
                  console.log('(Public) Walk-in change received:', payload);
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

      // Cleanup function
      return () => {
          console.log(`Removing channel ${channelName}`);
          supabase.removeChannel(channels);
      };

  }, [activeDateId, status, errorMessage]); // Re-run if activeDateId changes or error state changes

  // Fetch Lineup Data Function
  async function fetchLineupData(dateId: string) {
      // Don't reset status if it's already 'error'
      // Set to loading only if it wasn't already loading or in error
      // if (status !== 'loading' && status !== 'error') {
      //     setStatus('loading'); // Indicate data fetching
      // }
      // console.log('Fetching public lineup data for date:', dateId);

      try {
          // Fetch Signups (only needed fields)
          const { data: signupsData, error: signupsError } = await supabase
              .from('sign_ups')
              .select(`
                id,
                people (
                  full_name
                ),
                check_ins (
                  checked_in_at
                )
              `)
              .eq('open_mic_date_id', dateId)
              .returns<SignupData[]>(); // Specify expected return type

          if (signupsError) throw signupsError;

          const signupMembers: LineupMember[] = (signupsData || []).map(signup => ({
              id: signup.id,
              type: 'signup',
              name: signup.people?.full_name || 'Registered Performer',
              isCheckedIn: (signup.check_ins?.length ?? 0) > 0,
              checkInTime: signup.check_ins?.[0]?.checked_in_at || null,
          }));

          // Fetch Walk-ins (only needed fields)
          const { data: walkinsData, error: walkinsError } = await supabase
              .from('walk_ins')
              .select('id, name, checked_in_at') // Don't select email
              .eq('open_mic_date_id', dateId);

          if (walkinsError) throw walkinsError;

          const walkinMembers: LineupMember[] = (walkinsData || []).map(walkin => ({
              id: walkin.id,
              type: 'walkin',
              name: walkin.name || 'Walk-in Performer',
              isCheckedIn: true, // Walk-ins are checked in upon creation
              checkInTime: walkin.checked_in_at,
          }));

          // Combine and filter *only* checked-in members for the public lineup
          const checkedInMembers = [...signupMembers, ...walkinMembers].filter(member => member.isCheckedIn);

          setLineupMembers(checkedInMembers);
          setStatus('idle'); // Data loaded successfully
          setErrorMessage(null); // Clear any previous error

      } catch (error) {
          console.error('Error fetching public lineup data:', error);
          setErrorMessage('Failed to load the lineup. Please try refreshing.');
          setStatus('error');
          setLineupMembers([]); // Clear lineup on error
      }
  }

  // Calculate sorted lineup (only checked-in members)
  const sortedLineup = useMemo(() => {
    // Sort primarily by check-in time (earliest first)
    return [...lineupMembers].sort((a, b) => {
        // We already filtered for isCheckedIn, so just sort by time
        const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : Infinity;
        const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : Infinity;
        return timeA - timeB;
    });
    // Dependency array only needs lineupMembers as filtering is done in fetch
  }, [lineupMembers]);

  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50 to-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-foreground mb-8">Tonight&apos;s Lineup</h1>

        {status === 'loading' && (
            <div className="text-center text-muted py-10">Loading lineup...</div>
        )}

        {status === 'error' && (
            <div className="text-center text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
                {errorMessage || 'An error occurred loading the lineup.'}
            </div>
        )}

        {status === 'idle' && (
            <div className="bg-white rounded-lg shadow-md p-6">
                {sortedLineup.length === 0 ? (
                    <p className="text-center text-muted">The lineup is empty. Check back soon!</p>
                ) : (
                    <ol className="space-y-4">
                        {sortedLineup.map((member, index) => (
                            <li key={`${member.type}-${member.id}`} className="flex items-center p-4 rounded-lg bg-sky-50/50 border border-sky-100 gap-4">
                                <span className="font-bold text-xl text-primary w-8 text-center shrink-0">{index + 1}.</span>
                                <span className="font-medium text-lg text-foreground truncate">
                                    {member.name}
                                    {member.type === 'walkin' && <span className="text-xs font-normal text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded ml-2 align-middle">Walk-in</span>}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        )}

        <div className="text-center mt-8 text-sm text-muted">
            Lineup updates automatically. Last checked: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </main>
  );
} 