import SignupForm from '@/components/SignupForm';
import SlotCounter from '@/components/SlotCounter';
import OpenMicDate from '@/components/OpenMicDate';

export default function Home() {
  return (
    <main className="min-h-screen bg-background py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-heading font-bold text-foreground mb-4 animate-fade-in">
            <i>Crave Laughs</i> Open Mic
          </h1>
          <p className="text-xl text-muted animate-fade-in-up">
            Sign up to perform or watch at our next open mic!
          </p>
        </div>

        <div className="space-y-12">
          <div className="animate-fade-in-up">
            <OpenMicDate />
          </div>
          <div className="animate-fade-in-up">
            <SlotCounter />
          </div>
          <div className="animate-fade-in-up">
            <SignupForm />
          </div>
        </div>
      </div>
    </main>
  );
}
