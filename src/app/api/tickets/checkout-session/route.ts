import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // Use the latest API version
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let customerId: string | undefined;
    const userEmail: string | undefined = user?.email;

    // If user is logged in, try to find/create a Stripe customer
    if (user && userEmail) {
      const { data: personData } = await supabase
        .from('people')
        .select('id, stripe_customer_id') // Assuming you add stripe_customer_id to your people table
        .eq('email', userEmail)
        .single();

      if (personData?.stripe_customer_id) {
        customerId = personData.stripe_customer_id;
      } else {
        // Create a new Stripe customer
        const customer = await stripe.customers.create({
          email: userEmail,
          // You can add more details here if needed
        });
        customerId = customer.id;
        // Save the new customer ID to your people table
        if (personData) {
          await supabase.from('people').update({ stripe_customer_id: customerId }).eq('id', personData.id);
        } else {
          // If person doesn't exist yet in people table but is authenticated (e.g. social login first time)
          // This logic might need adjustment based on your exact people table creation flow
          await supabase.from('people').insert({ email: userEmail, stripe_customer_id: customerId });
          // console.log('Created new person with Stripe customer ID');
        }
      }
    }

    const { priceId, quantity, promoCode, showId, showName } = await request.json();

    if (!priceId || !quantity || quantity < 1) {
      return NextResponse.json({ error: 'Missing price ID or invalid quantity' }, { status: 400 });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        show_id: showId,
        user_id: user?.id || 'guest',
        user_email: userEmail || 'guest',
        quantity: quantity.toString(),
        show_name: showName,
      },
      // Automatic tax can be enabled if configured in Stripe
      // automatic_tax: { enabled: true },
    };

    if (customerId) {
      sessionParams.customer = customerId;
      // If customer exists, prefill email. Otherwise Stripe asks for it.
      sessionParams.customer_update = userEmail ? { email: 'never' } : undefined;
    }
    
    if (promoCode) {
        sessionParams.discounts = [{ promotion_code: promoCode }];
        // To enable users to apply promo codes on Stripe's page directly:
        // sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Stripe Checkout session error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to create session' }, { status: 500 });
  }
} 