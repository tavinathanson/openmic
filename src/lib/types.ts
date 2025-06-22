export type Person = {
  id: string;
  email: string;
  full_name?: string | null;
  created_at: string;
};

export type Show = {
  id: string;
  name: string;
  description?: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  timezone: string;
  venue_name?: string | null;
  venue_address?: string | null;
  price: number; // Stored as decimal, retrieved as number
  total_tickets: number;
  tickets_sold: number;
  is_active: boolean;
  stripe_price_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export type Ticket = {
  id: string;
  show_id: string;
  person_id: string;
  quantity: number;
  total_amount: number; // Stored as decimal, retrieved as number
  stripe_payment_intent_id?: string | null;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  // Optional, if you join with shows/people
  show?: Show;
  person?: Person;
};

export type Payment = {
  id: string;
  ticket_id?: string | null;
  stripe_charge_id?: string | null;
  stripe_payment_intent_id?: string | null;
  amount: number; // Stored as decimal, retrieved as number
  currency: string;
  status: string; // e.g., 'succeeded', 'failed', 'pending' from Stripe
  payment_method_details?: object | null; // JSONB from Stripe
  created_at: string;
}; 