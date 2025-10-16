'use client';

import { useState, useEffect } from 'react';

interface Comedian {
  id: string;
  person_id: string;
  full_name: string;
  email: string;
  check_in_status: string | null;
  lottery_order: number | null;
  created_at: string;
  first_mic_ever: boolean;
  plus_one: boolean;
}


export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [comedians, setComedians] = useState<Comedian[]>([]);
  const [walkInName, setWalkInName] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [activeDateId, setActiveDateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState(false);

  useEffect(() => {
    if (isAuthed) {
      loadComedians();
    }
  }, [isAuthed]);

  const loadComedians = async () => {
    try {
      const res = await fetch('/api/admin/comedians');
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load comedians');
        return;
      }
      
      const data = await res.json();
      setComedians(data.comedians);
      setActiveDateId(data.activeDateId);
      setError(null);
    } catch {
      setError('Failed to load comedians');
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'tavi') {
      setIsAuthed(true);
      sessionStorage.setItem('adminAuth', 'true');
    } else {
      alert('Wrong password');
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') === 'true') {
      setIsAuthed(true);
    }
  }, []);

  const togglePlusOne = async (comedianId: string, currentValue: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plusone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signUpId: comedianId,
          plusOne: !currentValue,
          password: 'tavi'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update plus one');
      } else {
        await loadComedians();
      }
    } catch {
      setError('Failed to update plus one');
    }
    setLoading(false);
  };

  const checkIn = async (signUpId: string, status: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signUpId, status, password: 'tavi' })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Check-in failed');
      } else {
        await loadComedians();
      }
    } catch {
      setError('Check-in failed');
    }
    setLoading(false);
  };

  const addWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    
    setLoading(true);
    const email = walkInEmail || `${process.env.NEXT_PUBLIC_WALKIN_EMAIL_PREFIX || 'tavi.nathanson'}+walkin+${Date.now()}@gmail.com`;
    
    try {
      const res = await fetch('/api/admin/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: walkInName, 
          email, 
          activeDateId,
          password: 'tavi'
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add walk-in');
      } else {
        setWalkInName('');
        setWalkInEmail('');
        await loadComedians();
      }
    } catch {
      setError('Failed to add walk-in');
    }
    setLoading(false);
  };

  const generateNext4 = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lottery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeDateId, password: 'tavi' })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Lottery generation failed');
      } else {
        await loadComedians();
      }
    } catch {
      setError('Lottery generation failed');
    }
    setLoading(false);
  };

  if (!isAuthed) {
    return (
      <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
        <div className="max-w-md mx-auto">
          <form onSubmit={handleAuth} className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Admin Login</h1>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <button type="submit" className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
              Login
            </button>
          </form>
        </div>
      </main>
    );
  }

  const selectedComedians = comedians.filter(c => c.lottery_order).sort((a, b) => a.lottery_order! - b.lottery_order!);
  const eligibleComedians = comedians.filter(c => 
    !c.lottery_order && 
    c.check_in_status && 
    c.check_in_status !== 'not_coming'
  );

  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">Open Mic Admin</h1>
        
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive rounded-xl p-4">
            {error}
          </div>
        )}
        
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Walk-in</h2>
          <form onSubmit={addWalkIn} className="space-y-3">
            <input
              type="text"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="Name (required)"
              className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <input
              type="email"
              value={walkInEmail}
              onChange={(e) => setWalkInEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <button type="submit" className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50" disabled={loading}>
              Add Walk-in
            </button>
          </form>
        </div>

        <button 
          onClick={generateNext4}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl text-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md disabled:opacity-50"
          disabled={loading || eligibleComedians.length === 0}
        >
          🎲 Generate Next {Math.min(4, eligibleComedians.length)} Comics
        </button>

{(selectedComedians.length > 0 || eligibleComedians.length > 0) && (
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Current Order</h2>
              <button
                onClick={() => setEditingOrder(!editingOrder)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {editingOrder ? 'Done' : 'Edit Order'}
              </button>
            </div>
            <div className="space-y-2">
              {selectedComedians.map((c) => (
                <div key={c.id} className="bg-green-100 text-green-800 rounded-md p-3 font-medium flex items-center justify-between">
                  <span>
                    {c.lottery_order}. {c.full_name}
                    {c.first_mic_ever && <span className="ml-1">🍪</span>}
                    {c.plus_one && <span className="ml-1">⊕</span>}
                  </span>
                  {editingOrder && (
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          const newOrder = (c.lottery_order || 1) - 1;
                          if (newOrder >= 1) {
                            await fetch('/api/admin/reorder', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                comedianId: c.id,
                                newOrder,
                                password: 'tavi'
                              })
                            });
                            await loadComedians();
                          }
                        }}
                        disabled={c.lottery_order === 1}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ↑
                      </button>
                      <button
                        onClick={async () => {
                          const newOrder = (c.lottery_order || 1) + 1;
                          if (newOrder <= selectedComedians.length) {
                            await fetch('/api/admin/reorder', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                comedianId: c.id,
                                newOrder,
                                password: 'tavi'
                              })
                            });
                            await loadComedians();
                          }
                        }}
                        disabled={c.lottery_order === selectedComedians.length}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ↓
                      </button>
                      <button
                        onClick={async () => {
                          await fetch('/api/admin/reorder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              comedianId: c.id,
                              newOrder: null,
                              password: 'tavi'
                            })
                          });
                          await loadComedians();
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {eligibleComedians.length > 0 && (
                <>
                  {selectedComedians.length > 0 && <div className="border-t border-gray-300 my-3" />}
                  {eligibleComedians.map((c) => (
                    <div key={c.id} className="bg-gray-100 text-gray-600 rounded-md p-3 font-medium flex items-center justify-between">
                      <span>
                        {c.full_name}
                        {c.first_mic_ever && <span className="ml-1">🍪</span>}
                        {c.plus_one && <span className="ml-1">⊕</span>}
                      </span>
                      {editingOrder && (
                        <button
                          onClick={async () => {
                            const newOrder = selectedComedians.length + 1;
                            await fetch('/api/admin/reorder', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                comedianId: c.id,
                                newOrder,
                                password: 'tavi'
                              })
                            });
                            await loadComedians();
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          ↑
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">All Comedians</h2>
          <div className="space-y-3">
            {comedians.map((comedian) => (
              <div key={comedian.id} className="bg-muted/30 rounded-lg p-4">
                <div className="mb-3">
                  <div className="font-semibold text-gray-800">
                    {comedian.full_name}
                    {comedian.first_mic_ever && <span className="ml-1">🍪</span>}
                    {comedian.plus_one && <span className="ml-1">⊕</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {comedian.check_in_status ? (
                      <span className={`font-medium ${
                        comedian.check_in_status === 'early' ? 'text-green-600' :
                        comedian.check_in_status === 'on_time' ? 'text-blue-600' :
                        comedian.check_in_status === 'late' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        ✓ {comedian.check_in_status.replace('_', ' ')}
                      </span>
                    ) : 'Not checked in'}
                    {comedian.lottery_order && <span className="ml-2 font-bold text-purple-600">• #{comedian.lottery_order}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    onClick={() => togglePlusOne(comedian.id, comedian.plus_one)}
                    className={`${comedian.plus_one ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-500 hover:bg-gray-600'} text-white px-3 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50`}
                    disabled={loading}
                  >
                    {comedian.plus_one ? '+1' : 'Solo'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                  <button
                    onClick={() => checkIn(comedian.id, 'early')}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                    disabled={loading || comedian.check_in_status === 'early' || comedian.lottery_order !== null}
                  >
                    Early
                  </button>
                  <button
                    onClick={() => checkIn(comedian.id, 'on_time')}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={loading || comedian.check_in_status === 'on_time' || comedian.lottery_order !== null}
                  >
                    On Time
                  </button>
                  <button
                    onClick={() => checkIn(comedian.id, 'late')}
                    className="bg-yellow-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    disabled={loading || comedian.check_in_status === 'late' || comedian.lottery_order !== null}
                  >
                    Late
                  </button>
                  <button
                    onClick={() => checkIn(comedian.id, 'not_coming')}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                    disabled={loading || comedian.check_in_status === 'not_coming' || comedian.lottery_order !== null}
                  >
                    Not Coming
                  </button>
                  {comedian.check_in_status && !comedian.lottery_order && (
                    <button
                      onClick={() => checkIn(comedian.id, 'uncheck')}
                      className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
                      disabled={loading}
                    >
                      Uncheck
                    </button>
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