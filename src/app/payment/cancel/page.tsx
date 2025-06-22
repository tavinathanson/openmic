'use client';

import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-6">Payment Cancelled</h1>
      <p className="text-lg text-muted mb-8">
        Your payment process was cancelled. You have not been charged.
      </p>
      <p className="text-muted mb-2">
        If you encountered any issues, please try again or contact support.
      </p>
      <Link href="/" className="text-primary hover:underline">
        Return to Homepage
      </Link>
      {/* You could also link back to the specific show page if you pass its ID in the cancel_url */}
    </div>
  );
} 