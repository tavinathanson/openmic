import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-purple-50/80 backdrop-blur-sm border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 space-y-4">
          <div className="text-center text-sm text-gray-600">
            <p>
              This open mic sign-up tool is{' '}
              <Link 
                href="https://github.com/tavinathanson/openmic" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 transition-colors"
              >
                open source
              </Link>
            </p>
          </div>
          <div className="flex justify-center">
            <a
              href="https://www.instagram.com/tavinathanson"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity flex items-center gap-2 text-purple-600"
            >
              <Image
                src="/instagram-logo.svg"
                alt="Instagram"
                width={24}
                height={24}
                className="w-5 h-5"
              />
              <span className="font-medium">@tavinathanson</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
} 