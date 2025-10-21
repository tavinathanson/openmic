'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Comedian {
  id: string;
  full_name: string;
  check_in_status: string | null;
  lottery_order: number | null;
}

export default function ListPage() {
  const [comedians, setComedians] = useState<Comedian[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComedians();
    // Refresh every 10 seconds
    const interval = setInterval(loadComedians, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadComedians = async () => {
    try {
      const res = await fetch('/api/list/comedians');
      if (res.ok) {
        const data = await res.json();
        setComedians(data.comedians);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedComedians = comedians
    .filter(c => c.lottery_order)
    .sort((a, b) => a.lottery_order! - b.lottery_order!);
    
  const remainingComedians = comedians
    .filter(c => !c.lottery_order && c.check_in_status !== 'not_coming');
    
  const notCheckedIn = remainingComedians.filter(c => !c.check_in_status);
  const checkedIn = remainingComedians.filter(c => c.check_in_status);

  if (loading) {
    return (
      <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50 flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">Open Mic List</h1>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Scan to View on Your Phone</h2>
          <QRCodeSVG
            value="https://openmic.tavicomedy.com/list"
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-t-xl p-3 text-center -mb-0.5">
          <p className="text-lg font-bold text-yellow-900">✓ Find Tavi to check in!</p>
        </div>
        <div className="bg-purple-50 border-2 border-purple-300 rounded-b-xl p-4 text-center">
          <p className="text-base text-purple-900 font-semibold">
            ★ Sign up early & show up early to get bonus tickets in the drawing!
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-600">🎤 Lineup Order</h2>
            <span className="text-base text-gray-600 italic">Random drawing</span>
          </div>
          {selectedComedians.length > 0 ? (
            <div className="space-y-3">
              {selectedComedians.map((c) => (
                <div key={c.id} className="text-lg bg-green-100 text-green-800 rounded-md p-4 font-semibold">
                  {c.lottery_order}. {c.full_name}
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="space-y-3 opacity-30">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="text-lg bg-green-100 text-green-800 rounded-md p-4 font-semibold">
                    {num}.
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-green-100 border-2 border-green-600 rounded-xl px-8 py-6 shadow-lg">
                  <p className="text-2xl font-bold text-green-800 text-center">
                    🎲 Random Drawing<br />Will Happen Soon!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {checkedIn.length > 0 && (
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-600">⏳ Waiting to Go Up</h2>
              <span className="text-base text-gray-600 italic">Not in order yet</span>
            </div>
            <div className="space-y-2">
              {checkedIn.map((c) => (
                <div key={c.id} className="p-3 bg-blue-50 rounded-md text-gray-800">
                  {c.full_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {notCheckedIn.length > 0 && (
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-muted-foreground">📋 Not Yet Checked In</h2>
              <span className="text-base text-gray-600 italic">Not in order yet</span>
            </div>
            <div className="space-y-2">
              {notCheckedIn.map((c) => (
                <div key={c.id} className="p-3 bg-muted/30 rounded-md text-muted-foreground">
                  {c.full_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}