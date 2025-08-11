'use client';

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
            <span className="text-2xl font-heading font-semibold text-foreground">
              <i>Crave Laughs</i> Open Mic
            </span>
          </div>
          <a
            href="https://www.instagram.com/tavinathanson"
            target="_blank"
            rel="noopener noreferrer"
            className="pr-4 sm:pr-6 lg:pr-8 hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            <Image
              src="/instagram-logo.svg"
              alt="Instagram"
              width={24}
              height={24}
              className="w-6 h-6 text-purple-600"
            />
            <span className="text-purple-600 font-medium hidden sm:inline">@tavinathanson</span>
          </a>
        </div>
      </div>
    </header>
  );
} 