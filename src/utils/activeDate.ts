// Client-side helpers to read public data from the API (no direct DB access).

export interface ActiveDate {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export async function fetchActiveDate(): Promise<ActiveDate | null> {
  const res = await fetch('/api/active-date');
  if (!res.ok) return null;
  const data = await res.json();
  return data.activeDate ?? null;
}

export async function fetchSlots(): Promise<{ activeDate: ActiveDate | null; count: number }> {
  const res = await fetch('/api/slots');
  if (!res.ok) return { activeDate: null, count: 0 };
  const data = await res.json();
  return { activeDate: data.activeDate ?? null, count: data.count ?? 0 };
}
