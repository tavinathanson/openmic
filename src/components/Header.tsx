'use client';

import Image from 'next/image';
import { FaInstagram } from 'react-icons/fa';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50 bg-purple-50/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
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
          <div className="flex flex-col items-end gap-1 pr-4 sm:pr-6 lg:pr-8">
            <a
              href="https://tavicomedy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl md:text-2xl font-display tracking-wide text-comedy-dark hover:text-purple-800 transition-colors leading-none"
            >
              TAVI COMEDY LAB
            </a>
            <a
              href="https://www.instagram.com/tavinathanson"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <FaInstagram className="w-5 h-5 text-purple-600 mt-0.5" />
              <span className="text-purple-600 font-medium hidden sm:inline">@tavinathanson</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
} 