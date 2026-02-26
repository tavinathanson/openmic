'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FaInstagram } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

export default function Header() {
  const pathname = usePathname();
  const isListPage = pathname === '/list';

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50 bg-purple-50/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${isListPage ? 'py-3' : 'py-4'}`}>
          <div className="flex items-center space-x-2 min-w-0">
            <Image
              src="/microphone_color.png"
              alt="Microphone Icon"
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"
            />
            <span className="text-lg sm:text-2xl font-heading font-semibold text-foreground whitespace-nowrap">
              <i>Crave Laughs</i> Open Mic{isListPage && ' List'}
            </span>
          </div>

          {isListPage ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500 text-right hidden sm:block">Scan to see list<br/>on your phone</p>
              <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200">
                <QRCodeSVG
                  value="https://openmic.tavicomedy.com/list"
                  size={50}
                  level="M"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <a
                href="https://www.instagram.com/tavinathanson"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity hidden sm:block"
              >
                <FaInstagram className="w-5 h-5 text-purple-600" />
              </a>
              <a
                href="https://tavicomedy.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-full transition-colors shadow-sm whitespace-nowrap"
              >
                Shows & More
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 