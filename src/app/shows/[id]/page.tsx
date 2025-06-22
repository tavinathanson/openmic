import { createServerSupabaseClient } from '@/lib/supabase';
import { Show } from '@/lib/types';
import TicketPurchaseButton from '@/components/TicketPurchaseButton';
import { notFound } from 'next/navigation';

type ShowPageProps = {
  params: {
    id: string;
  };
};

async function getShowDetails(id: string): Promise<Show | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('shows')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching show:', error);
    return null;
  }
  return data as Show;
}

export default async function ShowPage({ params }: ShowPageProps) {
  const show = await getShowDetails(params.id);

  if (!show) {
    notFound();
  }

  // You'll manually get this from your Stripe dashboard and add it to the 'shows' table in Supabase
  const stripePriceId = show.stripe_price_id; 

  if (!stripePriceId) {
    // Handle case where Stripe Price ID isn't set for the show
    // This is a critical piece of info you'll add via Supabase UI after creating a Product & Price in Stripe
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">{show.name}</h1>
        <p className="text-xl text-red-500">Tickets are not available for this show at the moment (missing Stripe Price ID).</p>
        <p>Date: {new Date(show.date).toLocaleDateString()}</p>
        <p>Time: {show.time}</p>
        <p>Price: ${show.price.toFixed(2)}</p>
        {show.description && <p className="mt-4">{show.description}</p>}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{show.name}</h1>
      <p>Date: {new Date(show.date).toLocaleDateString()}</p>
      <p>Time: {show.time}</p>
      <p>Price: ${show.price.toFixed(2)}</p>
      {show.description && <p className="mt-4">{show.description}</p>}
      
      <div className="mt-8">
        <TicketPurchaseButton showId={show.id} stripePriceId={stripePriceId} showName={show.name} />
      </div>
    </div>
  );
} 