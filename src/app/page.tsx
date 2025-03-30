import SignupForm from '@/components/SignupForm';
import SlotCounter from '@/components/SlotCounter';
import EventInfo from '@/components/EventInfo';
import PhotoGallery from '@/components/PhotoGallery';

export default function Home() {
  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-sky-50/50">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-12">
          <div className="animate-fade-in-up">
            <EventInfo />
          </div>
          <div className="animate-fade-in-up">
            <SlotCounter />
          </div>
          <div className="animate-fade-in-up">
            <SignupForm />
          </div>
          <div className="animate-fade-in-up">
            <PhotoGallery />
          </div>
        </div>
      </div>
    </main>
  );
}
