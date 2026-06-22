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
  is_waitlist: boolean;
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
  const [copied, setCopied] = useState(false);
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [addQuery, setAddQuery] = useState('');

  const copyNames = async () => {
    const names = comedians.map(c => c.email).filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(names);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy');
    }
  };

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
    // Optimistic update
    setComedians(prev => prev.map(c =>
      c.id === comedianId ? { ...c, plus_one: !currentValue } : c
    ));

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
        // Revert on error
        setComedians(prev => prev.map(c =>
          c.id === comedianId ? { ...c, plus_one: currentValue } : c
        ));
        const data = await res.json();
        alert('Failed to update plus one: ' + (data.error || 'Unknown error'));
      }
    } catch {
      // Revert on error
      setComedians(prev => prev.map(c =>
        c.id === comedianId ? { ...c, plus_one: currentValue } : c
      ));
      alert('Failed to update plus one: Network error');
    }
  };

  const checkIn = async (signUpId: string, status: string) => {
    // Store previous state for rollback
    const previousComedians = comedians;

    // Optimistic update
    setComedians(prev => prev.map(c =>
      c.id === signUpId ? { ...c, check_in_status: status === 'uncheck' ? null : status } : c
    ));

    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signUpId, status, password: 'tavi' })
      });

      if (!res.ok) {
        setComedians(previousComedians);
        const data = await res.json();
        alert('Check-in failed: ' + (data.error || 'Unknown error'));
      }
    } catch {
      setComedians(previousComedians);
      alert('Check-in failed: Network error');
    }
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

  // Run the draw without writing it, so the picks land in an editable draft
  // instead of going straight to the public list.
  const generateNext4 = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lottery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeDateId, password: 'tavi', dryRun: true })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lottery generation failed');
      } else {
        setDraftIds(data.selectedIds || []);
        setAddQuery('');
      }
    } catch {
      setError('Lottery generation failed');
    }
    setLoading(false);
  };

  const moveDraft = (index: number, direction: -1 | 1) => {
    setDraftIds(prev => {
      if (!prev) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeFromDraft = (id: string) => {
    setDraftIds(prev => (prev ? prev.filter(x => x !== id) : prev));
  };

  const addToDraft = (id: string) => {
    setDraftIds(prev => (prev && !prev.includes(id) ? [...prev, id] : prev));
    setAddQuery('');
  };

  const publishDraft = async () => {
    if (!draftIds || draftIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lottery/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeDateId, comedianIds: draftIds, password: 'tavi' })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to publish');
      } else {
        setDraftIds(null);
        setAddQuery('');
        await loadComedians();
      }
    } catch {
      setError('Failed to publish');
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

  const comedianById = (id: string) => comedians.find(c => c.id === id);
  const draftComedians = (draftIds || []).map(comedianById).filter(Boolean) as Comedian[];
  const addCandidates =
    draftIds === null || !addQuery.trim()
      ? []
      : comedians
          .filter(c =>
            !c.lottery_order &&
            !draftIds.includes(c.id) &&
            c.check_in_status !== 'not_coming' &&
            c.full_name.toLowerCase().includes(addQuery.trim().toLowerCase())
          )
          .slice(0, 8);

  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">Open Mic Admin</h1>

        {comedians.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={copyNames}
              className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
            >
              {copied ? '✓ Copied!' : `📋 Copy ${comedians.length} emails`}
            </button>
          </div>
        )}

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

        {draftIds === null ? (
          <button
            onClick={generateNext4}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl text-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md disabled:opacity-50"
            disabled={loading || eligibleComedians.length === 0}
          >
            🎲 Generate Next {Math.min(4, eligibleComedians.length)} Comics
          </button>
        ) : (
          <div className="bg-card rounded-xl p-6 shadow-sm border-2 border-purple-400">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-xl font-semibold text-purple-700">Draft — Next Up</h2>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Not posted yet</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Reorder, remove, or add anyone, then publish to the list.</p>

            <div className="space-y-2">
              {draftComedians.map((c, index) => (
                <div key={c.id} className="bg-purple-50 text-purple-900 rounded-md p-3 font-medium flex items-center justify-between">
                  <span>
                    {index + 1}. {c.full_name}
                    {c.first_mic_ever && <span className="ml-1">🍪</span>}
                    {c.plus_one && <span className="ml-1">⊕</span>}
                    {!c.check_in_status && <span className="ml-2 text-xs text-gray-400">(not checked in)</span>}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveDraft(index, -1)}
                      disabled={index === 0 || loading}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDraft(index, 1)}
                      disabled={index === draftComedians.length - 1 || loading}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeFromDraft(c.id)}
                      disabled={loading}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {draftComedians.length === 0 && (
                <p className="text-sm text-gray-400 py-2">No one in the draft. Add someone below or discard.</p>
              )}
            </div>

            <div className="relative mt-4">
              <input
                type="text"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Add someone… (type a name)"
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              {addCandidates.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                  {addCandidates.map(c => (
                    <button
                      key={c.id}
                      onClick={() => addToDraft(c.id)}
                      className="w-full text-left px-4 py-2 hover:bg-purple-50 flex items-center justify-between"
                    >
                      <span>{c.full_name}</span>
                      <span className="text-xs text-gray-400">
                        {c.check_in_status ? c.check_in_status.replace('_', ' ') : 'not checked in'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={publishDraft}
                disabled={loading || draftComedians.length === 0}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                ✅ Publish {draftComedians.length} to List
              </button>
              <button
                onClick={generateNext4}
                disabled={loading}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                🎲 Redraw
              </button>
              <button
                onClick={() => { setDraftIds(null); setAddQuery(''); }}
                disabled={loading}
                className="bg-white border border-red-300 text-red-600 px-4 py-3 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Discard
              </button>
            </div>
          </div>
        )}

{(selectedComedians.length > 0 || eligibleComedians.length > 0) && (
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                Current Order
                {loading && (
                  <span className="text-sm text-gray-500 animate-pulse">Updating...</span>
                )}
              </h2>
              <button
                onClick={() => setEditingOrder(!editingOrder)}
                className="text-sm text-blue-600 hover:text-blue-700"
                disabled={loading}
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
                            setLoading(true);
                            await fetch('/api/admin/reorder', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                comedianId: c.id,
                                newOrder,
                                password: 'tavi',
                                activeDateId
                              })
                            });
                            await loadComedians();
                            setLoading(false);
                          }
                        }}
                        disabled={c.lottery_order === 1 || loading}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ↑
                      </button>
                      <button
                        onClick={async () => {
                          const newOrder = (c.lottery_order || 1) + 1;
                          setLoading(true);
                          await fetch('/api/admin/reorder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              comedianId: c.id,
                              newOrder,
                              password: 'tavi',
                              activeDateId
                            })
                          });
                          await loadComedians();
                          setLoading(false);
                        }}
                        disabled={c.lottery_order === selectedComedians.length || loading}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ↓
                      </button>
                      <button
                        onClick={async () => {
                          setLoading(true);
                          await fetch('/api/admin/reorder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              comedianId: c.id,
                              newOrder: null,
                              password: 'tavi',
                              activeDateId
                            })
                          });
                          await loadComedians();
                          setLoading(false);
                        }}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-30"
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
                        <div className="flex gap-1">
                          <button
                            onClick={async () => {
                              const newOrder = selectedComedians.length + 1;
                              setLoading(true);
                              await fetch('/api/admin/reorder', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  comedianId: c.id,
                                  newOrder,
                                  password: 'tavi',
                                  activeDateId
                                })
                              });
                              await loadComedians();
                              setLoading(false);
                            }}
                            disabled={loading}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={async () => {
                              await checkIn(c.id, 'not_coming');
                            }}
                            disabled={loading}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-30"
                            title="Mark as not coming"
                          >
                            ✕
                          </button>
                        </div>
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
            {comedians
              .sort((a, b) => {
                // Sort by check-in status: unchecked first, then by status type
                if (!a.check_in_status && !b.check_in_status) return 0;
                if (!a.check_in_status) return -1;
                if (!b.check_in_status) return 1;

                // Among checked-in: early, on_time, late, not_coming
                const statusOrder = { early: 1, on_time: 2, late: 3, not_coming: 4 };
                return (statusOrder[a.check_in_status as keyof typeof statusOrder] || 5) -
                       (statusOrder[b.check_in_status as keyof typeof statusOrder] || 5);
              })
              .map((comedian) => (
              <div key={comedian.id} className="bg-muted/30 rounded-lg p-4">
                <div className="mb-3">
                  <div className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      !comedian.check_in_status ? 'bg-gray-400' :
                      comedian.check_in_status === 'early' ? 'bg-green-500' :
                      comedian.check_in_status === 'on_time' ? 'bg-blue-500' :
                      comedian.check_in_status === 'late' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <span>
                      {comedian.full_name}
                      {comedian.first_mic_ever && <span className="ml-1">🍪</span>}
                      {comedian.plus_one && <span className="ml-1">⊕</span>}
                      {comedian.is_waitlist && (
                        <span className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
                          Waitlist
                        </span>
                      )}
                    </span>
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
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">Bringing guest?</span>
                  <button
                    onClick={() => togglePlusOne(comedian.id, comedian.plus_one)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${comedian.plus_one ? 'bg-purple-600' : 'bg-gray-300'}`}
                    disabled={loading}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${comedian.plus_one ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${comedian.plus_one ? 'text-purple-600' : 'text-gray-400'}`}>
                    {comedian.plus_one ? '+1 Guest' : 'Solo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}