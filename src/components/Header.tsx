import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50 bg-purple-50/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 pl-4 sm:pl-6 lg:pl-8">
            <Image
              src="/microphone_color.png"
              alt="Microphone Icon"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-heading font-semibold text-foreground">
              <i>Crave Laughs</i> Open Mic
            </span>
          </div>
        </div>
      </div>
    </header>
  );
} 