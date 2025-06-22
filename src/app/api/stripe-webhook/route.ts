import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendTicketConfirmationEmail } from '@/lib/resend'; // We'll create this

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// You'll need to set this in your environment variables
// You can get this from the Stripe dashboard when setting up the webhook endpoint
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig!, stripeWebhookSecret);
  } catch (err) {
    console.error('Error verifying Stripe webhook signature:', err);
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);

      // Extract metadata we stored
      const { show_id, user_id, user_email, quantity, show_name } = session.metadata || {};
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

      if (!show_id || !paymentIntentId || !quantity) {
        console.error('Missing critical metadata from checkout session:', session.metadata);
        return NextResponse.json({ error: 'Missing metadata from session' }, { status: 400 });
      }

      try {
        let personId: string;
        const primaryEmailForTicket = user_email && user_email !== 'guest' ? user_email : session.customer_details?.email;

        if (!primaryEmailForTicket) {
            console.error('Cannot determine email for ticket creation.');
            return NextResponse.json({ error: 'Cannot determine email for ticket.'}, { status: 400 });
        }

        if (user_id && user_id !== 'guest' && user_email && user_email !== 'guest') {
          const { data: existingPerson, error: personError } = await supabase
            .from('people')
            .select('id')
            .eq('email', user_email)
            .single();

          if (personError && personError.code !== 'PGRST116') throw personError;
          
          if (existingPerson) {
            personId = existingPerson.id;
          } else {
            const { data: newPerson, error: createPersonError } = await supabase
              .from('people')
              .insert({ email: user_email, auth_user_id: user_id })
              .select('id')
              .single();
            if (createPersonError) throw createPersonError;
            personId = newPerson!.id;
          }
        } else if (session.customer_details?.email) {
            const guestEmail = session.customer_details.email;
            const guestName = session.customer_details.name;

            const { data: existingGuest, error: guestError } = await supabase
                .from('people')
                .select('id')
                .eq('email', guestEmail)
                .single();

            if (guestError && guestError.code !== 'PGRST116') throw guestError;

            if (existingGuest) {
                personId = existingGuest.id;
            } else {
                const { data: newGuest, error: createGuestError } = await supabase
                    .from('people')
                    .insert({ email: guestEmail, full_name: guestName })
                    .select('id')
                    .single();
                if (createGuestError) throw createGuestError;
                personId = newGuest!.id;
            }
        } else {
            console.error('Cannot determine person for ticket creation (should have been caught by primaryEmailForTicket check).');
            return NextResponse.json({ error: 'Cannot determine person.' }, { status: 400 });
        }

        // 2. Create Ticket record
        const numQuantity = parseInt(quantity, 10);
        const totalAmount = (session.amount_total || 0) / 100; // Stripe amount is in cents

        const { data: newTicket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            show_id: show_id,
            person_id: personId,
            quantity: numQuantity,
            total_amount: totalAmount,
            stripe_payment_intent_id: paymentIntentId,
            status: 'paid',
          })
          .select('id, created_at')
          .single();

        if (ticketError) throw ticketError;

        // 3. Create Payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            ticket_id: newTicket!.id,
            stripe_payment_intent_id: paymentIntentId,
            stripe_charge_id: typeof session.payment_intent === 'object' ? session.payment_intent?.latest_charge as string : undefined, // or session.charge if available
            amount: totalAmount,
            currency: session.currency || 'usd',
            status: session.payment_status, // 'paid', 'unpaid', etc.
            payment_method_details: session.payment_method_details ? JSON.stringify(session.payment_method_details) : null,
          });

        if (paymentError) throw paymentError;

        // 4. (Optional but good) Update tickets_sold on the show
        const { error: updateShowError } = await supabase.rpc('increment_tickets_sold', { 
          show_id_to_update: show_id, 
          quantity_to_add: numQuantity 
        });
        // You'd need to create this PostgreSQL function: 
        // CREATE OR REPLACE FUNCTION increment_tickets_sold(show_id_to_update UUID, quantity_to_add INT) RETURNS void AS $$
        // BEGIN
        //   UPDATE shows SET tickets_sold = tickets_sold + quantity_to_add WHERE id = show_id_to_update;
        // END;
        // $$ LANGUAGE plpgsql;
        if (updateShowError) console.error('Error updating tickets_sold count:', updateShowError);

        // 5. Send confirmation email
        const { data: showData } = await supabase.from('shows').select('name, date, time').eq('id', show_id).single();
        
        await sendTicketConfirmationEmail({
          email: primaryEmailForTicket,
          ticketId: newTicket!.id,
          showName: showData?.name || show_name || 'Your Show',
          showDate: showData?.date ? new Date(showData.date) : new Date(),
          showTime: showData?.time || 'N/A',
          quantity: numQuantity,
          totalAmount: totalAmount,
          purchaseDate: new Date(newTicket!.created_at),
        });

        console.log(`Successfully processed payment ${paymentIntentId} and created ticket ${newTicket!.id}`);
      } catch (dbError) {
        console.error('Error processing webhook and saving to DB:', dbError);
        // Consider retry mechanisms or alerting for failures here
        return NextResponse.json({ error: `Database Error: ${(dbError as Error).message}` }, { status: 500 });
      }
      break;
    case 'payment_intent.succeeded':
      // const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // console.log('PaymentIntent succeeded:', paymentIntent.id);
      // Handle other payment-related events if necessary
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
} 