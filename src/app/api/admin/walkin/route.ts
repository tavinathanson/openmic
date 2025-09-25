import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { name, email, activeDateId, password } = await request.json();
    
    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Check if person exists
    const { data: existingPerson } = await supabase
      .from('people')
      .select('id')
      .ilike('email', email)
      .single();

    let personId: string;
    
    if (!existingPerson) {
      const { data: newPerson, error: createError } = await supabase
        .from('people')
        .insert({ email, full_name: name })
        .select('id')
        .single();
        
      if (createError) throw createError;
      personId = newPerson.id;
    } else {
      personId = existingPerson.id;
    }

    // Create the sign up
    const { error: signupError } = await supabase
      .from('sign_ups')
      .insert({
        person_id: personId,
        open_mic_date_id: activeDateId,
        signup_type: 'comedian',
        number_of_people: 1
      });

    if (signupError) throw signupError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add walk-in' },
      { status: 500 }
    );
  }
}