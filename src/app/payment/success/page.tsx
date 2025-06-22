'use client';

import Link from 'next/link';
import { useEffect } from 'react';
// You might want to fetch session details to show more info, or just a generic message
// import { useSearchParams } from 'next/navigation'; 

export default function PaymentSuccessPage() {
  // const searchParams = useSearchParams();
  // const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // You could potentially clear cart or perform other client-side actions here
    // Or send a conversion event if you haven't already via webhook server-side
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-primary mb-6">Payment Successful!</h1>
      <p className="text-lg text-muted mb-8">
        Thank you for your purchase. Your tickets are being processed and will be emailed to you shortly.
      </p>
      <p className="text-muted mb-2">
        If you have an account, you may also be able to view your tickets there soon.
      </p>
      <Link href="/" className="text-primary hover:underline">
        Return to Homepage
      </Link>
      {/* {sessionId && <p className="text-sm text-gray-500 mt-4">Session ID: {sessionId}</p>} */}
    </div>
  );
} 