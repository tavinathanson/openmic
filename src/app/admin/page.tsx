'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LineupMember {
  id: string;
  type: 'signup' | 'walk_in';
  name: string | null;
  email: string | null;
  signupTime: string | null;
  customOrder: number | null;
  randomSeed: number | null;
  needsRecalculation: boolean;
  arrivalCategory: 'early' | 'ontime' | 'late' | null;
  isCheckedIn: boolean;
  checkInTime: string | null;
  phase: 'initial' | 'follow_up' | 'late' | null;
}

interface OpenMicDate {
  id: string;
  date: string;
  start_time: string;
}

// Lineup phases
type LineupPhase = 'waiting_for_initial' | 'initial_generated' | 'follow_up_generated';

export default function AdminPage() {
  const [lineup, setLineup] = useState<LineupMember[]>([]);
  const [activeDateId, setActiveDateId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<OpenMicDate | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInStatus, setWalkInStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [walkInMessage, setWalkInMessage] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [lineupPhase, setLineupPhase] = useState<LineupPhase>('waiting_for_initial');
  const [initialOrderGenerated, setInitialOrderGenerated] = useState(false);
  const [followUpOrderGenerated, setFollowUpOrderGenerated] = useState(false);
  const supabase = createClient();

  // Calculate arrival category based on check-in time
  const calculateArrivalCategory = (checkInTime: string): 'early' | 'ontime' | 'late' => {
    if (!activeDate) return 'late';
    
    const checkInDate = new Date(checkInTime);
    const startTime = new Date(`${activeDate.date}T${activeDate.start_time}`);
    const fifteenMinutesBefore = new Date(startTime.getTime() - 15 * 60 * 1000);
    
    if (checkInDate <= fifteenMinutesBefore) return 'early';
    if (checkInDate <= startTime) return 'ontime';
    return 'late';
  };

  // Format time for display
  const formatTime = (time: string): string => {
    if (!activeDate) return time;
    
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Effect 1: Fetch Active Date on Mount
  useEffect(() => {
    setStatus('loading');
    setMessage('');
    setLineup([]);
    setActiveDateId(null);
    setActiveDate(null);

    const fetchDate = async () => {
      const { data: dateData, error: dateError } = await supabase
        .from('open_mic_dates')
        .select('id, date, start_time')
        .eq('is_active', true)
        .order('date', { ascending: true })
        .limit(1)
        .single();

      if (dateError || !dateData) {
        console.error('Error fetching active date:', dateError);
        setMessage('Could not find an active open mic date.');
        setStatus('error');
      } else {
        setActiveDateId(dateData.id);
        setActiveDate(dateData);
      }
    };

    fetchDate();
  }, []);

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

  // Check if we should generate the initial order (5 people checked in)
  useEffect(() => {
    if (lineupPhase === 'waiting_for_initial' && 
        lineup.filter(m => m.isCheckedIn).length >= 5 &&
        !initialOrderGenerated) {
      generateInitialOrder();
    }
  }, [lineup, lineupPhase, initialOrderGenerated]);

  // Check if we should generate the follow-up order (5 more people or 7:30)
  useEffect(() => {
    if (lineupPhase === 'initial_generated' && !followUpOrderGenerated) {
      const checkedInCount = lineup.filter(m => m.isCheckedIn).length;
      const initialCount = lineup.filter(m => m.phase === 'initial').length;
      
      // Get current time and compare to 7:30 PM
      const currentTime = new Date();
      let shouldGenerateFollowUp = false;
      
      if (activeDate) {
        const startTime = new Date(`${activeDate.date}T${activeDate.start_time}`);
        // If it's past the start time, we should generate the follow-up
        shouldGenerateFollowUp = currentTime >= startTime;
      }
      
      // Generate follow-up if we have 5 more people or it's 7:30
      if ((checkedInCount >= initialCount + 5) || shouldGenerateFollowUp) {
        generateFollowUpOrder();
      }
    }
  }, [lineup, lineupPhase, followUpOrderGenerated, activeDate]);

  // Function to generate the initial order for the first 5 people
  const generateInitialOrder = async () => {
    if (!activeDateId) return;
    
    setStatus('loading');
    setMessage('Generating initial lineup order...');
    
    try {
      // Get the first 5 checked-in people
      const checkedInMembers = lineup
        .filter(m => m.isCheckedIn)
        .slice(0, 5);
      
      if (checkedInMembers.length < 5) {
        throw new Error('Need at least 5 checked-in people');
      }
      
      // 1. Assign random seeds if needed
      const membersWithSeeds = checkedInMembers.map(member => {
        if (member.randomSeed === null) {
          return { ...member, randomSeed: Math.random() };
        }
        return member;
      });
      
      // 2. Apply weighted scoring to the first 5
      const scoredMembers = membersWithSeeds.map(member => ({
        member,
        score: calculateScore(member)
      }));
      
      // Sort by score (higher is better)
      scoredMembers.sort((a, b) => b.score - a.score);
      
      // 3. Generate order numbers for these members
      const orderedMembers = scoredMembers.map((scoredMember, index) => ({
        ...scoredMember.member,
        customOrder: index + 1,
        phase: 'initial' as const
      }));
      
      // 4. Update the database
      const updatePromises = orderedMembers.map(async member => {
        const table = member.type === 'signup' ? 'sign_ups' : 'walk_ins';
        const { error } = await supabase
          .from(table)
          .update({ 
            custom_order: member.customOrder,
            random_seed: member.randomSeed,
            phase: 'initial',
            needs_recalculation: false
          })
          .eq('id', member.id);
          
        if (error) throw error;
      });
      
      await Promise.all(updatePromises);
      
      // 5. Update local state
      setLineup(prev => 
        prev.map(member => {
          const orderedMember = orderedMembers.find(om => om.id === member.id && om.type === member.type);
          if (orderedMember) {
            return orderedMember;
          }
          return member;
        })
      );
      
      setLineupPhase('initial_generated');
      setInitialOrderGenerated(true);
      setStatus('success');
      setMessage('Initial lineup order generated!');
      
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Error generating initial order:', error);
      setMessage('Failed to generate initial order');
      setStatus('error');
    }
  };

  // Function to generate the follow-up order for the next group
  const generateFollowUpOrder = async () => {
    if (!activeDateId) return;
    
    setStatus('loading');
    setMessage('Generating follow-up lineup order...');
    
    try {
      // Get all checked-in people not yet assigned to a phase
      const initialMembers = lineup.filter(m => m.phase === 'initial');
      const unassignedMembers = lineup.filter(m => m.isCheckedIn && m.phase === null);
      
      // 1. Assign random seeds if needed
      const membersWithSeeds = unassignedMembers.map(member => {
        if (member.randomSeed === null) {
          return { ...member, randomSeed: Math.random() };
        }
        return member;
      });
      
      // 2. Apply weighted scoring to the unassigned members
      const scoredMembers = membersWithSeeds.map(member => ({
        member,
        score: calculateScore(member)
      }));
      
      // Sort by score (higher is better)
      scoredMembers.sort((a, b) => b.score - a.score);
      
      // 3. Generate order numbers for these members, starting after the initial group
      const lastInitialPosition = Math.max(...initialMembers.map(m => m.customOrder || 0));
      const orderedMembers = scoredMembers.map((scoredMember, index) => ({
        ...scoredMember.member,
        customOrder: lastInitialPosition + index + 1,
        phase: 'follow_up' as const
      }));
      
      // 4. Update the database
      const updatePromises = orderedMembers.map(async member => {
        const table = member.type === 'signup' ? 'sign_ups' : 'walk_ins';
        const { error } = await supabase
          .from(table)
          .update({ 
            custom_order: member.customOrder,
            random_seed: member.randomSeed,
            phase: 'follow_up',
            needs_recalculation: false
          })
          .eq('id', member.id);
          
        if (error) throw error;
      });
      
      await Promise.all(updatePromises);
      
      // 5. Update local state
      setLineup(prev => 
        prev.map(member => {
          const orderedMember = orderedMembers.find(om => om.id === member.id && om.type === member.type);
          if (orderedMember) {
            return orderedMember;
          }
          return member;
        })
      );
      
      setLineupPhase('follow_up_generated');
      setFollowUpOrderGenerated(true);
      setStatus('success');
      setMessage('Follow-up lineup order generated!');
      
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Error generating follow-up order:', error);
      setMessage('Failed to generate follow-up order');
      setStatus('error');
    }
  };

  // Calculate score for weighted algorithm
  const calculateScore = (member: LineupMember): number => {
    // 1. Base random component (0-33 points)
    const randomComponent = (member.randomSeed || 0) * 33;

    // 2. Signup time component (0-33 points)
    // Earlier signups get more points
    let signupComponent = 0;
    if (member.signupTime) {
      const signupDate = new Date(member.signupTime);
      const now = new Date();
      const daysDiff = (now.getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000);
      // Max points for signups 7+ days in advance, scaled linearly
      signupComponent = Math.min(daysDiff / 7, 1) * 33;
    }
    
    // 3. Arrival time component (0-34 points)
    let arrivalComponent = 0;
    if (member.arrivalCategory === 'early') {
      arrivalComponent = 34; // 15 min early
    } else if (member.arrivalCategory === 'ontime') {
      arrivalComponent = 20; // On time
    } else if (member.arrivalCategory === 'late') {
      arrivalComponent = 5;  // Late
    }
    
    // Calculate total score (higher is better)
    return randomComponent + signupComponent + arrivalComponent;
  };

  // Update fetchLineupData to handle the updated database structure
  async function fetchLineupData(dateId: string) {
    if (!dateId) {
      console.warn('fetchLineupData called with null dateId');
      setLineup([]);
      if (status !== 'error') {
        setStatus('idle');
      }
      return;
    }

    try {
      // Fetch sign-ups with check-in status
      const { data: signups, error: signupsError } = await supabase
        .from('sign_ups')
        .select(`
          id,
          name,
          email,
          created_at,
          custom_order,
          random_seed,
          arrival_category,
          needs_recalculation,
          phase,
          check_ins(checked_in_at)
        `)
        .eq('open_mic_date_id', dateId);

      if (signupsError) throw signupsError;

      // Fetch walk-ins
      const { data: walkins, error: walkinsError } = await supabase
        .from('walk_ins')
        .select(`
          id,
          name,
          email,
          created_at,
          checked_in_at,
          custom_order,
          random_seed,
          arrival_category,
          needs_recalculation,
          phase
        `)
        .eq('open_mic_date_id', dateId);

      if (walkinsError) throw walkinsError;

      // Process signups into LineupMembers
      const signupMembers: LineupMember[] = signups.map(signupItem => {
        return {
          id: signupItem.id,
          type: 'signup',
          name: signupItem.name,
          email: signupItem.email,
          signupTime: signupItem.created_at,
          isCheckedIn: signupItem.check_ins && signupItem.check_ins.length > 0,
          checkInTime: signupItem.check_ins && signupItem.check_ins.length > 0 
            ? signupItem.check_ins[0].checked_in_at 
            : null,
          customOrder: signupItem.custom_order,
          randomSeed: signupItem.random_seed,
          arrivalCategory: signupItem.arrival_category,
          needsRecalculation: signupItem.needs_recalculation || false,
          phase: signupItem.phase
        };
      });

      // Process walk-ins into LineupMembers
      const walkinMembers: LineupMember[] = walkins.map(walkinItem => {
        return {
          id: walkinItem.id,
          type: 'walk_in',
          name: walkinItem.name,
          email: walkinItem.email,
          signupTime: null, // Walk-ins don't have a signup time
          isCheckedIn: true, // Walk-ins are always checked in
          checkInTime: walkinItem.checked_in_at,
          customOrder: walkinItem.custom_order,
          randomSeed: walkinItem.random_seed,
          arrivalCategory: walkinItem.arrival_category,
          needsRecalculation: walkinItem.needs_recalculation || false,
          phase: walkinItem.phase
        };
      });

      // Combine signup and walkin members
      setLineup([...signupMembers, ...walkinMembers]);

      // Update lineup phase based on data
      const initialMembers = [...signupMembers, ...walkinMembers].filter(m => m.phase === 'initial');
      const followUpMembers = [...signupMembers, ...walkinMembers].filter(m => m.phase === 'follow_up');
      
      if (initialMembers.length > 0) {
        setInitialOrderGenerated(true);
        setLineupPhase('initial_generated');
      }
      
      if (followUpMembers.length > 0) {
        setFollowUpOrderGenerated(true);
        setLineupPhase('follow_up_generated');
      }

      // Set status only if it was the initial load
      if (status === 'loading') {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Error fetching lineup data:', error);
      setMessage('Failed to fetch lineup data.');
      setStatus('error');
      setLineup([]); // Clear lineup on error
    }
  }

  // Handle late check-ins (after follow-up phase)
  async function handleCheckIn(signupId: string) {
    setCheckingInId(signupId);
    setMessage('');
    const checkInTimeOptimistic = new Date().toISOString();

    try {
      const existingMemberIndex = lineup.findIndex(m => m.id === signupId && m.type === 'signup');
      if (existingMemberIndex === -1) throw new Error('Signup not found');

      const existingMember = lineup[existingMemberIndex];
      if (existingMember.isCheckedIn) throw new Error('Already checked in');

      // Calculate arrival category based on current time
      const arrivalCategory = calculateArrivalCategory(checkInTimeOptimistic);

      // 1. Update the database
      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .insert([{ sign_up_id: signupId }])
        .select('checked_in_at')
        .single();

      if (checkInError) throw checkInError;

      // Update arrival category in the database
      const actualCheckInTime = checkInData?.checked_in_at || checkInTimeOptimistic;
      
      let phase: 'initial' | 'follow_up' | 'late' | null = null;
      let customOrder: number | null = null;
      
      // Determine phase and custom order based on current lineup phase
      if (lineupPhase === 'waiting_for_initial') {
        // If we're still waiting for the initial 5, don't assign a phase yet
        phase = null;
        customOrder = null;
      } else if (lineupPhase === 'initial_generated') {
        // If initial order is generated but not follow-up, don't assign a phase yet
        phase = null;
        customOrder = null;
      } else if (lineupPhase === 'follow_up_generated') {
        // If follow-up order is generated, this is a late arrival
        phase = 'late';
        
        // Find the last position in the lineup
        const lastPosition = Math.max(
          ...lineup
            .filter(m => m.customOrder !== null)
            .map(m => m.customOrder || 0)
        );
        
        customOrder = lastPosition + 1;
      }
      
      // Update the database with phase and custom order
      const { error: updateError } = await supabase
        .from('sign_ups')
        .update({ 
          arrival_category: arrivalCategory,
          phase: phase,
          custom_order: customOrder
        })
        .eq('id', signupId);

      if (updateError) throw updateError;

      // 2. Update local state
      setLineup(prevMembers =>
        prevMembers.map((member, index) =>
          index === existingMemberIndex
            ? { 
                ...member, 
                isCheckedIn: true, 
                checkInTime: actualCheckInTime,
                arrivalCategory: arrivalCategory,
                phase: phase,
                customOrder: customOrder
              }
            : member
        )
      );

      setMessage(`Checked in ${existingMember.name || existingMember.email}!`);
      setStatus('success');
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('Check-in error:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to check in');
      setStatus('error');
    } finally {
      setCheckingInId(null);
    }
  }

  // Add Walk-in Form with phase handling
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
      // Calculate arrival category based on current time
      const checkInTime = new Date().toISOString();
      const arrivalCategory = calculateArrivalCategory(checkInTime);
      
      let phase: 'initial' | 'follow_up' | 'late' | null = null;
      let customOrder: number | null = null;
      
      // Determine phase and custom order based on current lineup phase
      if (lineupPhase === 'waiting_for_initial') {
        // If we're still waiting for the initial 5, don't assign a phase yet
        phase = null;
        customOrder = null;
      } else if (lineupPhase === 'initial_generated') {
        // If initial order is generated but not follow-up, don't assign a phase yet
        phase = null;
        customOrder = null;
      } else if (lineupPhase === 'follow_up_generated') {
        // If follow-up order is generated, this is a late arrival
        phase = 'late';
        
        // Find the last position in the lineup
        const lastPosition = Math.max(
          ...lineup
            .filter(m => m.customOrder !== null)
            .map(m => m.customOrder || 0),
          0 // Provide a default in case the array is empty
        );
        
        customOrder = lastPosition + 1;
      }

      const { error: walkInError } = await supabase
        .from('walk_ins')
        .insert([{
          open_mic_date_id: activeDateId,
          name: walkInName.trim(),
          email: walkInEmail.trim() || null,
          arrival_category: arrivalCategory,
          phase: phase,
          custom_order: customOrder
        }]);

      if (walkInError) throw walkInError;

      // Subscription will trigger refresh
      setWalkInStatus('success');
      setWalkInMessage(`Added walk-in: ${walkInName.trim()}!`);
      setWalkInName('');
      setWalkInEmail('');
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

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event from DndContext
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = lineup.findIndex(member => `${member.type}-${member.id}` === active.id.toString());
    const newIndex = lineup.findIndex(member => `${member.type}-${member.id}` === over.id.toString());

    if (oldIndex === -1 || newIndex === -1) return;

    // Check if the target position is locked (initial phase)
    const targetMember = lineup[newIndex];
    if (targetMember.phase === 'initial') {
      setMessage('Cannot move to a locked position in the initial lineup');
      setStatus('error');
      return;
    }

    const items = Array.from(lineup);
    const [reorderedItem] = items.splice(oldIndex, 1);
    items.splice(newIndex, 0, reorderedItem);

    // Set the exact position number for the dragged item
    const newPosition = newIndex + 1;
    reorderedItem.customOrder = newPosition;

    setLineup(items);
    setStatus('success');
    setMessage('Lineup order updated!');

    // Update the database with the exact position
    const updatePromises = items.map(async (item, index) => {
      const position = index + 1;
      if (item.type === 'signup') {
        await supabase
          .from('sign_ups')
          .update({ 
            custom_order: position,
            needs_recalculation: true 
          })
          .eq('id', item.id);
      } else {
        await supabase
          .from('walk_ins')
          .update({ 
            custom_order: position,
            needs_recalculation: true 
          })
          .eq('id', item.id);
      }
    });

    Promise.all(updatePromises).catch(console.error);
  };
  
  // Handle marking a member's arrival time category
  async function handleSetArrivalCategory(memberId: string, memberType: 'signup' | 'walk_in', category: 'early' | 'ontime' | 'late') {
    try {
      setStatus('loading');
      
      // Update in database
      const table = memberType === 'signup' ? 'sign_ups' : 'walk_ins';
      const { error } = await supabase
        .from(table)
        .update({ 
          arrival_category: category,
          needs_recalculation: true // Flag that this member's position should be recalculated
        })
        .eq('id', memberId);
        
      if (error) throw error;
      
      // Update local state
      setLineup(prev => 
        prev.map(member => 
          member.id === memberId && member.type === memberType
            ? { ...member, arrivalCategory: category, needsRecalculation: true }
            : member
        )
      );
      
      setStatus('success');
      setMessage(`Updated arrival time for performer`);
      
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Error updating arrival category:', error);
      setMessage('Failed to update arrival time');
      setStatus('error');
    }
  }

  // Get visible lineup based on the current phase
  const visibleLineup = useMemo(() => {
    if (lineupPhase === 'waiting_for_initial') {
      // Show message that we're waiting for 5 people
      return [];
    } else if (lineupPhase === 'initial_generated') {
      // Show only the initial 5
      return lineup
        .filter(member => member.phase === 'initial')
        .sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0));
    } else if (lineupPhase === 'follow_up_generated') {
      // Show everyone with an order
      return lineup
        .filter(member => member.customOrder !== null)
        .sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0));
    }
    
    return [];
  }, [lineup, lineupPhase]);

  // Render the lineup or appropriate message
  const renderLineup = () => {
    if (status === 'loading') {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">{message || 'Loading...'}</p>
        </div>
      );
    }
    
    if (lineup.length === 0) {
      return (
        <div className="text-center p-8 border rounded-lg bg-muted-light/5">
          <p className="text-muted-foreground">No sign-ups yet for this date.</p>
        </div>
      );
    }
    
    if (lineupPhase === 'waiting_for_initial') {
      const checkedInCount = lineup.filter(m => m.isCheckedIn).length;
      return (
        <div className="text-center p-8 border rounded-lg bg-muted-light/5">
          <p className="text-muted-foreground">
            Waiting for at least 5 check-ins to generate the initial lineup.
            <br />
            <span className="font-semibold">{checkedInCount}/5 people checked in</span>
          </p>
        </div>
      );
    }
    
    if (visibleLineup.length === 0) {
      return (
        <div className="text-center p-8 border rounded-lg bg-muted-light/5">
          <p className="text-muted-foreground">No lineup members to display yet.</p>
        </div>
      );
    }
    
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleLineup.map(m => `${m.type}-${m.id}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {visibleLineup.map((member, index) => (
              <SortableItem key={`${member.type}-${member.id}`} member={member} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  // Generate phased message for lineup status
  const renderLineupStatus = () => {
    if (lineupPhase === 'waiting_for_initial') {
      return 'Waiting for 5 check-ins to generate the initial lineup';
    } else if (lineupPhase === 'initial_generated') {
      const checkedInCount = lineup.filter(m => m.isCheckedIn && m.phase !== 'initial').length;
      if (activeDate) {
        const currentTime = new Date();
        const startTime = new Date(`${activeDate.date}T${activeDate.start_time}`);
        if (currentTime >= startTime) {
          return 'Waiting for start time to generate follow-up lineup';
        } else {
          return `Initial lineup generated. Waiting for 5 more check-ins (${checkedInCount}/5) or start time for follow-up lineup`;
        }
      }
      return `Initial lineup generated. Waiting for 5 more check-ins (${checkedInCount}/5) or start time for follow-up lineup`;
    } else if (lineupPhase === 'follow_up_generated') {
      return 'Final lineup generated. Late arrivals will be added to the end.';
    }
    
    return '';
  };

  // Sortable item component for drag-and-drop
  function SortableItem({ member, index }: { member: LineupMember; index: number }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ 
      id: `${member.type}-${member.id}`,
      disabled: member.phase === 'initial' // Disable dragging for initial phase members
    });
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    
    // Get arrival category badge
    const getArrivalBadge = () => {
      if (!member.arrivalCategory) return null;
      
      const badgeClasses = {
        early: 'bg-green-100 text-green-800 border-green-200',
        ontime: 'bg-blue-100 text-blue-800 border-blue-200',
        late: 'bg-amber-100 text-amber-800 border-amber-200',
      };
      
      const categoryLabels = {
        early: '15 min early',
        ontime: 'On time',
        late: 'Late',
      };
      
      return (
        <span className={`text-xs font-normal px-1.5 py-0.5 rounded ml-2 border ${badgeClasses[member.arrivalCategory]}`}>
          {categoryLabels[member.arrivalCategory]}
        </span>
      );
    };
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border gap-3 sm:gap-4 ${
          member.isCheckedIn
            ? member.phase === 'initial'
              ? 'bg-green-50 border-green-200 cursor-not-allowed'
              : 'bg-green-50 border-green-100 hover:shadow-md'
            : 'bg-muted-light/5 border-border hover:shadow-md'
        } transition-shadow ${member.phase !== 'initial' ? 'cursor-grab' : 'cursor-not-allowed'}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="font-semibold text-lg text-primary w-6 text-center shrink-0">
            {index + 1}
            {member.phase === 'initial' && (
              <span className="text-xs text-muted-dark ml-1">🔒</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {member.name || (member.type === 'signup' ? 'Anonymous Signup' : 'Walk-in')}
              {member.type === 'walk_in' && <span className="text-xs font-normal text-muted-dark bg-muted-light/20 px-1.5 py-0.5 rounded ml-2">Walk-in</span>}
              {getArrivalBadge()}
              {member.phase === 'initial' && (
                <span className="text-xs font-normal text-muted-dark bg-muted-light/20 px-1.5 py-0.5 rounded ml-2">Initial Lineup</span>
              )}
            </div>
            <div className="text-sm text-muted truncate">
              {member.email || (member.type === 'signup' ? 'No email provided' : 'No email')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Arrival category selector dropdown */}
          <select 
            className="text-xs border rounded p-1 bg-white"
            value={member.arrivalCategory || ''}
            onChange={(e) => handleSetArrivalCategory(
              member.id, 
              member.type, 
              e.target.value as 'early' | 'ontime' | 'late'
            )}
          >
            <option value="">Set arrival...</option>
            <option value="early">15 min early</option>
            <option value="ontime">On time</option>
            <option value="late">Late</option>
          </select>
          
          <div className="text-sm text-right flex justify-end items-center gap-3">
            {member.isCheckedIn ? (
              <div className="text-green-700">
                Checked in @ {member.checkInTime ? formatTime(member.checkInTime) : 'N/A'}
              </div>
            ) : (
              member.type === 'signup' && (
                <button
                  onClick={() => handleCheckIn(member.id)}
                  disabled={checkingInId === member.id || checkingInId !== null}
                  className="py-1 px-3 bg-primary text-white rounded font-medium text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap"
                >
                  {checkingInId === member.id ? 'Checking in...' : 'Check In'}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-8">Admin Dashboard</h1>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              status === 'error'
                ? 'bg-red-50 text-red-700 border-red-100'
                : status === 'success'
                ? 'bg-green-50 text-green-700 border-green-100'
                : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}
          >
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

        {/* Lineup Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Current Lineup</h2>
            <div className="text-sm text-muted mt-2 sm:mt-0">
              {renderLineupStatus()}
            </div>
          </div>

          {renderLineup()}
        </div>
      </div>
    </main>
  );
} 