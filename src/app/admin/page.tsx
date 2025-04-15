'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Performer {
  id: string;
  email: string;
  full_name: string | null;
}

export default function AdminPage() {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPerformers() {
      try {
        const { data, error } = await supabase
          .from('people')
          .select('id, email, full_name')
          .order('full_name', { ascending: true, nullsFirst: true });

        if (error) throw error;
        setPerformers(data || []);
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
          <h1 className="text-3xl font-bold text-gray-900">Performers</h1>
          <button
            onClick={copyEmailsToClipboard}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
          >
            {copySuccess ? 'Copied!' : 'Copy All Emails'}
          </button>
        </div>
        
        <div className="space-y-4">
          {performers.map((performer) => (
            <div
              key={performer.id}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-100"
            >
              <h2 className="text-2xl font-semibold text-gray-900">
                {performer.full_name || 'Anonymous'}
              </h2>
              <p className="text-gray-600 mt-1">{performer.email}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 