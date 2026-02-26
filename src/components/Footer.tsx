import Link from 'next/link';
import { FaInstagram } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-purple-50/80 backdrop-blur-sm border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 space-y-6">
          {/* Main site CTA */}
          <div className="text-center">
            <a
              href="https://tavicomedy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block group"
            >
              <div className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-xl px-6 py-4 shadow-md">
                <p className="font-display text-white text-2xl tracking-wide">
                  TAVI COMEDY LAB
                </p>
                <p className="text-purple-200 text-sm mt-1">
                  Upcoming shows, tickets & more &rarr;
                </p>
              </div>
            </a>
          </div>

          {/* Secondary links */}
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <a
              href="https://www.instagram.com/tavinathanson"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition-colors flex items-center gap-1.5"
            >
              <FaInstagram className="w-4 h-4" />
              <span>@tavinathanson</span>
            </a>
            <span className="text-gray-300">|</span>
            <Link
              href="https://github.com/tavinathanson/openmic"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition-colors"
            >
              Open source
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 