import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.error('Cookie error:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.error('Cookie error:', error);
          }
        },
      },
    }
  );
};

export type Person = {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
};

export type SignUp = {
  id: string;
  person_id: string;
  open_mic_date_id: string;
  number_of_people: number;
  created_at: string;
  signup_type: 'comedian' | 'audience';
  first_mic_ever?: boolean;
  will_support?: boolean;
};

export type OpenMicDate = {
  id: string;
  date: string;
  time: string;
  is_active: boolean;
  created_at: string;
  timezone: string;
}; 