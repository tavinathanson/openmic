import SignupForm from '@/components/SignupForm';
import SlotCounter from '@/components/SlotCounter';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎤 Comedy Open Mic Signup
          </h1>
          <p className="text-lg text-gray-600">
            Sign up to perform or watch at our next open mic night!
          </p>
        </div>

        <div className="space-y-8">
          <SlotCounter />
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
