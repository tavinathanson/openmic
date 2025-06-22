'use client';

import { useState } from 'react';
// import { loadStripe } from '@stripe/stripe-js'; // We'll need this later

type TicketPurchaseButtonProps = {
  showId: string;
  stripePriceId: string;
  showName: string;
};

export default function TicketPurchaseButton({ showId, stripePriceId, showName }: TicketPurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: stripePriceId,
          quantity,
          promoCode: promoCode || undefined, // Send promoCode if it exists
          showId, // For metadata in Stripe
          showName // For metadata in Stripe
        }),
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      if (session.url) {
        // Redirect to Stripe Checkout
        window.location.href = session.url;
      } else {
        throw new Error('Failed to create Stripe Checkout session.');
      }

    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
    // No need to setIsLoading(false) here if redirecting, as the page will change.
  };

  return (
    <div className="space-y-4 p-6 border border-border rounded-lg bg-card shadow-sm max-w-md">
      <h3 className="text-xl font-semibold">Buy Tickets for {showName}</h3>
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-muted mb-1">
          Quantity:
        </label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          min="1"
          max="10" // Or fetch max from show.total_tickets - show.tickets_sold
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="promoCode" className="block text-sm font-medium text-muted mb-1">
          Promo Code (optional):
        </label>
        <input
          type="text"
          id="promoCode"
          name="promoCode"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Enter promo code"
          disabled={isLoading}
        />
      </div>
      <button
        onClick={handlePurchase}
        disabled={isLoading || quantity < 1}
        className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium text-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? 'Processing...' : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
      </button>
      {error && <p className="text-sm text-red-500 mt-2">Error: {error}</p>}
    </div>
  );
} 