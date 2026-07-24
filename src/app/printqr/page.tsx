'use client';

import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

const LIST_URL = 'https://openmic.tavicomedy.com/list';

export default function PrintQRPage() {
  return (
    <main className="printqr-page bg-white">
      <style>{`
        header, footer { display: none !important; }
        @page { size: letter portrait; margin: 0.75in; }
        .printqr-page { min-height: 100vh; }
        @media print {
          .printqr-page { min-height: auto; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col items-center justify-center text-center min-h-screen gap-10 px-8 py-12 print:min-h-0 print:gap-12">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/microphone_color.png"
              alt="Microphone Icon"
              width={48}
              height={48}
              className="w-12 h-12"
            />
            <h1 className="text-5xl font-heading font-semibold text-black">
              <i>Crave Laughs</i> Open Mic
            </h1>
          </div>
          <p className="text-4xl font-bold text-black">See the List</p>
        </div>

        <QRCodeSVG
          value={LIST_URL}
          level="M"
          className="w-[26rem] h-[26rem] max-w-full print:w-[5.5in] print:h-[5.5in]"
        />

        <div className="space-y-2">
          <p className="text-4xl font-bold text-black">
            📱 Scan to see the list on your phone
          </p>
          <p className="text-2xl text-gray-600">{LIST_URL.replace('https://', '')}</p>
        </div>

        <button
          onClick={() => window.print()}
          className="no-print bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold px-8 py-3 rounded-full transition-colors shadow-sm"
        >
          🖨️ Print this page
        </button>
      </div>
    </main>
  );
}
