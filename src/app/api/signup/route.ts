import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendConfirmationEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const { email, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== 'comedian' && type !== 'audience') {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    // Check if comedian slots are full
    if (type === 'comedian') {
      const { count } = await supabase
        .from('comedians')
        .select('*', { count: 'exact', head: true });
      
      const maxSlots = parseInt(process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20');
      if ((count || 0) >= maxSlots) {
        return NextResponse.json(
          { error: 'Sorry, all comedian slots are full!' },
          { status: 400 }
        );
      }
    }

    // Insert the signup
    const { data, error } = await supabase
      .from(type === 'comedian' ? 'comedians' : 'audience')
      .insert([{ email }])
      .select()
      .single();

    if (error) throw error;

    // Send confirmation email
    try {
      await sendConfirmationEmail(email, type, data.id);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't throw here, we still want to return success since the signup worked
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process signup' },
      { status: 500 }
    );
  }
} 