import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-purple-50/80 backdrop-blur-sm border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 text-center text-sm text-gray-600">
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
            {' '}and freely available to use
          </p>
        </div>
      </div>
    </footer>
  );
} 