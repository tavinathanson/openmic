'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Performer {
  id: string;
  email: string;
  full_name: string | null;
}

type SignUpWithPerson = {
  id: string;
  person: {
    id: string;
    email: string;
    full_name: string | null;
  };
};

export default function AdminPage() {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPerformers() {
      try {
        // Get the next open mic date
        const { data: nextOpenMic, error: openMicError } = await supabase
          .from('open_mics')
          .select('id, date')
          .gt('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(1)
          .single();

        if (openMicError) throw openMicError;
        if (!nextOpenMic) {
          setPerformers([]);
          setIsLoading(false);
          return;
        }

        // Get performers signed up for the next open mic
        const { data, error } = await supabase
          .from('sign_ups')
          .select(`
            id,
            person:people (
              id,
              email,
              full_name
            )
          `)
          .eq('open_mic_id', nextOpenMic.id)
          .eq('type', 'comedian')
          .order('person(full_name)', { ascending: true, nullsFirst: true });

        if (error) throw error;
        const typedData = data as unknown as SignUpWithPerson[];
        setPerformers(typedData.map(signup => signup.person));
      } catch (error) {
        console.error('Error fetching performers:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPerformers();
  }, [supabase]);

  const copyEmailsToClipboard = () => {
    const emails = performers.map(p => p.email).join(', ');
    navigator.clipboard.writeText(emails).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Next Open Mic Performers</h1>
          <button
            onClick={copyEmailsToClipboard}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
          >
            {copySuccess ? 'Copied!' : 'Copy All Emails'}
          </button>
        </div>
        
        <div className="space-y-4">
          {performers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No performers signed up for the next open mic yet.
            </div>
          ) : (
            performers.map((performer) => (
              <div
                key={performer.id}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-100"
              >
                <h2 className="text-2xl font-semibold text-gray-900">
                  {performer.full_name || 'Anonymous'}
                </h2>
                <p className="text-gray-600 mt-1">{performer.email}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 