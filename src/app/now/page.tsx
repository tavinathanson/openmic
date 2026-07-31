import SignupForm from '@/components/SignupForm';

export const metadata = {
  robots: { index: false, follow: false },
};

// Unlisted pre-open comedian signup link — nothing on the site links here.
// Signups made here are confirmed immediately but excluded from the public
// slot count until the comedian signup window actually opens — see countComedians().
export default function EarlyAccessPage() {
  return (
    <main className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Early Access Signup</h1>
          <p className="text-muted">
            You&apos;re confirmed as soon as you sign up. If general comedian signups haven&apos;t
            opened yet, your spot won&apos;t show up in the public count until they do.
          </p>
        </div>
        <SignupForm earlyAccess />
      </div>
    </main>
  );
}
